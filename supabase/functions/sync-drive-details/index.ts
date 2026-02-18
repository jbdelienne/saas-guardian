import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OBJECT_LIMIT = 500000;
const MAX_RUNTIME_MS = 45000; // 45s, leave margin before 60s timeout

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

    const url = new URL(req.url);
    const integrationId = url.searchParams.get("integration_id");
    const driveId = url.searchParams.get("drive_id");
    const resumeToken = url.searchParams.get("resume_token") || null;
    const countSoFar = parseInt(url.searchParams.get("count_so_far") || "0", 10);
    const sizeSoFar = parseFloat(url.searchParams.get("size_so_far") || "0");

    if (!integrationId || !driveId) {
      return new Response(JSON.stringify({ error: "integration_id and drive_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get integration
    const { data: integration } = await supabaseAdmin.from("integrations")
      .select("*").eq("id", integrationId).single();

    if (!integration?.access_token_encrypted) {
      return new Response(JSON.stringify({ error: "Integration not found or no token" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = await getAccessToken(integration, encryptionKey, supabaseAdmin);

    // Find the drive name from cached drive list
    const { data: driveListRows } = await supabaseAdmin.from("integration_sync_data")
      .select("metadata")
      .eq("integration_id", integrationId)
      .eq("metric_type", "shared_drive_list")
      .limit(1);

    const drives: Array<{ id: string; name: string }> = (driveListRows?.[0]?.metadata as any)?.drives || [];
    const driveMeta = drives.find(d => d.id === driveId);
    const driveName = driveMeta?.name || driveId;

    console.log(`Counting drive "${driveName}" (resume: ${resumeToken ? 'yes' : 'no'}, count so far: ${countSoFar})`);

    // Update the drive entry to show "syncing" state
    if (countSoFar === 0 && !resumeToken) {
      await supabaseAdmin.from("integration_sync_data")
        .update({
          metric_value: -2, // -2 = syncing in progress
          metadata: {
            drive_id: driveId,
            name: driveName,
            object_limit: OBJECT_LIMIT,
            object_count: -2,
            storage_used_gb: 0,
            syncing: true,
          },
        })
        .eq("integration_id", integrationId)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive")
        .filter("metadata->>drive_id", "eq", driveId);
    }

    // Paginate files - minimal fields for speed
    // useDomainAdminAccess allows counting files in drives the user isn't a member of
    const q = encodeURIComponent("trashed=false");
    const baseUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&driveId=${driveId}&corpora=drive&includeItemsFromAllDrives=true&supportsAllDrives=true&useDomainAdminAccess=true&fields=nextPageToken,files(size)&pageSize=1000`;

    let objectCount = countSoFar;
    let totalSize = sizeSoFar;
    let pageToken: string | undefined = resumeToken || undefined;
    const startTime = Date.now();
    let rateLimited = false;
    let timedOut = false;

    do {
      // Check if we're running out of time
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        timedOut = true;
        break;
      }

      const fetchUrl = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
      const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

      if (!res.ok) {
        const status = res.status;

        if (status === 429) {
          // Rate limited — save progress, sleep 10s, then self-continue
          console.log(`Drive "${driveName}": rate limited (429) at ${objectCount} objects, sleeping 10s then self-continuing...`);
          rateLimited = true;
          break;
        } else if (status >= 500) {
          // Server errors — retry up to 3 times with backoff
          let retried = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Drive API error ${status}, retry ${attempt}/3 after ${attempt}s...`);
            await new Promise(r => setTimeout(r, attempt * 1000));
            if (Date.now() - startTime > MAX_RUNTIME_MS) { timedOut = true; break; }
            const retryRes = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              const files = retryData.files || [];
              objectCount += files.length;
              for (const f of files) totalSize += Number(f.size || 0);
              pageToken = retryData.nextPageToken;
              retried = true;
              break;
            }
          }
          if (timedOut) break;
          if (!retried) {
            console.error(`Drive API error ${status} persists after 3 retries, will self-continue`);
            timedOut = true;
            break;
          }
        } else if (status === 401) {
          const { data: freshIntegration } = await supabaseAdmin.from("integrations")
            .select("*").eq("id", integration.id).single();
          accessToken = await getAccessToken(freshIntegration || integration, encryptionKey, supabaseAdmin);
          continue;
        } else {
          console.error(`Drive API fatal error: ${status}`);
          break;
        }
      } else {
        const data = await res.json();
        const files = data.files || [];
        objectCount += files.length;
        for (const f of files) totalSize += Number(f.size || 0);
        pageToken = data.nextPageToken;
      }
    } while (pageToken);

    if ((timedOut || rateLimited) && pageToken) {
      const reason = rateLimited ? "rate-limited" : "timeout";
      console.log(`Drive "${driveName}": ${reason} after ${objectCount} objects, continuing...`);

      // Update partial progress in DB
      const storageGb = Math.round(totalSize / (1024 ** 3) * 100) / 100;
      await supabaseAdmin.from("integration_sync_data")
        .update({
          metric_value: -2,
          metadata: {
            drive_id: driveId,
            name: driveName,
            object_limit: OBJECT_LIMIT,
            object_count: -2,
            storage_used_gb: storageGb,
            syncing: true,
            partial_count: objectCount,
          },
        })
        .eq("integration_id", integrationId)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive")
        .filter("metadata->>drive_id", "eq", driveId);

      // If rate limited, sleep 10s before self-calling
      if (rateLimited) {
        console.log(`Sleeping 10s before retry...`);
        await new Promise(r => setTimeout(r, 10000));
      }

      // Self-call to continue (fire and forget)
      const selfUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-drive-details?integration_id=${integrationId}&drive_id=${driveId}&resume_token=${encodeURIComponent(pageToken)}&count_so_far=${objectCount}&size_so_far=${totalSize}`;
      fetch(selfUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        },
      }).catch(e => console.error("Self-call error:", e));

      return new Response(JSON.stringify({ status: "continuing", objectCount, driveName, reason }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Done! Save final result
    const storageGb = Math.round(totalSize / (1024 ** 3) * 100) / 100;
    console.log(`Drive "${driveName}": DONE - ${objectCount} objects, ${storageGb} GB`);

    // Find the existing row and get its created_time
    const { data: existingRows } = await supabaseAdmin.from("integration_sync_data")
      .select("*")
      .eq("integration_id", integrationId)
      .eq("user_id", integration.user_id)
      .eq("metric_type", "shared_drive")
      .filter("metadata->>drive_id", "eq", driveId);

    const existingMeta = (existingRows?.[0]?.metadata as any) || {};

    await supabaseAdmin.from("integration_sync_data")
      .update({
        metric_value: objectCount,
        metadata: {
          drive_id: driveId,
          name: driveName,
          created_time: existingMeta.created_time || null,
          object_limit: OBJECT_LIMIT,
          object_count: objectCount,
          storage_used_gb: storageGb,
          syncing: false,
        },
        synced_at: new Date().toISOString(),
      })
      .eq("integration_id", integrationId)
      .eq("user_id", integration.user_id)
      .eq("metric_type", "shared_drive")
      .filter("metadata->>drive_id", "eq", driveId);

    return new Response(JSON.stringify({ status: "done", objectCount, storageGb, driveName }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-drive-details error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred during drive synchronization", code: "SYNC_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
