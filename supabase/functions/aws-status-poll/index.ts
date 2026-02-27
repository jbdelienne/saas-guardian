import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Lightweight AWS status poller — called every 2 min by pg_cron.
 * Only queries EC2 DescribeInstances + RDS DescribeDBInstances to refresh
 * the `services` table status. No S3, no Cost Explorer, no Health API.
 */

async function pollEC2Status(aws: AwsClient, region: string) {
  const results: Array<{ id: string; state: string }> = [];
  try {
    const res = await aws.fetch(
      `https://ec2.${region}.amazonaws.com/?Action=DescribeInstances&Version=2016-11-15`,
      { method: "GET" }
    );
    const text = await res.text();

    // Parse each <item> inside <instancesSet> for id + state
    const instanceBlocks = text.match(/<item>[\s\S]*?<instanceId>(.*?)<\/instanceId>[\s\S]*?<instanceState>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/instanceState>[\s\S]*?<\/item>/g) || [];
    
    for (const block of instanceBlocks) {
      const idMatch = block.match(/<instanceId>(.*?)<\/instanceId>/);
      const stateMatch = block.match(/<instanceState>[\s\S]*?<name>(.*?)<\/name>/);
      if (idMatch && stateMatch) {
        results.push({ id: idMatch[1], state: stateMatch[1] });
      }
    }
  } catch (e) {
    console.error("EC2 poll error:", e);
  }
  return results;
}

async function pollRDSStatus(aws: AwsClient, region: string) {
  const results: Array<{ id: string; status: string }> = [];
  try {
    const res = await aws.fetch(
      `https://rds.${region}.amazonaws.com/?Action=DescribeDBInstances&Version=2014-10-31`,
      { method: "GET" }
    );
    const text = await res.text();
    const dbIds = text.match(/<DBInstanceIdentifier>(.*?)<\/DBInstanceIdentifier>/g) || [];
    const dbStatuses = text.match(/<DBInstanceStatus>(.*?)<\/DBInstanceStatus>/g) || [];
    
    for (let i = 0; i < dbIds.length; i++) {
      results.push({
        id: dbIds[i].replace(/<\/?DBInstanceIdentifier>/g, ""),
        status: dbStatuses[i]?.replace(/<\/?DBInstanceStatus>/g, "") || "unknown",
      });
    }
  } catch (e) {
    console.error("RDS poll error:", e);
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all AWS credentials
    const { data: credentials, error: credErr } = await supabaseAdmin
      .from("aws_credentials")
      .select("*")
      .eq("sync_status", "success"); // Only poll credentials that have been successfully synced at least once

    if (credErr || !credentials?.length) {
      console.log("No AWS credentials to poll", credErr?.message);
      return new Response(JSON.stringify({ polled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalUpdated = 0;

    for (const cred of credentials) {
      const aws = new AwsClient({
        accessKeyId: cred.access_key_id,
        secretAccessKey: cred.secret_access_key,
        region: cred.region,
      });

      // Poll EC2 + RDS in parallel
      const [ec2Instances, rdsInstances] = await Promise.all([
        pollEC2Status(aws, cred.region),
        pollRDSStatus(aws, cred.region),
      ]);

      const now = new Date().toISOString();

      // Update EC2 service statuses + insert checks
      for (const inst of ec2Instances) {
        const serviceName = `EC2 ${inst.id}`;
        const status = inst.state === "running" ? "up" : inst.state === "stopped" ? "down" : "degraded";
        
        const { data: updated } = await supabaseAdmin
          .from("services")
          .update({ status, last_check: now })
          .eq("user_id", cred.user_id)
          .eq("name", serviceName)
          .select("id");
        
        if (updated?.length) {
          totalUpdated++;
          // Insert a check record so uptime widgets can compute %
          await supabaseAdmin.from("checks").insert({
            service_id: updated[0].id,
            user_id: cred.user_id,
            status,
            response_time: 0,
            checked_at: now,
          });
        }
      }

      // Update RDS service statuses + insert checks
      for (const db of rdsInstances) {
        const serviceName = `RDS ${db.id}`;
        const status = db.status === "available" ? "up" : db.status === "stopped" ? "down" : "degraded";
        
        const { data: updated } = await supabaseAdmin
          .from("services")
          .update({ status, last_check: now })
          .eq("user_id", cred.user_id)
          .eq("name", serviceName)
          .select("id");
        
        if (updated?.length) {
          totalUpdated++;
          await supabaseAdmin.from("checks").insert({
            service_id: updated[0].id,
            user_id: cred.user_id,
            status,
            response_time: 0,
            checked_at: now,
          });
        }
      }

      // Update last_sync_at on credential
      await supabaseAdmin
        .from("aws_credentials")
        .update({ last_sync_at: now })
        .eq("id", cred.id);
    }

    console.log(`AWS status poll complete: ${totalUpdated} services updated across ${credentials.length} accounts`);

    return new Response(
      JSON.stringify({ polled: credentials.length, updated: totalUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AWS status poll error:", error);
    return new Response(
      JSON.stringify({ error: "Poll failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
