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

      // Re-encrypt and store
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

// Full count for initial sync
async function fullCountDrive(
  driveId: string,
  driveName: string,
  headers: Record<string, string>
): Promise<{ objectCount: number; totalSize: number }> {
  const q = encodeURIComponent("trashed=false");
  const baseUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&driveId=${driveId}&corpora=drive&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,files(id,size)&pageSize=1000`;
  let objectCount = 0;
  let totalSize = 0;
  let pageToken: string | undefined;

  do {
    const url = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Drive files API error for ${driveName}: ${res.status}`);
      break;
    }
    const data = await res.json();
    const files = data.files || [];
    objectCount += files.length;
    for (const f of files) totalSize += Number(f.size || 0);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { objectCount, totalSize };
}

// Incremental update using Changes API
async function incrementalCountDrive(
  driveId: string,
  driveName: string,
  changeToken: string,
  currentCount: number,
  currentSize: number,
  headers: Record<string, string>
): Promise<{ objectCount: number; totalSize: number; newChangeToken: string }> {
  let objectCount = currentCount;
  let totalSize = currentSize;
  let pageToken: string | undefined = changeToken;
  let newChangeToken = changeToken;

  do {
    const url = `https://www.googleapis.com/drive/v3/changes?pageToken=${pageToken}&driveId=${driveId}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,newStartPageToken,changes(type,removed,file(id,size,trashed))&pageSize=1000`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Changes API error for ${driveName}: ${res.status}`);
      break;
    }
    const data = await res.json();
    const changes = data.changes || [];

    for (const change of changes) {
      if (change.type !== "file") continue;
      if (change.removed || change.file?.trashed) {
        // File removed
        objectCount = Math.max(0, objectCount - 1);
        totalSize = Math.max(0, totalSize - Number(change.file?.size || 0));
      } else {
        // File added or modified - for simplicity, count as new
        objectCount += 1;
        totalSize += Number(change.file?.size || 0);
      }
    }

    if (data.newStartPageToken) {
      newChangeToken = data.newStartPageToken;
      pageToken = undefined;
    } else {
      pageToken = data.nextPageToken;
    }
  } while (pageToken);

  return { objectCount, totalSize, newChangeToken };
}

// Get the change start token for a drive
async function getChangeToken(driveId: string, headers: Record<string, string>): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/changes/startPageToken?driveId=${driveId}&supportsAllDrives=true`,
    { headers }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.startPageToken || null;
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

    // Optional: specific integration_id and drive_id from query params (for manual trigger)
    const url = new URL(req.url);
    const specificIntegrationId = url.searchParams.get("integration_id");
    const specificDriveId = url.searchParams.get("drive_id");

    // Auth: either Bearer token (manual) or cron (no auth needed, service role)
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabaseUser.auth.getClaims(token);
      userId = claimsData?.claims?.sub as string | undefined;
    }

    // Find Google integrations to process
    let integrationsQuery = supabaseAdmin.from("integrations").select("*")
      .eq("integration_type", "google").eq("is_connected", true);
    if (specificIntegrationId) integrationsQuery = integrationsQuery.eq("id", specificIntegrationId);
    if (userId) integrationsQuery = integrationsQuery.eq("user_id", userId);

    const { data: googleIntegrations } = await integrationsQuery;
    if (!googleIntegrations?.length) {
      return new Response(JSON.stringify({ message: "No Google integrations found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ integration_id: string; drive_name: string; status: string }> = [];

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

      // Get the list of shared drives from the cached drive list
      const { data: driveListRows } = await supabaseAdmin.from("integration_sync_data")
        .select("*")
        .eq("integration_id", integration.id)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive_list");

      if (!driveListRows?.length) {
        console.log(`No drive list cached for integration ${integration.id}, skipping`);
        continue;
      }

      // Each row in shared_drive_list has metadata with all drives
      const driveListMeta = (driveListRows[0].metadata || {}) as any;
      const drives: Array<{ id: string; name: string; createdTime: string }> = driveListMeta.drives || [];

      if (!drives.length) {
        console.log(`Empty drive list for integration ${integration.id}`);
        continue;
      }

      // Get existing drive detail rows
      const { data: existingDetails } = await supabaseAdmin.from("integration_sync_data")
        .select("*")
        .eq("integration_id", integration.id)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive");

      const existingByDriveId = new Map<string, any>();
      for (const d of existingDetails || []) {
        const driveId = (d.metadata as any)?.drive_id;
        if (driveId) existingByDriveId.set(driveId, d);
      }

      // Determine which drive to process
      let driveToProcess: { id: string; name: string; createdTime: string } | undefined;
      let driveIndex = 0;

      if (specificDriveId) {
        // Manual: process specific drive
        driveToProcess = drives.find(d => d.id === specificDriveId);
        driveIndex = drives.findIndex(d => d.id === specificDriveId);
      } else {
        // Cron: collect all pending drives, then oldest stale drives
        const TEN_MINUTES = 10 * 60 * 1000;
        const pendingDrives: Array<{ drive: typeof drives[0]; index: number }> = [];
        const staleDrives: Array<{ drive: typeof drives[0]; index: number; syncedAt: number }> = [];

        for (let i = 0; i < drives.length; i++) {
          const existing = existingByDriveId.get(drives[i].id);
          if (!existing) {
            pendingDrives.push({ drive: drives[i], index: i });
            continue;
          }
          const meta = (existing.metadata as any) || {};
          if (meta.pending || (meta.object_count !== undefined && meta.object_count < 0)) {
            pendingDrives.push({ drive: drives[i], index: i });
            continue;
          }
          const syncedAt = new Date(existing.synced_at).getTime();
          if ((Date.now() - syncedAt) > TEN_MINUTES) {
            staleDrives.push({ drive: drives[i], index: i, syncedAt });
          }
        }

        // Sort stale by oldest first
        staleDrives.sort((a, b) => a.syncedAt - b.syncedAt);

        // Pick first pending, or first stale
        const candidate = pendingDrives[0] || staleDrives[0];
        if (candidate) {
          driveToProcess = candidate.drive;
          driveIndex = candidate.index;
        }
      }

      if (!driveToProcess) {
        console.log(`All drives are fresh for integration ${integration.id}`);
        results.push({ integration_id: integration.id, drive_name: "none", status: "all_fresh" });
        continue;
      }

      console.log(`Processing drive "${driveToProcess.name}" (${driveToProcess.id})`);

      const existing = existingByDriveId.get(driveToProcess.id);
      const existingMeta = existing ? (existing.metadata as any) : null;
      const existingChangeToken = existingMeta?.change_token;

      let objectCount: number = 0;
      let totalSize: number = 0;
      let changeToken: string | null = null;
      let syncCompleted = false;
      let resumePageToken: string | null = null;

      const TIMEOUT_MS = 120_000;
      const startTime = Date.now();

      try {
        if (existingChangeToken && !existingMeta?.pending) {
          // Incremental sync (drive already fully counted before)
          console.log(`Incremental sync for "${driveToProcess.name}"`);
          const result = await incrementalCountDrive(
            driveToProcess.id,
            driveToProcess.name,
            existingChangeToken,
            existingMeta.object_count || 0,
            Math.round((existingMeta.storage_used_gb || 0) * (1024 ** 3)),
            headers
          );
          objectCount = result.objectCount;
          totalSize = result.totalSize;
          changeToken = result.newChangeToken;
          syncCompleted = true;
        } else {
          // Full sync - resumable: pick up from where we left off
          const savedPageToken = existingMeta?.resume_page_token;
          const savedCount = existingMeta?.pending ? (existingMeta.object_count_partial || 0) : 0;
          const savedSize = existingMeta?.pending ? Math.round((existingMeta.storage_used_gb_partial || 0) * (1024 ** 3)) : 0;

          objectCount = savedCount;
          totalSize = savedSize;

          console.log(`Full sync for "${driveToProcess.name}" (resuming from ${objectCount} objects)`);

          const q = encodeURIComponent("trashed=false");
          const baseUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&driveId=${driveToProcess.id}&corpora=drive&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,files(id,size)&pageSize=1000`;
          let pageToken: string | undefined = savedPageToken || undefined;

          // If no saved token and count > 0, we're resuming but lost the token - restart
          if (!pageToken && objectCount > 0) {
            objectCount = 0;
            totalSize = 0;
          }

          let isFirstPage = !pageToken;
          do {
            if (Date.now() - startTime > TIMEOUT_MS) {
              console.log(`Timeout after ${objectCount} objects, saving progress`);
              resumePageToken = pageToken || null;
              break;
            }
            const url = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
            const res = await fetch(url, { headers });
            if (!res.ok) {
              console.error(`API error: ${res.status}`);
              break;
            }
            const data = await res.json();
            const files = data.files || [];
            objectCount += files.length;
            for (const f of files) totalSize += Number(f.size || 0);
            pageToken = data.nextPageToken;
          } while (pageToken);

          syncCompleted = !pageToken && !resumePageToken;
          if (syncCompleted) {
            changeToken = await getChangeToken(driveToProcess.id, headers);
          }
        }
      } catch (e) {
        console.error(`Sync error for ${driveToProcess.name}:`, e);
      }

      const storageGb = Math.round(totalSize / (1024 ** 3) * 100) / 100;
      console.log(`Drive "${driveToProcess.name}": ${objectCount} objects, ${storageGb} GB (complete: ${syncCompleted})`);

      // Delete ALL entries with this metric_key for this integration (clean duplicates)
      await supabaseAdmin.from("integration_sync_data").delete()
        .eq("integration_id", integration.id)
        .eq("user_id", integration.user_id)
        .eq("metric_type", "shared_drive")
        .eq("metric_key", `shared_drive_${driveIndex}`);

      const storageGbFinal = storageGb;
      await supabaseAdmin.from("integration_sync_data").insert({
        user_id: integration.user_id,
        integration_id: integration.id,
        metric_type: "shared_drive",
        metric_key: `shared_drive_${driveIndex}`,
        metric_value: syncCompleted ? objectCount : -1,
        metric_unit: "objects",
        metadata: {
          drive_id: driveToProcess.id,
          name: driveToProcess.name,
          created_time: driveToProcess.createdTime || null,
          object_limit: OBJECT_LIMIT,
          object_count: objectCount,
          storage_used_gb: storageGbFinal,
          change_token: changeToken || null,
          has_more: !syncCompleted,
          pending: !syncCompleted,
          resume_page_token: resumePageToken || null,
          object_count_partial: !syncCompleted ? objectCount : null,
          storage_used_gb_partial: !syncCompleted ? storageGbFinal : null,
        },
        synced_at: new Date().toISOString(),
      });

      results.push({ integration_id: integration.id, drive_name: driveToProcess.name, status: syncCompleted ? "synced" : "partial" });
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
