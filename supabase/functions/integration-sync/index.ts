import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// Token refresh helpers
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

async function refreshMicrosoftToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("MICROSOFT_CLIENT_ID")!,
      client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

// Provider sync functions
async function syncGoogle(accessToken: string, userId: string, integrationId: string, supabase: ReturnType<typeof createClient>) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const metrics: Array<{ metric_type: string; metric_key: string; metric_value: number; metric_unit: string; metadata?: Record<string, unknown> }> = [];

  // Fetch users
  try {
    const usersRes = await fetch("https://admin.googleapis.com/admin/directory/v1/users?customer=my_customer&maxResults=500", { headers });
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      const users = usersData.users || [];
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      const totalUsers = users.length;
      const suspendedUsers = users.filter((u: any) => u.suspended).length;
      const inactiveUsers = users.filter((u: any) => {
        const lastLogin = new Date(u.lastLoginTime).getTime();
        return !u.suspended && lastLogin < thirtyDaysAgo;
      }).length;

      metrics.push(
        { metric_type: "users", metric_key: "total_users", metric_value: totalUsers, metric_unit: "count" },
        { metric_type: "users", metric_key: "suspended_users", metric_value: suspendedUsers, metric_unit: "count" },
        { metric_type: "users", metric_key: "inactive_users_30d", metric_value: inactiveUsers, metric_unit: "count" },
        { metric_type: "licenses", metric_key: "active_users", metric_value: totalUsers - suspendedUsers, metric_unit: "count" }
      );
    }
  } catch (e) { console.error("Google users sync error:", e); }

  // Fetch drive usage (via reports API)
  try {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const reportRes = await fetch(
      `https://admin.googleapis.com/admin/reports/v1/usage/customers/my_customer/dates/${date}?parameters=accounts:total_quota_in_mb,accounts:used_quota_in_mb`,
      { headers }
    );
    if (reportRes.ok) {
      const reportData = await reportRes.json();
      const params = reportData.usageReports?.[0]?.parameters || [];
      for (const p of params) {
        if (p.name === "accounts:total_quota_in_mb") {
          metrics.push({ metric_type: "storage", metric_key: "drive_total_gb", metric_value: Math.round(Number(p.intValue) / 1024), metric_unit: "GB" });
        }
        if (p.name === "accounts:used_quota_in_mb") {
          metrics.push({ metric_type: "storage", metric_key: "drive_used_gb", metric_value: Math.round(Number(p.intValue) / 1024), metric_unit: "GB" });
        }
      }
    }
  } catch (e) { console.error("Google storage sync error:", e); }

  // Fetch Drive workspace-level metrics
  try {
    // Get storage quota from Drive about endpoint
    const aboutRes = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
      { headers }
    );
    if (aboutRes.ok) {
      const aboutData = await aboutRes.json();
      const quota = aboutData.storageQuota;
      if (quota) {
        if (quota.limit) {
          metrics.push({ metric_type: "drive", metric_key: "drive_quota_total_gb", metric_value: Math.round(Number(quota.limit) / (1024 ** 3) * 10) / 10, metric_unit: "GB" });
        }
        if (quota.usage) {
          metrics.push({ metric_type: "drive", metric_key: "drive_quota_used_gb", metric_value: Math.round(Number(quota.usage) / (1024 ** 3) * 10) / 10, metric_unit: "GB" });
        }
        if (quota.usageInDriveTrash) {
          metrics.push({ metric_type: "drive", metric_key: "drive_trash_gb", metric_value: Math.round(Number(quota.usageInDriveTrash) / (1024 ** 3) * 100) / 100, metric_unit: "GB" });
        }
      }
    }

    // Fetch shared drives - lightweight: just list drives, then one quick query per drive for count
    const OBJECT_LIMIT = 400000;
    const drivesRes = await fetch(
      "https://www.googleapis.com/drive/v3/drives?pageSize=100&fields=drives(id,name,createdTime),nextPageToken",
      { headers }
    );
    console.log("Shared drives API status:", drivesRes.status);
    if (drivesRes.ok) {
      const drivesData = await drivesRes.json();
      const drives = drivesData.drives || [];
      console.log("Shared drives found:", drives.length);

      metrics.push({ metric_type: "drive", metric_key: "drive_shared_drives_count", metric_value: drives.length, metric_unit: "count" });

      // Fetch per-drive stats in parallel (one small request each for size estimate)
      const drivePromises = drives.map(async (d: any, i: number) => {
        try {
          // Single request: get first page to estimate count + sum sizes
          const q = encodeURIComponent("trashed=false");
          const url = `https://www.googleapis.com/drive/v3/files?q=${q}&driveId=${d.id}&corpora=drive&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,files(size)&pageSize=1000`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            console.error(`Drive files API error for ${d.name}: ${res.status}`);
            return null;
          }
          const data = await res.json();
          const files = data.files || [];
          let objectCount = files.length;
          let totalSize = 0;
          for (const f of files) totalSize += Number(f.size || 0);
          const hasMore = !!data.nextPageToken;

          // If there's more than 1000 files, do a few more pages (up to 5 total = 5000 files max)
          let pageToken = data.nextPageToken;
          let pages = 1;
          while (pageToken && pages < 5) {
            const nextUrl = `${url}&pageToken=${pageToken}`;
            const nextRes = await fetch(nextUrl, { headers });
            if (!nextRes.ok) break;
            const nextData = await nextRes.json();
            const nextFiles = nextData.files || [];
            objectCount += nextFiles.length;
            for (const f of nextFiles) totalSize += Number(f.size || 0);
            pageToken = nextData.nextPageToken;
            pages++;
          }

          const storageGb = Math.round(totalSize / (1024 ** 3) * 100) / 100;
          return {
            metric_type: "shared_drive",
            metric_key: `shared_drive_${i}`,
            metric_value: objectCount,
            metric_unit: "objects",
            metadata: {
              drive_id: d.id,
              name: d.name,
              created_time: d.createdTime || null,
              object_limit: OBJECT_LIMIT,
              object_count: objectCount,
              storage_used_gb: storageGb,
              has_more: !!pageToken,
            },
          };
        } catch (e) {
          console.error(`Drive stats error for ${d.name}:`, e);
          return null;
        }
      });

      const driveResults = await Promise.all(drivePromises);
      for (const r of driveResults) {
        if (r) metrics.push(r);
      }
    }
  } catch (e) { console.error("Google Drive sync error:", e); }

  // Store metrics
  await storeMetrics(supabase, userId, integrationId, metrics);
}

