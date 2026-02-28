import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(resendKey);
    const { email, firstName, company } = await req.json();

    if (!email) {
      throw new Error("Missing email");
    }

    // Add contact to Resend audience
    const audienceId = Deno.env.get("RESEND_AUDIENCE_ID");
    if (audienceId) {
      try {
        await resend.contacts.create({
          audienceId,
          email,
          firstName: firstName || company || undefined,
          unsubscribed: false,
        });
        console.log(`Contact ${email} added to audience`);
      } catch (e: any) {
        console.error("Failed to add contact to audience:", e.message);
        // Don't block the welcome email if audience add fails
      }
    }

    const { error } = await resend.emails.send({
      from: "moniduck <noreply@moniduck.com>",
      to: [email],
      subject: "You're on the moniduck waitlist! 🦆",
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #171717;">
          <div style="margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">${firstName ? `Hey ${firstName}, welcome` : "Welcome"} to the waitlist!</h1>
            <p style="color: #737373; font-size: 15px; line-height: 1.6; margin: 0;">
              Thanks for signing up${company ? ` from <strong>${company}</strong>` : ""}. You're now on the list for early access to moniduck.
            </p>
          </div>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 14px; color: #525252; line-height: 1.6;">
              moniduck centralizes uptime monitoring, SaaS integrations, and security checks into a single dashboard. We'll notify you as soon as your spot is ready.
            </p>
          </div>
          <p style="color: #a3a3a3; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} moniduck — All your IT assets, one dashboard.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
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
