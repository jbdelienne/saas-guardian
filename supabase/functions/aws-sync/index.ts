import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AwsMetric {
  metric_type: string;
  metric_key: string;
  metric_value: number;
  metric_unit: string;
  metadata?: Record<string, unknown>;
}

// ---- AWS API helpers ----

async function discoverEC2(aws: AwsClient, region: string): Promise<AwsMetric[]> {
  const metrics: AwsMetric[] = [];
  try {
    const res = await aws.fetch(
      `https://ec2.${region}.amazonaws.com/?Action=DescribeInstances&Version=2016-11-15`,
      { method: "GET" }
    );
    const text = await res.text();
    // Parse XML response - count instances and states
    const instanceMatches = text.match(/<instanceId>(.*?)<\/instanceId>/g) || [];
    const runningMatches = text.match(/<name>running<\/name>/g) || [];
    const stoppedMatches = text.match(/<name>stopped<\/name>/g) || [];

    metrics.push(
      { metric_type: "ec2", metric_key: "ec2_total_instances", metric_value: instanceMatches.length, metric_unit: "count" },
      { metric_type: "ec2", metric_key: "ec2_running", metric_value: runningMatches.length, metric_unit: "count" },
      { metric_type: "ec2", metric_key: "ec2_stopped", metric_value: stoppedMatches.length, metric_unit: "count" }
    );

    // Extract instance details with Name tag
    // Use reservationSet > instancesSet structure instead of splitting by <item> (which breaks nested tags)
    const instances: Array<{ id: string; type: string; state: string; name: string }> = [];
    // Match each instance block: from <instanceId> to the next </tagSet> or </instancesSet>
    const instanceRegex = /<instanceId>(.*?)<\/instanceId>[\s\S]*?<instanceType>(.*?)<\/instanceType>[\s\S]*?<instanceState>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/instanceState>([\s\S]*?)(?:<\/item>\s*<\/instancesSet>|<\/item>\s*<item>\s*<instanceId>)/g;
    
    // Simpler approach: find all instanceIds first, then extract details for each
    const allInstanceIds = [...text.matchAll(/<instanceId>(i-[a-f0-9]+)<\/instanceId>/g)];
    for (const idMatch of allInstanceIds) {
      const instId = idMatch[1];
      const startIdx = idMatch.index!;
      // Find the closing </item> for this instance's instancesSet item
      // Look for the next instanceId or end of instancesSet
      const nextIdMatch = text.indexOf('<instanceId>', startIdx + 1);
      const endOfSet = text.indexOf('</instancesSet>', startIdx);
      const endIdx = nextIdMatch > 0 && nextIdMatch < endOfSet ? nextIdMatch : endOfSet > 0 ? endOfSet : text.length;
      const block = text.substring(startIdx, endIdx);
      
      const typeM = block.match(/<instanceType>(.*?)<\/instanceType>/);
      const stateM = block.match(/<instanceState>[\s\S]*?<name>(.*?)<\/name>/);
      // Name tag in tagSet: <key>Name</key><value>...</value>
      const nameM = block.match(/<key>Name<\/key>[\s\S]*?<value>(.*?)<\/value>/);
      
      instances.push({
        id: instId,
        type: typeM?.[1] || "unknown",
        state: stateM?.[1] || "unknown",
        name: nameM?.[1] || "",
      });
    }
    if (instances.length > 0) {
      metrics.push({
        metric_type: "ec2",
        metric_key: "ec2_instances_detail",
        metric_value: instances.length,
        metric_unit: "list",
        metadata: { instances: instances.slice(0, 50) },
      });
    }
  } catch (e) {
    console.error("EC2 discovery error:", e);
  }
  return metrics;
}

async function discoverS3(aws: AwsClient): Promise<AwsMetric[]> {
  const metrics: AwsMetric[] = [];
  try {
    const res = await aws.fetch("https://s3.amazonaws.com/", { method: "GET" });
    const text = await res.text();
    const bucketNames = text.match(/<Name>(.*?)<\/Name>/g) || [];
    const names = bucketNames.map((b) => b.replace(/<\/?Name>/g, ""));

    metrics.push({
      metric_type: "s3",
      metric_key: "s3_total_buckets",
      metric_value: names.length,
      metric_unit: "count",
      metadata: { buckets: names.slice(0, 100) },
    });
  } catch (e) {
    console.error("S3 discovery error:", e);
  }
  return metrics;
}

