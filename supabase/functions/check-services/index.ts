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

// ---- Send alert email via Resend ----
async function sendAlertEmail(
  to: string,
  subject: string,
  htmlBody: string,
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MoniDuck <alerts@moniduck.com>",
        to: [to],
        subject,
        html: htmlBody,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", res.status, errText);
    } else {
      console.log("Alert email sent to", to);
      await res.text(); // consume body
    }
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

function buildDownEmail(serviceName: string, url: string, errorMessage: string, downSince: string, dashboardUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #1A1A2E; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: #dc2626; padding: 20px 24px;">
        <h1 style="margin: 0; font-size: 18px; color: white;">🔴 Service Down</h1>
      </div>
      <div style="padding: 24px;">
        <h2 style="margin: 0 0 16px; font-size: 20px; color: white;">${serviceName}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #999; width: 100px;">URL</td><td style="padding: 8px 0;"><a href="${url}" style="color: #927FBF;">${url}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Down since</td><td style="padding: 8px 0;">${downSince}</td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Cause</td><td style="padding: 8px 0; color: #FF8C42;">${errorMessage}</td></tr>
        </table>
        <div style="margin-top: 24px;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #4F3B78; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Dashboard</a>
        </div>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid #2a2a4e; font-size: 12px; color: #666;">MoniDuck — Monitoring for modern tech stacks</div>
    </div>
  `;
}

function buildResolvedEmail(serviceName: string, url: string, downtimeMinutes: number, dashboardUrl: string): string {
  const duration = downtimeMinutes < 60
    ? `${downtimeMinutes} minute${downtimeMinutes > 1 ? 's' : ''}`
    : `${Math.floor(downtimeMinutes / 60)}h ${downtimeMinutes % 60}min`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #1A1A2E; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: #16a34a; padding: 20px 24px;">
        <h1 style="margin: 0; font-size: 18px; color: white;">✅ Service Recovered</h1>
      </div>
      <div style="padding: 24px;">
        <h2 style="margin: 0 0 16px; font-size: 20px; color: white;">${serviceName}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #999; width: 120px;">URL</td><td style="padding: 8px 0;"><a href="${url}" style="color: #927FBF;">${url}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #999;">Incident duration</td><td style="padding: 8px 0;">${duration}</td></tr>
        </table>
        <div style="margin-top: 24px;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #4F3B78; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Report</a>
        </div>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid #2a2a4e; font-size: 12px; color: #666;">MoniDuck — Monitoring for modern tech stacks</div>
    </div>
  `;
}

