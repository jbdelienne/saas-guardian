import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CostRequest {
  credential_id: string;
  granularity: "daily" | "monthly";
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

// ---- AWS Cost Explorer call ----
async function fetchCostAndUsage(
  creds: { accessKeyId: string; secretAccessKey: string },
  granularity: "DAILY" | "MONTHLY",
  startDate: string,
  endDate: string,
  groupByService: boolean
) {
  const ceClient = new AwsClient({ ...creds, region: "us-east-1" });

  const body: Record<string, unknown> = {
    TimePeriod: { Start: startDate, End: endDate },
    Granularity: granularity,
    Metrics: ["UnblendedCost"],
  };
  if (groupByService) {
    body.GroupBy = [{ Type: "DIMENSION", Key: "SERVICE" }];
  }

  const res = await ceClient.fetch("https://ce.us-east-1.amazonaws.com/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSInsightsIndexService.GetCostAndUsage",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Cost Explorer error:", res.status, errText);
    throw new Error(`Cost Explorer API error: ${res.status}`);
  }

  return await res.json();
}

// ---- Main handler ----
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Parse request
    const url = new URL(req.url);
    const credentialId = url.searchParams.get("credential_id");
    const granularity = (url.searchParams.get("granularity") || "daily") as "daily" | "monthly";
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    if (!credentialId) {
      return new Response(JSON.stringify({ error: "credential_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get credentials
    const { data: cred, error: credError } = await supabaseAdmin
      .from("aws_credentials")
      .select("*")
      .eq("id", credentialId)
      .eq("user_id", userId)
      .single();

    if (credError || !cred) {
      return new Response(JSON.stringify({ error: "Credentials not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = cred.id; // Use credential ID as account identifier
    const workspaceId = cred.workspace_id;

    // Compute default date ranges if not provided
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    let effectiveStart = startDate;
    let effectiveEnd = endDate || todayStr;
    let awsGranularity: "DAILY" | "MONTHLY" = granularity === "monthly" ? "MONTHLY" : "DAILY";

    if (!effectiveStart) {
      if (granularity === "monthly") {
        // Last 12 months
        const d = new Date(now);
        d.setMonth(d.getMonth() - 12);
        d.setDate(1);
        effectiveStart = d.toISOString().split("T")[0];
      } else {
        // Last 90 days (covers weekly aggregation of 84 days + buffer)
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        effectiveStart = d.toISOString().split("T")[0];
      }
    }

    // ---- Cache check ----
    const { data: cached } = await supabaseAdmin
      .from("cost_snapshots")
      .select("*")
      .eq("account_id", accountId)
      .eq("granularity", granularity)
      .eq("start_date", effectiveStart)
      .eq("end_date", effectiveEnd)
      .order("cached_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
      if (cacheAge < CACHE_TTL_MS) {
        console.log("Cache hit for cost data");
        // Also get cost_by_service
        const { data: serviceData } = await supabaseAdmin
          .from("cost_by_service")
          .select("*")
          .eq("account_id", accountId)
          .eq("granularity", granularity)
          .gte("date", effectiveStart)
          .lte("date", effectiveEnd)
          .order("date", { ascending: true });

        return new Response(JSON.stringify({
          source: "cache",
          cached_at: cached.cached_at,
          raw_data: cached.raw_data,
          cost_by_service: serviceData || [],
          start_date: effectiveStart,
          end_date: effectiveEnd,
          granularity,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ---- Fetch from AWS ----
    console.log(`Fetching cost data: ${awsGranularity} from ${effectiveStart} to ${effectiveEnd}`);

    // Two calls: grouped by service + total
    const [byServiceData, totalData] = await Promise.all([
      fetchCostAndUsage(
        { accessKeyId: cred.access_key_id, secretAccessKey: cred.secret_access_key },
        awsGranularity, effectiveStart, effectiveEnd, true
      ),
      fetchCostAndUsage(
        { accessKeyId: cred.access_key_id, secretAccessKey: cred.secret_access_key },
        awsGranularity, effectiveStart, effectiveEnd, false
      ),
    ]);

    // ---- Parse and store cost_by_service ----
    const serviceRows: Array<{
      account_id: string;
      user_id: string;
      workspace_id: string;
      date: string;
      granularity: string;
      service_name: string;
      amount: number;
      currency: string;
    }> = [];

    for (const period of byServiceData.ResultsByTime || []) {
      const periodStart = period.TimePeriod?.Start;
      if (!periodStart) continue;
      for (const group of period.Groups || []) {
        const serviceName = group.Keys?.[0] || "Unknown";
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || "0");
        const currency = group.Metrics?.UnblendedCost?.Unit || "USD";
        if (amount > 0.001) {
          serviceRows.push({
            account_id: accountId,
            user_id: userId,
            workspace_id: workspaceId,
            date: periodStart,
            granularity,
            service_name: serviceName,
            amount: Math.round(amount * 10000) / 10000,
            currency,
          });
        }
      }
    }

    // Parse total costs per period
    const totalByPeriod: Array<{ date: string; amount: number; currency: string }> = [];
    for (const period of totalData.ResultsByTime || []) {
      const periodStart = period.TimePeriod?.Start;
      const amount = parseFloat(period.Total?.UnblendedCost?.Amount || "0");
      const currency = period.Total?.UnblendedCost?.Unit || "USD";
      totalByPeriod.push({
        date: periodStart,
        amount: Math.round(amount * 100) / 100,
        currency,
      });
    }

    // ---- Store in DB ----
    // Delete old data for this range
    await supabaseAdmin
      .from("cost_by_service")
      .delete()
      .eq("account_id", accountId)
      .eq("granularity", granularity);

    if (serviceRows.length > 0) {
      // Insert in batches of 500
      for (let i = 0; i < serviceRows.length; i += 500) {
        const batch = serviceRows.slice(i, i + 500);
        const { error: insertErr } = await supabaseAdmin
          .from("cost_by_service")
          .insert(batch);
        if (insertErr) console.error("Failed to insert cost_by_service batch:", insertErr);
      }
    }

    // Delete old snapshots for this range
    await supabaseAdmin
      .from("cost_snapshots")
      .delete()
      .eq("account_id", accountId)
      .eq("granularity", granularity)
      .eq("start_date", effectiveStart)
      .eq("end_date", effectiveEnd);

    // Store raw snapshot
    const rawData = {
      by_service: byServiceData,
      total: totalData,
      total_by_period: totalByPeriod,
    };

    await supabaseAdmin.from("cost_snapshots").insert({
      account_id: accountId,
      user_id: userId,
      workspace_id: workspaceId,
      granularity,
      start_date: effectiveStart,
      end_date: effectiveEnd,
      raw_data: rawData,
      cached_at: new Date().toISOString(),
    });

    // Return response
    return new Response(JSON.stringify({
      source: "api",
      cached_at: new Date().toISOString(),
      raw_data: rawData,
      cost_by_service: serviceRows,
      total_by_period: totalByPeriod,
      start_date: effectiveStart,
      end_date: effectiveEnd,
      granularity,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("aws-cost-sync error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred fetching cost data", code: "COST_SYNC_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