async function discoverLambda(aws: AwsClient, region: string): Promise<AwsMetric[]> {
  const metrics: AwsMetric[] = [];
  try {
    const res = await aws.fetch(
      `https://lambda.${region}.amazonaws.com/2015-03-31/functions/`,
      { method: "GET" }
    );
    if (res.ok) {
      const data = await res.json();
      const functions = data.Functions || [];
      metrics.push({
        metric_type: "lambda",
        metric_key: "lambda_total_functions",
        metric_value: functions.length,
        metric_unit: "count",
        metadata: {
          functions: functions.slice(0, 50).map((f: any) => ({
            name: f.FunctionName,
            runtime: f.Runtime,
            memory: f.MemorySize,
            lastModified: f.LastModified,
          })),
        },
      });
    }
  } catch (e) {
    console.error("Lambda discovery error:", e);
  }
  return metrics;
}

async function discoverRDS(aws: AwsClient, region: string): Promise<AwsMetric[]> {
  const metrics: AwsMetric[] = [];
  try {
    const res = await aws.fetch(
      `https://rds.${region}.amazonaws.com/?Action=DescribeDBInstances&Version=2014-10-31`,
      { method: "GET" }
    );
    const text = await res.text();
    const dbMatches = text.match(/<DBInstanceIdentifier>(.*?)<\/DBInstanceIdentifier>/g) || [];
    const engineMatches = text.match(/<Engine>(.*?)<\/Engine>/g) || [];
    const statusMatches = text.match(/<DBInstanceStatus>(.*?)<\/DBInstanceStatus>/g) || [];

    const instances = dbMatches.map((d, i) => ({
      id: d.replace(/<\/?DBInstanceIdentifier>/g, ""),
      engine: engineMatches[i]?.replace(/<\/?Engine>/g, "") || "unknown",
      status: statusMatches[i]?.replace(/<\/?DBInstanceStatus>/g, "") || "unknown",
    }));

    metrics.push({
      metric_type: "rds",
      metric_key: "rds_total_instances",
      metric_value: instances.length,
      metric_unit: "count",
      metadata: { instances: instances.slice(0, 50) },
    });
  } catch (e) {
    console.error("RDS discovery error:", e);
  }
  return metrics;
}

async function fetchCosts(creds: { accessKeyId: string; secretAccessKey: string }, _region: string): Promise<AwsMetric[]> {
  // Cost Explorer is a global service only available in us-east-1
  const ceClient = new AwsClient({ ...creds, region: "us-east-1" });
  const metrics: AwsMetric[] = [];
  try {
    const now = new Date();
    const endDate = now.toISOString().split("T")[0];
    const startDate30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const body = JSON.stringify({
      TimePeriod: { Start: startDate30, End: endDate },
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost"],
      GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
    });

    const res = await ceClient.fetch(`https://ce.us-east-1.amazonaws.com/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSInsightsIndexService.GetCostAndUsage",
      },
      body,
    });

    if (res.ok) {
      const data = await res.json();
      const results = data.ResultsByTime || [];
      let totalCost = 0;
      const serviceBreakdown: Array<{ service: string; cost: number }> = [];

      for (const period of results) {
        for (const group of period.Groups || []) {
          const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || "0");
          const service = group.Keys?.[0] || "Unknown";
          totalCost += cost;
          serviceBreakdown.push({ service, cost: Math.round(cost * 100) / 100 });
        }
      }

      // Sort by cost descending
      serviceBreakdown.sort((a, b) => b.cost - a.cost);

      metrics.push(
        {
          metric_type: "costs",
          metric_key: "aws_total_cost_30d",
          metric_value: Math.round(totalCost * 100) / 100,
          metric_unit: "USD",
        },
        {
          metric_type: "costs",
          metric_key: "aws_cost_by_service",
          metric_value: serviceBreakdown.length,
          metric_unit: "list",
          metadata: { services: serviceBreakdown.slice(0, 20) },
        }
      );
    } else {
      console.error("Cost Explorer API error:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Cost Explorer error:", e);
  }
  return metrics;
}

async function fetchHealth(creds: { accessKeyId: string; secretAccessKey: string }, _region: string): Promise<AwsMetric[]> {
  // AWS Health API is a global service only available in us-east-1
  const healthClient = new AwsClient({ ...creds, region: "us-east-1" });
  const metrics: AwsMetric[] = [];
  try {
    const body = JSON.stringify({
      filter: {
        eventStatusCodes: ["open", "upcoming"],
      },
      maxResults: 100,
    });

    const res = await healthClient.fetch(`https://health.us-east-1.amazonaws.com/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSHealth_20160804.DescribeEvents",
      },
      body,
    });

    if (res.ok) {
      const data = await res.json();
      const events = data.events || [];
      metrics.push({
        metric_type: "health",
        metric_key: "aws_health_events",
        metric_value: events.length,
        metric_unit: "count",
        metadata: {
          events: events.slice(0, 20).map((e: any) => ({
            service: e.service,
            eventTypeCode: e.eventTypeCode,
            statusCode: e.statusCode,
            region: e.region,
          })),
        },
      });
    } else {
      // Health API may return 400 if not on Business/Enterprise support
      const errText = await res.text();
      console.warn("Health API not available (requires Business/Enterprise support):", res.status, errText);
      metrics.push({
        metric_type: "health",
        metric_key: "aws_health_events",
        metric_value: 0,
        metric_unit: "count",
        metadata: { note: "Requires AWS Business or Enterprise Support plan" },
      });
    }
  } catch (e) {
    console.error("Health API error:", e);
  }
  return metrics;
}

