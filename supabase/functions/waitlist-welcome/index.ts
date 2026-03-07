import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@3.2.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const fullAccessKey = Deno.env.get("RESEND_API_KEY");
    const sendingKey = Deno.env.get("RESEND_SENDING_KEY");
    if (!fullAccessKey && !sendingKey) {
      console.warn("No Resend keys configured, skipping");
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Full Access key for audience/contacts, Sending key for emails
    const resendFull = fullAccessKey ? new Resend(fullAccessKey) : null;
    const resendSending = new Resend(sendingKey || fullAccessKey!);
    const { email, firstName, company } = await req.json();

    if (!email || !EMAIL_REGEX.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the email actually exists in waitlist_signups (prevents abuse)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: signup } = await supabaseAdmin
      .from("waitlist_signups")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (!signup) {
      return new Response(JSON.stringify({ error: "Email not found in waitlist" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Sanitize optional string fields
    const safeName = typeof firstName === "string" ? firstName.slice(0, 100) : undefined;
    const safeCompany = typeof company === "string" ? company.slice(0, 200) : undefined;

    // Add contact to Resend audience
    const audienceId = Deno.env.get("RESEND_AUDIENCE_ID");
    if (audienceId && resendFull) {
      try {
        await resendFull.contacts.create({
          audienceId,
          email,
          firstName: safeName || safeCompany || undefined,
          unsubscribed: false,
        });
        console.log(`Contact added to audience`);
      } catch (e: any) {
        console.error("Failed to add contact to audience:", e.message);
      }
    }

    let emailSent = false;
    try {
      const { error } = await resendSending.emails.send({
        from: "moniduck <noreply@mail.moniduck.io>",
        to: [email],
        subject: "You're on the moniduck waitlist! 🦆",
        template: {
          id: "testing",
          variables: {
            firstName: safeName || "",
            company: safeCompany || "",
            email,
          },
        },
      });
      if (error) {
        console.error("Resend email error (non-fatal):", error);
      } else {
        emailSent = true;
      }
    } catch (e: any) {
      console.error("Resend email send failed (non-fatal):", e.message);
    }

    return new Response(JSON.stringify({ success: true, emailSent }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in waitlist-welcome:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
