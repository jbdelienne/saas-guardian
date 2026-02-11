import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OBJECT_LIMIT = 400000;

// AES-GCM decryption
async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("moniduck-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

async function decrypt(ciphertext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function getAccessToken(
  integration: any,
  encryptionKey: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string> {
  let accessToken = await decrypt(integration.access_token_encrypted, encryptionKey);

  if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
    if (integration.refresh_token_encrypted) {
      const refreshToken = await decrypt(integration.refresh_token_encrypted, encryptionKey);
      const newTokenData = await refreshGoogleToken(refreshToken);
      accessToken = newTokenData.access_token;

      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(encryptionKey), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode("moniduck-salt"), iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(accessToken));
      const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);
      const newEncrypted = btoa(String.fromCharCode(...combined));

      await supabaseAdmin.from("integrations").update({
        access_token_encrypted: newEncrypted,
        token_expires_at: new Date(Date.now() + newTokenData.expires_in * 1000).toISOString(),
      }).eq("id", integration.id);
    }
  }

  return accessToken;
}

// Count files in a shared drive - only request file IDs for speed
async function countDriveFiles(
  driveId: string,
  accessToken: string,
): Promise<number> {
  const q = encodeURIComponent("trashed=false");
  const baseUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&driveId=${driveId}&corpora=drive&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,files(id)&pageSize=1000`;
  
  let count = 0;
  let pageToken: string | undefined;

  do {
    const url = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive API ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    count += (data.files || []).length;
    pageToken = data.nextPageToken;
  } while (pageToken);

  return count;
}

// Get storage quota used by a shared drive via about endpoint (not available per-drive)
// For now we skip storage - only count matters

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get("INTEGRATION_ENCRYPTION_KEY");
    if (!encryptionKey) throw new Error("INTEGRATION_ENCRYPTION_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: googleIntegrations } = await supabaseAdmin.from("integrations")
      .select("*")
      .eq("integration_type", "google")
      .eq("is_connected", true);

    if (!googleIntegrations?.length) {
      return new Response(JSON.stringify({ message: "No Google integrations found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ integration_id: string; drives_synced: number }> = [];

    for (const integration of googleIntegrations) {
      if (!integration.access_token_encrypted) continue;

      // Get a fresh token
      let accessToken: string;
      try {
        accessToken = await getAccessToken(integration, encryptionKey, supabaseAdmin);
      } catch (e) {
        console.error(`Token error for integration ${integration.id}:`, e);
        continue;
      }

      // Get cached drive list
      const { data: driveListRows } = await supabaseAdmin.from("integration_sync_data")
        .select("*")
        .eq("integration_id", integration.id)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive_list");

      if (!driveListRows?.length) continue;

      const drives: Array<{ id: string; name: string; createdTime: string }> =
        (driveListRows[0].metadata as any)?.drives || [];
      if (!drives.length) continue;

      // Count ALL drives in parallel (batches of 5 to avoid rate limits)
      const BATCH_SIZE = 5;
      const driveResults: Array<{ index: number; drive: typeof drives[0]; count: number }> = [];

      for (let batch = 0; batch < drives.length; batch += BATCH_SIZE) {
        // Refresh token for each batch to avoid expiry
        const { data: freshIntegration } = await supabaseAdmin.from("integrations")
          .select("*").eq("id", integration.id).single();
        accessToken = await getAccessToken(freshIntegration || integration, encryptionKey, supabaseAdmin);

        const batchDrives = drives.slice(batch, batch + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batchDrives.map(async (drive, j) => {
            const idx = batch + j;
            console.log(`Counting drive "${drive.name}" (${idx + 1}/${drives.length})`);
            const count = await countDriveFiles(drive.id, accessToken);
            console.log(`Drive "${drive.name}": ${count} objects`);
            return { index: idx, drive, count };
          })
        );

        for (const r of batchResults) {
          if (r.status === 'fulfilled') {
            driveResults.push(r.value);
          } else {
            console.error(`Drive count failed:`, r.reason);
          }
        }
      }

      // Delete old entries and insert new ones
      await supabaseAdmin.from("integration_sync_data").delete()
        .eq("integration_id", integration.id)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive");

      for (const { index, drive, count } of driveResults) {
        await supabaseAdmin.from("integration_sync_data").insert({
          user_id: integration.user_id,
          integration_id: integration.id,
          metric_type: "shared_drive",
          metric_key: `shared_drive_${index}`,
          metric_value: count,
          metric_unit: "objects",
          metadata: {
            drive_id: drive.id,
            name: drive.name,
            created_time: drive.createdTime || null,
            object_limit: OBJECT_LIMIT,
            object_count: count,
          },
          synced_at: new Date().toISOString(),
        });
      }

      results.push({ integration_id: integration.id, drives_synced: driveResults.length });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-drive-details error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