async function syncMicrosoft(accessToken: string, userId: string, integrationId: string, supabase: ReturnType<typeof createClient>) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const metrics: Array<{ metric_type: string; metric_key: string; metric_value: number; metric_unit: string; metadata?: Record<string, unknown> }> = [];

  // Fetch users
  try {
    const usersRes = await fetch("https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,accountEnabled,signInActivity&$top=999", { headers });
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      const users = usersData.value || [];
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      const totalUsers = users.length;
      const disabledUsers = users.filter((u: any) => !u.accountEnabled).length;
      const inactiveUsers = users.filter((u: any) => {
        const lastSignIn = u.signInActivity?.lastSignInDateTime;
        return u.accountEnabled && lastSignIn && new Date(lastSignIn).getTime() < thirtyDaysAgo;
      }).length;

      metrics.push(
        { metric_type: "users", metric_key: "total_users", metric_value: totalUsers, metric_unit: "count" },
        { metric_type: "users", metric_key: "disabled_users", metric_value: disabledUsers, metric_unit: "count" },
        { metric_type: "users", metric_key: "inactive_users_30d", metric_value: inactiveUsers, metric_unit: "count" }
      );
    }
  } catch (e) { console.error("Microsoft users sync error:", e); }

  // Fetch licenses
  try {
    const licRes = await fetch("https://graph.microsoft.com/v1.0/subscribedSkus", { headers });
    if (licRes.ok) {
      const licData = await licRes.json();
      const skus = licData.value || [];
      let totalLicenses = 0;
      let usedLicenses = 0;
      for (const sku of skus) {
        totalLicenses += sku.prepaidUnits?.enabled || 0;
        usedLicenses += sku.consumedUnits || 0;
      }
      metrics.push(
        { metric_type: "licenses", metric_key: "total_licenses", metric_value: totalLicenses, metric_unit: "count" },
        { metric_type: "licenses", metric_key: "used_licenses", metric_value: usedLicenses, metric_unit: "count" }
      );
    }
  } catch (e) { console.error("Microsoft licenses sync error:", e); }

  // MFA status (requires Reports API)
  try {
    const mfaRes = await fetch("https://graph.microsoft.com/v1.0/reports/credentialUserRegistrationDetails", { headers });
    if (mfaRes.ok) {
      const mfaData = await mfaRes.json();
      const users = mfaData.value || [];
      const mfaEnabled = users.filter((u: any) => u.isMfaRegistered).length;
      const total = users.length;
      metrics.push(
        { metric_type: "security", metric_key: "mfa_enabled", metric_value: mfaEnabled, metric_unit: "count" },
        { metric_type: "security", metric_key: "mfa_total_users", metric_value: total, metric_unit: "count" },
        { metric_type: "security", metric_key: "mfa_disabled_percent", metric_value: total > 0 ? Math.round(((total - mfaEnabled) / total) * 100) : 0, metric_unit: "percent" }
      );
    }
  } catch (e) { console.error("Microsoft MFA sync error:", e); }

  // OneDrive storage
  try {
    const storageRes = await fetch("https://graph.microsoft.com/v1.0/reports/getOneDriveUsageStorage(period='D7')", {
      headers: { ...headers, Accept: "application/json" },
    });
    if (storageRes.ok) {
      const text = await storageRes.text();
      try {
        const data = JSON.parse(text);
        const latest = data.value?.[data.value.length - 1];
        if (latest) {
          metrics.push(
            { metric_type: "storage", metric_key: "onedrive_used_gb", metric_value: Math.round((latest.storageUsedInBytes || 0) / (1024 ** 3)), metric_unit: "GB" }
          );
        }
      } catch { /* CSV format, skip */ }
    }
  } catch (e) { console.error("Microsoft storage sync error:", e); }

  await storeMetrics(supabase, userId, integrationId, metrics);
}

