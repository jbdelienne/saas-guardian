import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      if (service.last_check) {
        const lastCheck = new Date(service.last_check);
        const diffMinutes = (now.getTime() - lastCheck.getTime()) / 60000;
        if (diffMinutes < service.check_interval) continue;
      }

      let status = "down";
      let responseTime = 0;
      let statusCode: number | null = null;
      let errorMessage: string | null = null;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const start = performance.now();
        const res = await fetch(service.url, {
          method: "GET",
          signal: controller.signal,
          redirect: "follow",
        });
        const end = performance.now();
        clearTimeout(timeout);

        responseTime = Math.round(end - start);
        statusCode = res.status;

        if (res.status >= 200 && res.status < 500) {
          status = "up";
        } else {
          status = "down";
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
      });

      // Calculate uptime from last 100 checks
      const { data: recentChecks } = await supabase
        .from("checks")
        .select("status")
        .eq("service_id", service.id)
        .order("checked_at", { ascending: false })
        .limit(100);

      const totalChecks = recentChecks?.length || 1;
      const upChecks = recentChecks?.filter((c) => c.status === "up").length || 0;
      const uptimePercentage = Math.round((upChecks / totalChecks) * 10000) / 100;

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

      // Update service
      await supabase
        .from("services")
        .update({
          status,
          last_check: now.toISOString(),
          uptime_percentage: uptimePercentage,
          avg_response_time: avgResponseTime,
        })
        .eq("id", service.id);

      // If service went from up to down, create an alert
      if (status === "down" && service.status === "up") {
        await supabase.from("alerts").insert({
          user_id: service.user_id,
          alert_type: "downtime",
          severity: "critical",
          title: `${service.name}: Service is down`,
          description: errorMessage
            ? `Error: ${errorMessage}`
            : `HTTP ${statusCode} - Service is not responding`,
          integration_type: "service",
          metadata: { service_id: service.id, url: service.url },
        });
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
