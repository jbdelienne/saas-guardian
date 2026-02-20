import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import tls from "node:tls";

function checkSSL(hostname: string, port = 443): Promise<{ daysLeft: number; expiryDate: string; issuer: string }> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(port, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      const expiryDate = new Date(cert.valid_to);
      const now = new Date();
      const daysLeft = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const issuer = cert.issuer?.O || cert.issuer?.CN || "Unknown";
      resolve({ daysLeft, expiryDate: expiryDate.toISOString(), issuer });
    });
    socket.on("error", (err: Error) => reject(err));
    socket.setTimeout(5000, () => { socket.destroy(); reject(new Error("Timeout")); });
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check for force parameter (recalculate uptime without waiting for interval)
    let force = false;
    try {
      const body = await req.json();
      force = body?.force === true;
    } catch { /* no body or not JSON */ }

    // Get all active (non-paused) services
    const { data: services, error: svcErr } = await supabase
      .from("services")
      .select("*")
      .eq("is_paused", false);

    if (svcErr) throw svcErr;
    if (!services || services.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active services to check", checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const results: Array<{ service_id: string; status: string; response_time: number }> = [];

    for (const service of services) {
      // Check if it's time to check based on interval
      if (!force && service.last_check) {
        const lastCheck = new Date(service.last_check);
        const diffMinutes = (now.getTime() - lastCheck.getTime()) / 60000;
        if (diffMinutes < service.check_interval) continue;
      }

      let status = "down";
      let responseTime = 0;
      let statusCode: number | null = null;
      let errorMessage: string | null = null;
      let ttfb: number | null = null;
      let responseSize: number | null = null;

      // Detect the region where this function is running
      const checkRegion = Deno.env.get("DENO_REGION") || Deno.env.get("SB_REGION") || "eu-central-1";

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const start = performance.now();
        const res = await fetch(service.url, {
          method: "GET",
          signal: controller.signal,
          redirect: "follow",
        });
        const ttfbEnd = performance.now();
        ttfb = Math.round(ttfbEnd - start);

        // Read body to measure full response time and size
        const body = await res.text();
        const end = performance.now();
        clearTimeout(timeout);

        responseTime = Math.round(end - start);
        responseSize = new TextEncoder().encode(body).length;
        statusCode = res.status;

        if (res.status >= 200 && res.status < 500) {
          status = "up";
        } else {
          status = "down";
        }

        // Content validation: if keyword is set, check body contains it
        if (status === "up" && service.content_keyword) {
          const keyword = service.content_keyword.trim().toLowerCase();
          if (keyword && !body.toLowerCase().includes(keyword)) {
            status = "degraded";
            errorMessage = `Content keyword "${service.content_keyword}" not found in response`;
          }
        }
      } catch (err: unknown) {
        status = "down";
        errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        if (errorMessage.includes("aborted")) {
          errorMessage = "Request timeout (>10s)";
        }
      }

      // Insert check record
      await supabase.from("checks").insert({
        service_id: service.id,
        user_id: service.user_id,
        status,
        response_time: responseTime,
        status_code: statusCode,
        error_message: errorMessage,
        ttfb,
        response_size: responseSize,
        check_region: checkRegion,
      });

      // Calculate uptime from last 12 months of checks using count queries (avoids 1000-row limit)
      const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const { count: totalChecks } = await supabase
        .from("checks")
        .select("*", { count: "exact", head: true })
        .eq("service_id", service.id)
        .gte("checked_at", twelveMonthsAgo);

      const { count: upChecks } = await supabase
        .from("checks")
        .select("*", { count: "exact", head: true })
        .eq("service_id", service.id)
        .eq("status", "up")
        .gte("checked_at", twelveMonthsAgo);

      const total = totalChecks || 1;
      const up = upChecks || 0;
      const uptimePercentage = Math.round((up / total) * 10000) / 100;

      // Calculate avg response time from last 20 checks (only up ones)
      const { data: rtChecks } = await supabase
        .from("checks")
        .select("response_time")
        .eq("service_id", service.id)
        .eq("status", "up")
        .order("checked_at", { ascending: false })
        .limit(20);

      const avgResponseTime = rtChecks && rtChecks.length > 0
        ? Math.round(rtChecks.reduce((sum, c) => sum + c.response_time, 0) / rtChecks.length)
        : 0;

      // Check SSL certificate expiry
      let sslExpiryDate: string | null = null;
      let sslIssuer: string | null = null;
      try {
        const urlObj = new URL(service.url);
        if (urlObj.protocol === "https:") {
          const sslInfo = await checkSSL(urlObj.hostname, Number(urlObj.port) || 443);
          sslExpiryDate = sslInfo.expiryDate;
          sslIssuer = sslInfo.issuer;
        }
      } catch (_e) {
        // SSL check failed, leave as null
      }

      // Update service
      const updatePayload: Record<string, any> = {
        status,
        last_check: now.toISOString(),
        uptime_percentage: uptimePercentage,
        avg_response_time: avgResponseTime,
      };
      if (sslExpiryDate) updatePayload.ssl_expiry_date = sslExpiryDate;
      if (sslIssuer) updatePayload.ssl_issuer = sslIssuer;

      await supabase
        .from("services")
        .update(updatePayload)
        .eq("id", service.id);

      // If service went from up to down, create an alert
      if (status === "down" && service.status === "up") {
        await supabase.from("alerts").insert({
          user_id: service.user_id,
          workspace_id: service.workspace_id,
          alert_type: "downtime",
          severity: "critical",
          title: `${service.name}: Service is down`,
          description: errorMessage
            ? `Error: ${errorMessage}`
            : `HTTP ${statusCode} - Service is not responding`,
          integration_type: "service",
          metadata: { service_id: service.id, url: service.url, down_since: now.toISOString() },
        });
      }

      // If service recovered (was down, now up), resolve the open downtime alert
      if (status === "up" && service.status === "down") {
        const { data: openAlerts } = await supabase
          .from("alerts")
          .select("id, created_at, metadata")
          .eq("user_id", service.user_id)
          .eq("alert_type", "downtime")
          .eq("is_dismissed", false)
          .order("created_at", { ascending: false })
          .limit(10);

        const matchingAlert = openAlerts?.find((a: any) => {
          const m = a.metadata as Record<string, any> | null;
          return m?.service_id === service.id && !m?.resolved_at;
        });

        if (matchingAlert) {
          const meta = matchingAlert.metadata as Record<string, any>;
          const downSince = meta?.down_since ? new Date(meta.down_since) : new Date(matchingAlert.created_at);
          const durationMs = now.getTime() - downSince.getTime();
          const durationMin = Math.round(durationMs / 60000);

          await supabase
            .from("alerts")
            .update({
              is_dismissed: true,
              metadata: {
                ...meta,
                resolved_at: now.toISOString(),
                downtime_minutes: durationMin,
              },
            })
            .eq("id", matchingAlert.id);
        }
      }

      results.push({ service_id: service.id, status, response_time: responseTime });
    }

    return new Response(
      JSON.stringify({ checked: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("check-services error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
