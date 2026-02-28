import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const shareToken = url.searchParams.get("share_token");
    if (!shareToken) {
      return new Response(JSON.stringify({ error: "Missing share_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch report
    const { data: report, error: rErr } = await supabase
      .from("saved_reports")
      .select("*")
      .eq("share_token", shareToken)
      .single();

    if (rErr || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch services
    let sQuery = supabase.from("services").select("id, name, icon, url, status, uptime_percentage, avg_response_time").eq("workspace_id", report.workspace_id);
    if (report.service_ids?.length > 0) sQuery = sQuery.in("id", report.service_ids);
    const { data: services } = await sQuery;

    // Fetch checks (paginated)
    const serviceIds = (services || []).map((s: any) => s.id);
    const allChecks: any[] = [];
    if (serviceIds.length > 0) {
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data } = await supabase
          .from("checks")
          .select("service_id, status, response_time, checked_at, error_message, status_code")
          .in("service_id", serviceIds)
          .gte("checked_at", report.period_start)
          .lte("checked_at", report.period_end)
          .order("checked_at", { ascending: true })
          .range(from, from + 999);
        allChecks.push(...(data || []));
        hasMore = (data?.length ?? 0) === 1000;
        from += 1000;
      }
    }

    return new Response(
      JSON.stringify({ report, services: services || [], checks: allChecks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
