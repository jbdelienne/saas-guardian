import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROVIDERS: Record<string, { authUrl: string; scopes: string; clientIdEnv: string }> = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
      "https://www.googleapis.com/auth/admin.directory.domain.readonly",
      "https://www.googleapis.com/auth/admin.reports.usage.readonly",
    ].join(" "),
    clientIdEnv: "GOOGLE_CLIENT_ID",
  },
  microsoft: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scopes: [
      "offline_access",
      "https://graph.microsoft.com/User.Read.All",
      "https://graph.microsoft.com/Directory.Read.All",
      "https://graph.microsoft.com/Reports.Read.All",
    ].join(" "),
    clientIdEnv: "MICROSOFT_CLIENT_ID",
  },
  slack: {
    authUrl: "https://slack.com/oauth/v2/authorize",
    scopes: [
      "users:read",
      "channels:read",
      "channels:history",
      "team:read",
      "files:read",
    ].join(","),
    clientIdEnv: "SLACK_CLIENT_ID",
  },
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");

    if (!provider || !PROVIDERS[provider]) {
      return new Response(
        JSON.stringify({ error: "Invalid provider. Use: google, microsoft, slack" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = PROVIDERS[provider];
    const clientId = Deno.env.get(config.clientIdEnv);
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: `${config.clientIdEnv} not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/integration-oauth-callback`;
    const state = btoa(JSON.stringify({ provider, userId }));

    let authorizationUrl: string;

    if (provider === "slack") {
      authorizationUrl =
        `${config.authUrl}?client_id=${clientId}&scope=${encodeURIComponent(config.scopes)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
    } else {
      authorizationUrl =
        `${config.authUrl}?client_id=${clientId}&response_type=code&access_type=offline&prompt=consent` +
        `&scope=${encodeURIComponent(config.scopes)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
    }

    return new Response(JSON.stringify({ url: authorizationUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OAuth initiation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