// ---- Validate identity ----
async function validateIdentity(aws: AwsClient, region: string): Promise<{ valid: boolean; accountId?: string; arn?: string }> {
  try {
    const res = await aws.fetch(`https://sts.${region}.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15`);
    const text = await res.text();
    if (!res.ok) return { valid: false };
    const accountMatch = text.match(/<Account>(.*?)<\/Account>/);
    const arnMatch = text.match(/<Arn>(.*?)<\/Arn>/);
    return { valid: true, accountId: accountMatch?.[1], arn: arnMatch?.[1] };
  } catch {
    return { valid: false };
  }
}

// ---- Main handler ----
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

    const url = new URL(req.url);
    const credentialId = url.searchParams.get("credential_id");
    if (!credentialId) {
      return new Response(JSON.stringify({ error: "credential_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read credentials
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // Update sync status
    await supabaseAdmin
      .from("aws_credentials")
      .update({ sync_status: "syncing" })
      .eq("id", credentialId);

    const aws = new AwsClient({
      accessKeyId: cred.access_key_id,
      secretAccessKey: cred.secret_access_key,
      region: cred.region,
    });

    // Validate identity first
    const identity = await validateIdentity(aws, cred.region);
    if (!identity.valid) {
      await supabaseAdmin
        .from("aws_credentials")
        .update({ sync_status: "error" })
        .eq("id", credentialId);
      return new Response(JSON.stringify({ error: "Invalid AWS credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`AWS identity validated: ${identity.arn} (Account: ${identity.accountId})`);

    // Get or create integrations row for this AWS connection
    let { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("integration_type", "aws")
      .maybeSingle();

    if (!integration) {
      // Get workspace_id from the credential
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("integrations")
        .insert({
          user_id: userId,
          integration_type: "aws",
          is_connected: true,
          workspace_id: cred.workspace_id,
          config: { account_id: identity.accountId, arn: identity.arn },
        })
        .select("id")
        .single();
      if (insertErr) {
        console.error("Failed to insert integration:", JSON.stringify(insertErr));
      }
      integration = inserted;
    } else {
      await supabaseAdmin
        .from("integrations")
        .update({
          is_connected: true,
          config: { account_id: identity.accountId, arn: identity.arn },
        })
        .eq("id", integration.id);
    }

    if (!integration) {
      await supabaseAdmin.from("aws_credentials").update({ sync_status: "error" }).eq("id", credentialId);
      return new Response(JSON.stringify({ error: "Failed to create integration record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const integrationId = integration.id;

    // Run all discoveries in parallel
    const [ec2, s3, lambda, rds, costs, health] = await Promise.all([
      discoverEC2(aws, cred.region),
      discoverS3(aws),
      discoverLambda(aws, cred.region),
      discoverRDS(aws, cred.region),
      fetchCosts({ accessKeyId: cred.access_key_id, secretAccessKey: cred.secret_access_key }, cred.region),
      fetchHealth({ accessKeyId: cred.access_key_id, secretAccessKey: cred.secret_access_key }, cred.region),
    ]);

    const allMetrics: AwsMetric[] = [
      // Identity info
      {
        metric_type: "identity",
        metric_key: "aws_account",
        metric_value: 1,
        metric_unit: "info",
        metadata: { account_id: identity.accountId, arn: identity.arn, region: cred.region },
      },
      ...ec2,
      ...s3,
      ...lambda,
      ...rds,
      ...costs,
      ...health,
    ];

    // ---- Upsert compute resources into services table ----
    const computeServices: Array<{ name: string; url: string; icon: string; status: string; tags: string[] }> = [];

    // EC2 instances
    const ec2Detail = ec2.find(m => m.metric_key === "ec2_instances_detail");
    if (ec2Detail?.metadata?.instances) {
      for (const inst of ec2Detail.metadata.instances as Array<{ id: string; type: string; state: string; name: string }>) {
        const st = inst.state === "running" ? "up" : inst.state === "stopped" ? "down" : "unknown";
        computeServices.push({
          name: `EC2 ${inst.id}`,
          url: `https://${cred.region}.console.aws.amazon.com/ec2/home?region=${cred.region}#InstanceDetails:instanceId=${inst.id}`,
          icon: "🖥️",
          status: st,
          tags: ["aws", "ec2", inst.type],
        });
      }
    }

    // Lambda functions
    const lambdaDetail = lambda.find(m => m.metric_key === "lambda_total_functions");
    if (lambdaDetail?.metadata?.functions) {
      for (const fn of lambdaDetail.metadata.functions as Array<{ name: string; runtime: string; memory: number }>) {
        computeServices.push({
          name: `Lambda ${fn.name}`,
          url: `https://${cred.region}.console.aws.amazon.com/lambda/home?region=${cred.region}#/functions/${fn.name}`,
          icon: "⚡",
          status: "up",
          tags: ["aws", "lambda", fn.runtime || "unknown"],
        });
      }
    }

    // RDS instances
    const rdsDetail = rds.find(m => m.metric_key === "rds_total_instances");
    if (rdsDetail?.metadata?.instances) {
      for (const db of rdsDetail.metadata.instances as Array<{ id: string; engine: string; status: string }>) {
        const st = db.status === "available" ? "up" : db.status === "stopped" ? "down" : "degraded";
        computeServices.push({
          name: `RDS ${db.id}`,
          url: `https://${cred.region}.console.aws.amazon.com/rds/home?region=${cred.region}#database:id=${db.id}`,
          icon: "🗄️",
          status: st,
          tags: ["aws", "rds", db.engine],
        });
      }
    }

    // Upsert each compute service (match by URL which contains the unique resource ID)
    for (const svc of computeServices) {
      const { data: existing } = await supabaseAdmin
        .from("services")
        .select("id")
        .eq("user_id", userId)
        .eq("url", svc.url)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from("services").update({
          name: svc.name,
          status: svc.status,
          icon: svc.icon,
          tags: svc.tags,
          last_check: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("services").insert({
          user_id: userId,
          workspace_id: cred.workspace_id,
          name: svc.name,
          url: svc.url,
          icon: svc.icon,
          status: svc.status,
          tags: svc.tags,
          is_paused: true,
          check_interval: 0,
          last_check: new Date().toISOString(),
        });
      }
    }

    // Delete old sync data and insert new
    await supabaseAdmin
      .from("integration_sync_data")
      .delete()
      .eq("integration_id", integrationId)
      .eq("user_id", userId);
    if (allMetrics.length > 0) {
      const rows = allMetrics.map((m) => ({
        user_id: userId,
        integration_id: integrationId,
        metric_type: m.metric_type,
        metric_key: m.metric_key,
        metric_value: m.metric_value,
        metric_unit: m.metric_unit,
        metadata: m.metadata || {},
        synced_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabaseAdmin.from("integration_sync_data").insert(rows);
      if (insertError) console.error("Failed to store AWS metrics:", insertError);
    }

    // Update sync status and last_sync
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("aws_credentials")
      .update({ sync_status: "success", last_sync_at: now })
      .eq("id", credentialId);

    await supabaseAdmin
      .from("integrations")
      .update({ last_sync: now, is_connected: true })
      .eq("id", integrationId);

    return new Response(
      JSON.stringify({
        success: true,
        account_id: identity.accountId,
        metrics_count: allMetrics.length,
        summary: {
          ec2: ec2.length,
          s3: s3.length,
          lambda: lambda.length,
          rds: rds.length,
          costs: costs.length,
          health: health.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AWS sync error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred during AWS sync", code: "AWS_SYNC_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