async function syncSlack(accessToken: string, userId: string, integrationId: string, supabase: ReturnType<typeof createClient>) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const metrics: Array<{ metric_type: string; metric_key: string; metric_value: number; metric_unit: string; metadata?: Record<string, unknown> }> = [];

  // Fetch users
  try {
    const usersRes = await fetch("https://slack.com/api/users.list", { headers });
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      if (usersData.ok) {
        const members = usersData.members?.filter((m: any) => !m.is_bot && m.id !== "USLACKBOT") || [];
        const activeUsers = members.filter((m: any) => !m.deleted).length;
        const deletedUsers = members.filter((m: any) => m.deleted).length;
        metrics.push(
          { metric_type: "users", metric_key: "total_members", metric_value: members.length, metric_unit: "count" },
          { metric_type: "users", metric_key: "active_users", metric_value: activeUsers, metric_unit: "count" },
          { metric_type: "users", metric_key: "deactivated_users", metric_value: deletedUsers, metric_unit: "count" }
        );
      }
    }
  } catch (e) { console.error("Slack users sync error:", e); }

  // Fetch channels
  try {
    const channelsRes = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=1000", { headers });
    if (channelsRes.ok) {
      const channelsData = await channelsRes.json();
      if (channelsData.ok) {
        const channels = channelsData.channels || [];
        const now = Date.now() / 1000;
        const sixtyDaysAgo = now - 60 * 24 * 60 * 60;

        const totalChannels = channels.length;
        const archivedChannels = channels.filter((c: any) => c.is_archived).length;
        // Channels with no activity check would require conversations.history per channel
        // For now, count channels with no members as "abandoned"
        const lowMemberChannels = channels.filter((c: any) => !c.is_archived && (c.num_members || 0) <= 1).length;

        metrics.push(
          { metric_type: "channels", metric_key: "total_channels", metric_value: totalChannels, metric_unit: "count" },
          { metric_type: "channels", metric_key: "archived_channels", metric_value: archivedChannels, metric_unit: "count" },
          { metric_type: "channels", metric_key: "low_activity_channels", metric_value: lowMemberChannels, metric_unit: "count" }
        );
      }
    }
  } catch (e) { console.error("Slack channels sync error:", e); }

  // Team info
  try {
    const teamRes = await fetch("https://slack.com/api/team.info", { headers });
    if (teamRes.ok) {
      const teamData = await teamRes.json();
      if (teamData.ok) {
        metrics.push({
          metric_type: "team",
          metric_key: "team_name",
          metric_value: 1,
          metric_unit: "info",
          metadata: { name: teamData.team?.name, domain: teamData.team?.domain },
        });
      }
    }
  } catch (e) { console.error("Slack team sync error:", e); }

  await storeMetrics(supabase, userId, integrationId, metrics);
}

