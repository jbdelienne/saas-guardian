import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Statuspage.io-compatible API (used by Stripe, GitHub, Vercel, Cloudflare, etc.)
const STATUSPAGE_API_MAP: Record<string, string> = {
  "Stripe": "https://status.stripe.com/api/v2/status.json",
  "GitHub": "https://www.githubstatus.com/api/v2/status.json",
  "Vercel": "https://www.vercel-status.com/api/v2/status.json",
  "Cloudflare": "https://www.cloudflarestatus.com/api/v2/status.json",
  "Twilio": "https://status.twilio.com/api/v2/status.json",
  "SendGrid": "https://status.sendgrid.com/api/v2/status.json",
  "Linear": "https://linearstatus.com/api/v2/status.json",
  "Notion": "https://status.notion.so/api/v2/status.json",
  "Supabase": "https://status.supabase.com/api/v2/status.json",
  "Datadog": "https://status.datadoghq.com/api/v2/status.json",
  "Resend": "https://resend-status.com/api/v2/status.json",
};

const STATUSPAGE_INCIDENTS_MAP: Record<string, string> = {
  "Stripe": "https://status.stripe.com/api/v2/incidents.json",
  "GitHub": "https://www.githubstatus.com/api/v2/incidents.json",
  "Vercel": "https://www.vercel-status.com/api/v2/incidents.json",
  "Cloudflare": "https://www.cloudflarestatus.com/api/v2/incidents.json",
  "Twilio": "https://status.twilio.com/api/v2/incidents.json",
  "SendGrid": "https://status.sendgrid.com/api/v2/incidents.json",
  "Linear": "https://linearstatus.com/api/v2/incidents.json",
  "Notion": "https://status.notion.so/api/v2/incidents.json",
  "Supabase": "https://status.supabase.com/api/v2/incidents.json",
  "Datadog": "https://status.datadoghq.com/api/v2/incidents.json",
  "Resend": "https://resend-status.com/api/v2/incidents.json",
};

function mapStatuspageStatus(indicator: string): string {
  switch (indicator) {
    case "none": return "operational";
    case "minor": return "degraded";
    case "major": return "outage";
    case "critical": return "outage";
    default: return "unknown";
  }
}

function mapSeverity(impact: string): string {
  switch (impact) {
    case "critical": return "critical";
    case "major": return "major";
    default: return "minor";
  }
}

function calculateSlaFromIncidents(incidents: Array<{ date: string; duration_minutes: number }>): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const minutesInMonth = (now.getTime() - monthStart.getTime()) / 60000;
  if (minutesInMonth <= 0) return 100;

  let downtimeMinutes = 0;
  for (const inc of incidents) {
    const incDate = new Date(inc.date);
    if (incDate >= monthStart) {
      downtimeMinutes += inc.duration_minutes;
    }
  }

  const sla = ((minutesInMonth - downtimeMinutes) / minutesInMonth) * 100;
  return Math.round(sla * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const dependencyId = url.searchParams.get("dependency_id");

    let query = supabase.from("dependency_status").select("*");
    if (dependencyId) {
      query = query.eq("id", dependencyId);
    }

    const { data: deps, error } = await query;
    if (error) throw error;
    if (!deps || deps.length === 0) {
      return new Response(
        JSON.stringify({ message: "No dependencies to check", checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: Array<{ provider: string; status: string; sla_actual: number }> = [];

    for (const dep of deps) {
      const statusUrl = STATUSPAGE_API_MAP[dep.provider];
      const incidentsUrl = STATUSPAGE_INCIDENTS_MAP[dep.provider];

      let newStatus = "unknown";
      let incidents: Array<{ date: string; title: string; duration_minutes: number; severity: string }> = [];

      // Fetch status
      if (statusUrl) {
        try {
          const res = await fetch(statusUrl, { headers: { Accept: "application/json" } });
          if (res.ok) {
            const json = await res.json();
            newStatus = mapStatuspageStatus(json.status?.indicator || "none");
          }
        } catch (err) {
          console.error(`Failed to fetch status for ${dep.provider}:`, err);
        }
      }

      // Fetch incidents
      if (incidentsUrl) {
        try {
          const res = await fetch(incidentsUrl, { headers: { Accept: "application/json" } });
          if (res.ok) {
            const json = await res.json();
            const rawIncidents = json.incidents || [];
            // Keep last 10 incidents from this month
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            for (const inc of rawIncidents.slice(0, 20)) {
              const createdAt = new Date(inc.created_at);
              if (createdAt < thirtyDaysAgo) continue;

              let durationMinutes = 0;
              if (inc.resolved_at) {
                durationMinutes = Math.round((new Date(inc.resolved_at).getTime() - createdAt.getTime()) / 60000);
              } else {
                // Ongoing
                durationMinutes = Math.round((now.getTime() - createdAt.getTime()) / 60000);
              }

              incidents.push({
                date: inc.created_at,
                title: inc.name || "Incident",
                duration_minutes: Math.max(durationMinutes, 1),
                severity: mapSeverity(inc.impact || "minor"),
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch incidents for ${dep.provider}:`, err);
        }
      }

      const slaActual = calculateSlaFromIncidents(incidents);

      // Update in DB
      await supabase
        .from("dependency_status")
        .update({
          status: newStatus,
          sla_actual: slaActual,
          incidents,
          last_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dep.id);

      results.push({ provider: dep.provider, status: newStatus, sla_actual: slaActual });
    }

    return new Response(
      JSON.stringify({ checked: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("check-saas-status error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Internal error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