// ---- Get email destination for a service ----
async function getAlertEmail(supabase: any, service: any): Promise<string | null> {
  if (!service.alert_email_enabled) return null;

  // Check maintenance window
  if (service.maintenance_until) {
    const maintEnd = new Date(service.maintenance_until);
    if (maintEnd > new Date()) return null; // in maintenance
  }

  // Use custom email if set, else fallback to user's auth email
  if (service.alert_email) return service.alert_email;

  // Get workspace member emails (send to all members)
  const { data } = await supabase.rpc('get_auth_email');
  return data || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const dashboardBaseUrl = "https://moniduck.com"; // TODO: configure

    // Check for force parameter
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

      const checkRegion = Deno.env.get("DENO_REGION") || Deno.env.get("SB_REGION") || "eu-central-1";

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const start = performance.now();
        const res = await fetch(service.url, {
          method: "GET",
          signal: controller.signal,
          redirect: "follow",
        });
        const ttfbEnd = performance.now();
        ttfb = Math.round(ttfbEnd - start);

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

        // Content validation
        if (status === "up" && service.content_keyword) {
          const keyword = service.content_keyword.trim().toLowerCase();
          if (keyword && !body.toLowerCase().includes(keyword)) {
            status = "degraded";
            errorMessage = `Content keyword "${service.content_keyword}" not found in response`;
          }
        }
      } catch (err: unknown) {
        status = "down";
        errorMessage = err instanceof Error ? err.message : "Unknown error";
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

      // ---- ALERTING LOGIC ----
      const checksThreshold = service.alert_checks_threshold || 2;

      // Check consecutive failures
      if (status === "down") {
        const { data: recentChecks } = await supabase
          .from("checks")
          .select("status")
          .eq("service_id", service.id)
          .order("checked_at", { ascending: false })
          .limit(checksThreshold);

        const consecutiveFailures = recentChecks?.every((c: any) => c.status === "down") && recentChecks?.length >= checksThreshold;

        if (consecutiveFailures) {
          // Check if there's already an open (unresolved) alert for this service — anti-spam
          const { data: existingOpen } = await supabase
            .from("alerts")
            .select("id")
            .eq("service_id", service.id)
            .eq("alert_type", "downtime")
            .is("resolved_at", null)
            .eq("is_dismissed", false)
            .limit(1);

          if (!existingOpen || existingOpen.length === 0) {
            const incidentId = `inc_${service.id}_${Date.now()}`;

            // Create the alert
            const { data: newAlert } = await supabase.from("alerts").insert({
              user_id: service.user_id,
              workspace_id: service.workspace_id,
              service_id: service.id,
              alert_type: "downtime",
              severity: "critical",
              title: `${service.name}: Service is down`,
              description: errorMessage
                ? `Error: ${errorMessage}`
                : `HTTP ${statusCode} - Service is not responding`,
              integration_type: "service",
              incident_id: incidentId,
              metadata: { service_id: service.id, url: service.url, down_since: now.toISOString() },
            }).select().single();

            // Send email (1 per incident)
            const alertEmail = await getAlertEmail(supabase, service);
            if (alertEmail && newAlert) {
              const subject = `🔴 [MoniDuck] ${service.name} is down`;
              const html = buildDownEmail(
                service.name,
                service.url,
                errorMessage || `HTTP ${statusCode}`,
                now.toISOString(),
                `${dashboardBaseUrl}/en/services`,
              );
              await sendAlertEmail(alertEmail, subject, html);
              await supabase.from("alerts").update({ email_sent: true }).eq("id", newAlert.id);
            }
          }
        }
      }

      // ---- RESOLUTION LOGIC ----
      if (status === "up") {
        // Find open alerts for this service
        const { data: openAlerts } = await supabase
          .from("alerts")
          .select("id, created_at, metadata, email_sent, incident_id")
          .eq("service_id", service.id)
          .eq("alert_type", "downtime")
          .is("resolved_at", null)
          .eq("is_dismissed", false);

        for (const openAlert of (openAlerts || [])) {
          const meta = openAlert.metadata as Record<string, any> | null;
          const downSince = meta?.down_since ? new Date(meta.down_since) : new Date(openAlert.created_at);
          const durationMs = now.getTime() - downSince.getTime();
          const durationMin = Math.round(durationMs / 60000);

          // Resolve the alert
          await supabase
            .from("alerts")
            .update({
              resolved_at: now.toISOString(),
              is_dismissed: true,
              metadata: {
                ...meta,
                resolved_at: now.toISOString(),
                downtime_minutes: durationMin,
              },
            })
            .eq("id", openAlert.id);

          // Send resolution email only if down email was sent
          if (openAlert.email_sent) {
            const alertEmail = await getAlertEmail(supabase, service);
            if (alertEmail) {
              const subject = `✅ [MoniDuck] ${service.name} is back up`;
              const html = buildResolvedEmail(
                service.name,
                service.url,
                durationMin,
                `${dashboardBaseUrl}/en/reports`,
              );
              await sendAlertEmail(alertEmail, subject, html);
            }
          }
        }
      }

      // ---- SLA BREACH CHECK ----
      // Calculate uptime from last 12 months
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

      // SLA breach: check monthly uptime (default threshold 99.9%)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: monthTotal } = await supabase
        .from("checks")
        .select("*", { count: "exact", head: true })
        .eq("service_id", service.id)
        .gte("checked_at", thirtyDaysAgo);

      const { count: monthUp } = await supabase
        .from("checks")
        .select("*", { count: "exact", head: true })
        .eq("service_id", service.id)
        .eq("status", "up")
        .gte("checked_at", thirtyDaysAgo);

      const monthlyUptime = (monthTotal || 1) > 0
        ? Math.round(((monthUp || 0) / (monthTotal || 1)) * 10000) / 100
        : 100;

      if (monthlyUptime < 99.9 && (monthTotal || 0) > 100) {
        // Check for existing SLA breach alert this month (anti-spam)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data: existingSla } = await supabase
          .from("alerts")
          .select("id")
          .eq("service_id", service.id)
          .eq("alert_type", "sla_breach")
          .gte("created_at", monthStart)
          .limit(1);

        if (!existingSla || existingSla.length === 0) {
          await supabase.from("alerts").insert({
            user_id: service.user_id,
            workspace_id: service.workspace_id,
            service_id: service.id,
            alert_type: "sla_breach",
            severity: "warning",
            title: `${service.name}: SLA breach`,
            description: `Monthly uptime dropped to ${monthlyUptime}% (target: 99.9%)`,
            integration_type: "service",
            metadata: { service_id: service.id, url: service.url, monthly_uptime: monthlyUptime },
          });
        }
      }

      // Calculate avg response time
      const { data: rtChecks } = await supabase
        .from("checks")
        .select("response_time")
        .eq("service_id", service.id)
        .eq("status", "up")
        .order("checked_at", { ascending: false })
        .limit(20);

      const avgResponseTime = rtChecks && rtChecks.length > 0
        ? Math.round(rtChecks.reduce((sum: number, c: any) => sum + c.response_time, 0) / rtChecks.length)
        : 0;

      // Check SSL
      let sslExpiryDate: string | null = null;
      let sslIssuer: string | null = null;
      try {
        const urlObj = new URL(service.url);
        if (urlObj.protocol === "https:") {
          const sslInfo = await checkSSL(urlObj.hostname, Number(urlObj.port) || 443);
          sslExpiryDate = sslInfo.expiryDate;
          sslIssuer = sslInfo.issuer;
        }
      } catch (_e) { /* SSL check failed */ }

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