async function storeMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  integrationId: string,
  metrics: Array<{ metric_type: string; metric_key: string; metric_value: number; metric_unit: string; metadata?: Record<string, unknown> }>
) {
  if (metrics.length === 0) return;

  // Delete old data for this integration
  await supabase
    .from("integration_sync_data")
    .delete()
    .eq("integration_id", integrationId)
    .eq("user_id", userId);

  // Insert new data
  const rows = metrics.map((m) => ({
    user_id: userId,
    integration_id: integrationId,
    metric_type: m.metric_type,
    metric_key: m.metric_key,
    metric_value: m.metric_value,
    metric_unit: m.metric_unit,
    metadata: m.metadata || {},
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("integration_sync_data").insert(rows);
  if (error) console.error("Failed to store metrics:", error);

  // Update last_sync
  await supabase
    .from("integrations")
    .update({ last_sync: new Date().toISOString() })
    .eq("id", integrationId);
}

// Check thresholds and create alerts
async function checkThresholds(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  integrationId: string,
  integrationType: string
) {
  const { data: thresholds } = await supabase
    .from("alert_thresholds")
    .select("*")
    .eq("user_id", userId)
    .eq("integration_type", integrationType)
    .eq("is_enabled", true);

  if (!thresholds?.length) return;

  const { data: metrics } = await supabase
    .from("integration_sync_data")
    .select("*")
    .eq("integration_id", integrationId)
    .eq("user_id", userId);

  if (!metrics?.length) return;

  for (const threshold of thresholds) {
    const metric = metrics.find((m: any) => m.metric_key === threshold.metric_type || m.metric_type === threshold.metric_type);
    if (!metric) continue;

    let triggered = false;
    const val = Number(metric.metric_value);
    const tv = Number(threshold.threshold_value);

    switch (threshold.threshold_operator) {
      case "gt": triggered = val > tv; break;
      case "gte": triggered = val >= tv; break;
      case "lt": triggered = val < tv; break;
      case "lte": triggered = val <= tv; break;
      case "eq": triggered = val === tv; break;
    }

    if (triggered) {
      // Check if alert already exists (avoid duplicates)
      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("user_id", userId)
        .eq("alert_type", `threshold_${threshold.metric_type}`)
        .eq("integration_type", integrationType)
        .eq("is_dismissed", false)
        .maybeSingle();

      if (!existing) {
        await supabase.from("alerts").insert({
          user_id: userId,
          title: threshold.label || `Seuil dépassé: ${threshold.metric_type}`,
          description: `${metric.metric_key}: ${val} ${metric.metric_unit} (seuil: ${threshold.threshold_operator} ${tv})`,
          alert_type: `threshold_${threshold.metric_type}`,
          severity: threshold.severity,
          integration_type: integrationType,
          metadata: { metric_value: val, threshold_value: tv, metric_key: metric.metric_key },
        });
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const url = new URL(req.url);
    const integrationId = url.searchParams.get("integration_id");

    if (!integrationId) {
      return new Response(JSON.stringify({ error: "integration_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encryptionKey = Deno.env.get("INTEGRATION_ENCRYPTION_KEY");
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "INTEGRATION_ENCRYPTION_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read encrypted tokens
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: integration, error: intError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("id", integrationId)
      .eq("user_id", userId)
      .single();

    if (intError || !integration) {
      return new Response(JSON.stringify({ error: "Integration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!integration.access_token_encrypted) {
      return new Response(JSON.stringify({ error: "No access token stored" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = await decrypt(integration.access_token_encrypted, encryptionKey);

    // Check if token is expired and refresh if needed
    const provider = integration.integration_type;
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      if (integration.refresh_token_encrypted && provider !== "slack") {
        const refreshToken = await decrypt(integration.refresh_token_encrypted, encryptionKey);
        let newTokenData;
        if (provider === "google") {
          newTokenData = await refreshGoogleToken(refreshToken);
        } else {
          newTokenData = await refreshMicrosoftToken(refreshToken);
        }
        accessToken = newTokenData.access_token;

        // Re-encrypt and store new token - import encrypt inline
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

        await supabaseAdmin
          .from("integrations")
          .update({
            access_token_encrypted: newEncrypted,
            token_expires_at: new Date(Date.now() + newTokenData.expires_in * 1000).toISOString(),
          })
          .eq("id", integrationId);
      }
    }

    // Sync based on provider
    switch (provider) {
      case "google":
        await syncGoogle(accessToken, userId, integrationId, supabaseAdmin);
        break;
      case "microsoft":
        await syncMicrosoft(accessToken, userId, integrationId, supabaseAdmin);
        break;
      case "slack":
        await syncSlack(accessToken, userId, integrationId, supabaseAdmin);
        break;
    }

    // Check thresholds
    await checkThresholds(supabaseAdmin, userId, integrationId, provider);

    return new Response(JSON.stringify({ success: true, provider }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
