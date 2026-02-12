import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AES-GCM encryption helpers
async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("moniduck-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

const TOKEN_ENDPOINTS: Record<string, { url: string; clientIdEnv: string; clientSecretEnv: string }> = {
  google: {
    url: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  microsoft: {
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
  },
  slack: {
    url: "https://slack.com/api/oauth.v2.access",
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
  },
};

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400 });
    }

    const { provider, userId } = JSON.parse(atob(stateParam));
    const config = TOKEN_ENDPOINTS[provider];
    if (!config) {
      return new Response("Invalid provider", { status: 400 });
    }

    const clientId = Deno.env.get(config.clientIdEnv)!;
    const clientSecret = Deno.env.get(config.clientSecretEnv)!;
    const encryptionKey = Deno.env.get("INTEGRATION_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("INTEGRATION_ENCRYPTION_KEY not configured");
      return new Response("Server configuration error. Please contact support.", { status: 500 });
    }

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/integration-oauth-callback`;

    // Exchange code for tokens
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token exchange failed:", JSON.stringify(tokenData));
      return new Response("Authentication failed. Please try again.", { status: 400 });
    }

    // Encrypt tokens
    const accessToken = provider === "slack"
      ? tokenData.access_token || tokenData.authed_user?.access_token
      : tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;

    const encryptedAccess = await encrypt(accessToken, encryptionKey);
    const encryptedRefresh = refreshToken ? await encrypt(refreshToken, encryptionKey) : null;

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Store in DB using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert integration
    const { data: existing } = await supabaseAdmin
      .from("integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("integration_type", provider)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("integrations")
        .update({
          is_connected: true,
          access_token_encrypted: encryptedAccess,
          refresh_token_encrypted: encryptedRefresh,
          token_expires_at: expiresAt,
          last_sync: null,
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("integrations").insert({
        user_id: userId,
        integration_type: provider,
        is_connected: true,
        access_token_encrypted: encryptedAccess,
        refresh_token_encrypted: encryptedRefresh,
        token_expires_at: expiresAt,
      });
    }

    // Create default thresholds
    await supabaseAdmin.rpc("create_default_thresholds", {
      p_user_id: userId,
      p_integration_type: provider,
    });

    // Redirect back to app
    const appUrl = Deno.env.get("APP_URL") || "https://id-preview--a958943c-1b40-48c5-8678-5000e2e54b1a.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/integrations?connected=${provider}` },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response("An error occurred during authentication. Please try again.", {
      status: 500,
    });
  }
});
