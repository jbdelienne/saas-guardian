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

// Simple: count all files in a shared drive, with a hard cap to avoid infinite loops
async function countDriveFiles(
  driveId: string,
  headers: Record<string, string>,
  maxPages = 500 // safety cap ~500k files
): Promise<{ objectCount: number; totalSize: number }> {
  const q = encodeURIComponent("trashed=false");
  const baseUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&driveId=${driveId}&corpora=drive&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,files(size)&pageSize=1000`;
  
  let objectCount = 0;
  let totalSize = 0;
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const url = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Drive API error: ${res.status}`);
      break;
    }
    const data = await res.json();
    const files = data.files || [];
    objectCount += files.length;
    for (const f of files) totalSize += Number(f.size || 0);
    pageToken = data.nextPageToken;
    pages++;
  } while (pageToken && pages < maxPages);

  return { objectCount, totalSize };
}

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

    // Find all connected Google integrations
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

      let accessToken: string;
      try {
        accessToken = await getAccessToken(integration, encryptionKey, supabaseAdmin);
      } catch (e) {
        console.error(`Token error for integration ${integration.id}:`, e);
        continue;
      }

      const headers = { Authorization: `Bearer ${accessToken}` };

      // Get cached drive list
      const { data: driveListRows } = await supabaseAdmin.from("integration_sync_data")
        .select("*")
        .eq("integration_id", integration.id)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive_list");

      if (!driveListRows?.length) {
        console.log(`No drive list for integration ${integration.id}, skipping`);
        continue;
      }

      const drives: Array<{ id: string; name: string; createdTime: string }> =
        (driveListRows[0].metadata as any)?.drives || [];

      if (!drives.length) continue;

      // Delete all old shared_drive entries for this integration
      await supabaseAdmin.from("integration_sync_data").delete()
        .eq("integration_id", integration.id)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive");

      // Process ALL drives
      for (let i = 0; i < drives.length; i++) {
        const drive = drives[i];
        console.log(`Counting drive "${drive.name}" (${i + 1}/${drives.length})`);

        try {
          const { objectCount, totalSize } = await countDriveFiles(drive.id, headers);
          const storageGb = Math.round(totalSize / (1024 ** 3) * 100) / 100;

          await supabaseAdmin.from("integration_sync_data").insert({
            user_id: integration.user_id,
            integration_id: integration.id,
            metric_type: "shared_drive",
            metric_key: `shared_drive_${i}`,
            metric_value: objectCount,
            metric_unit: "objects",
            metadata: {
              drive_id: drive.id,
              name: drive.name,
              created_time: drive.createdTime || null,
              object_limit: OBJECT_LIMIT,
              object_count: objectCount,
              storage_used_gb: storageGb,
            },
            synced_at: new Date().toISOString(),
          });

          console.log(`Drive "${drive.name}": ${objectCount} objects, ${storageGb} GB`);
        } catch (e) {
          console.error(`Error counting drive "${drive.name}":`, e);
        }
      }

      results.push({ integration_id: integration.id, drives_synced: drives.length });
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
