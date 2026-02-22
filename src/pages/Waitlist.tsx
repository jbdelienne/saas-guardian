import { useState } from "react";
import { ArrowRight, Check, Activity, Plug, Bell, BarChart3, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import duckLogo from "@/assets/moniduck-logo.png";

const features = [
  { icon: Activity, title: "Uptime Monitoring", desc: "Track availability of all your services in real-time." },
  { icon: Plug, title: "SaaS Integrations", desc: "Connect Google Workspace, Microsoft 365, Slack & more." },
  { icon: Bell, title: "Smart Alerts", desc: "Get notified before issues impact your team." },
  { icon: BarChart3, title: "Custom Dashboards", desc: "Build the views that matter to your ops." },
  { icon: Shield, title: "SSL & Security", desc: "Monitor certificates and security posture." },
  { icon: Zap, title: "Lightning Fast", desc: "Sub-second checks from multiple regions." },
];

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("waitlist_signups").insert({
        email: email.trim().toLowerCase(),
        company: company.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already on the waitlist!");
          setSubmitted(true);
        } else {
          throw error;
        }
      } else {
        // Trigger confirmation email
        try {
          await supabase.functions.invoke("waitlist-welcome", {
            body: { email: email.trim().toLowerCase(), company: company.trim() || null },
          });
        } catch {
          // Email is best-effort, don't block the flow
        }
        toast.success("You're on the list! Check your inbox.");
        setSubmitted(true);
      }
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={duckLogo} alt="moniduck" className="w-16 h-16" />
            <span className="font-semibold text-4xl tracking-tight">moniduck</span>
          </div>
          <div className="text-sm text-muted-foreground hidden md:block">
            Early Access — Coming Soon
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            Early Access — Limited Spots
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            All your IT assets,
            <br />
            <span className="text-primary">one dashboard.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
            moniduck centralizes uptime monitoring, SaaS integrations, and security checks into a single pane of glass. Join the waitlist to get early access.
          </p>

          {/* Waitlist Form */}
          {submitted ? (
            <div className="flex items-center gap-3 p-5 rounded-xl border border-success/30 bg-success/5 max-w-lg">
              <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-semibold">You're on the list!</p>
                <p className="text-sm text-muted-foreground">We'll reach out when your spot is ready.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <div className="flex-1 space-y-2">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
                <Input
                  type="text"
                  placeholder="Company (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8 shrink-0" disabled={loading}>
                {loading ? "Joining..." : "Join Waitlist"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}
        </div>

        {/* Terminal preview */}
        <div className="mt-16 md:mt-20 rounded-xl border border-border bg-card overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
            <span className="ml-3 text-xs font-mono text-muted-foreground">dashboard — moniduck</span>
          </div>
          <div className="p-6 md:p-8 font-mono text-sm text-muted-foreground space-y-2">
            <p><span className="text-success">✓</span> api.production <span className="text-muted-foreground/60">— 42ms, up 99.98%</span></p>
            <p><span className="text-success">✓</span> auth.production <span className="text-muted-foreground/60">— 38ms, up 100%</span></p>
            <p><span className="text-warning">⚠</span> cdn.staging <span className="text-muted-foreground/60">— 520ms, degraded</span></p>
            <p><span className="text-success">✓</span> google-workspace <span className="text-muted-foreground/60">— 142 users synced</span></p>
            <p><span className="text-success">✓</span> slack-workspace <span className="text-muted-foreground/60">— 23 channels active</span></p>
            <p className="text-primary">→ 4/5 services healthy · 1 alert pending</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need to monitor your IT.</h2>
            <p className="text-muted-foreground text-lg">One tool to replace the chaos of scattered dashboards and manual checks.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={duckLogo} alt="moniduck" className="w-6 h-6" />
            <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} moniduck</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
