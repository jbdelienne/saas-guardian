import { useState, useCallback, useEffect, useRef } from "react";
import {
  ArrowRight, Check, Activity, Globe, CreditCard, ShieldCheck, Tv, Search,
  Sparkles, ChevronDown, Zap, Clock, BarChart3, MonitorSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import duckLogo from "@/assets/moniduck-logo.png";
import dashboardPreview from "@/assets/dashboard-preview.png";

/* ── Data ─────────────────────────────────────────── */

const features = [
  { icon: Activity, title: "Real-time endpoint monitoring", desc: "Know before your users do." },
  { icon: Search, title: "AWS auto-discovery", desc: "Connect once. We find everything in 2 minutes." },
  { icon: Globe, title: "Google Workspace & Microsoft 365", desc: "Unused licences, full storage, missing 2FA. We catch it all." },
  { icon: CreditCard, title: "Stripe monitoring", desc: "Webhooks down, disputes pending, payout failed. Instant alerts." },
  { icon: ShieldCheck, title: "SSL certificate alerts", desc: "Never wake up to a broken padlock again." },
  { icon: Tv, title: "TV Mode", desc: "One click. Full screen. Your infra on the wall." },
];

const steps = [
  { num: 1, title: "Connect your stack", desc: "Link AWS, Google, Stripe, or any HTTP endpoint. Takes 2 minutes." },
  { num: 2, title: "We monitor everything", desc: "Uptime, certificates, quotas, licences, billing — checked every minute." },
  { num: 3, title: "Get alerted instantly", desc: "Email, Slack or webhook. Before your users or your boss notices." },
];

const benefits = [
  { icon: Clock, title: "Save 4+ hours/week", desc: "Stop switching between 6 different dashboards every morning." },
  { icon: Zap, title: "Sub-minute detection", desc: "Our checks run every 60 seconds from multiple regions worldwide." },
  { icon: BarChart3, title: "Actionable insights", desc: "Not just uptime. Storage trends, licence waste, security gaps." },
  { icon: MonitorSmartphone, title: "Works everywhere", desc: "Desktop, mobile, TV mode for your office wall. One tool." },
];

const faqs = [
  { q: "Is moniduck free during the beta?", a: "Yes. Early access users get the full product free during our beta period. No credit card required." },
  { q: "What services can I monitor?", a: "Any HTTP/HTTPS endpoint, plus native integrations for Google Workspace, Microsoft 365, Slack, AWS, and Stripe." },
  { q: "How does alerting work?", a: "You define thresholds (e.g. storage > 85%) and we notify you via email, Slack webhook, or both. Downtime alerts are instant." },
  { q: "Can my whole team use it?", a: "Absolutely. moniduck supports workspaces with role-based access. Invite your ops team in seconds." },
  { q: "What happens after the beta?", a: "Early adopters will be grandfathered into a generous plan. We'll always have a free tier." },
];

/* ── Confetti ─────────────────────────────────────── */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; rotation: number; rotationSpeed: number; life: number;
}

const CONFETTI_COLORS = [
  "hsl(161, 93%, 30%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)",
  "hsl(160, 84%, 39%)", "hsl(280, 70%, 55%)", "hsl(350, 80%, 55%)",
];

function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number>();

  const fire = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const cx = canvas.width / 2;
    for (let i = 0; i < 150; i++) {
      particles.current.push({
        x: cx + (Math.random() - 0.5) * 300,
        y: canvas.height * 0.3,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 18 - 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 7 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 14,
        life: 1,
      });
    }
    const animate = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter((p) => p.life > 0);
      for (const p of particles.current) {
        p.x += p.vx; p.vy += 0.35; p.y += p.vy;
        p.rotation += p.rotationSpeed; p.life -= 0.01;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (particles.current.length > 0) raf.current = requestAnimationFrame(animate);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    animate();
  }, []);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  return { canvasRef, fire };
}

/* ── FAQ Item ─────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-medium text-foreground pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-5" : "max-h-0"}`}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ── Waitlist Form ────────────────────────────────── */
function WaitlistForm({
  onSuccess,
  variant = "default",
}: {
  onSuccess: () => void;
  variant?: "default" | "compact";
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

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
          onSuccess();
        } else throw error;
      } else {
        try {
          await supabase.functions.invoke("waitlist-welcome", {
            body: { email: email.trim().toLowerCase(), company: company.trim() || null },
          });
        } catch { /* best-effort */ }
        toast.success("You're on the list! 🎉");
        onSuccess();
      }
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-12 text-base flex-1"
        />
        <Button type="submit" size="lg" className="h-12 px-8 shrink-0" disabled={loading}>
          {loading ? "Joining..." : "Join Waitlist"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-12 text-base"
      />
      <Input
        type="text"
        placeholder="Company (optional)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="h-12 text-base"
      />
      <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={loading}>
        {loading ? "Joining..." : "Join the Waitlist"}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        No spam, ever. We'll only email you when it's ready.
      </p>
    </form>
  );
}

/* ── Success state ────────────────────────────────── */
function SuccessCard() {
  return (
    <div className="rounded-2xl border border-success/30 bg-success/5 p-8 animate-scale-in text-center">
      <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
        <Check className="w-7 h-7 text-success" />
      </div>
      <p className="text-xl font-semibold mb-1">You're on the list!</p>
      <p className="text-sm text-muted-foreground">We'll reach out when your spot is ready.</p>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────── */

export default function Waitlist() {
  const [submitted, setSubmitted] = useState(false);
  const { canvasRef, fire } = useConfetti();

  const handleSuccess = () => {
    setSubmitted(true);
    fire();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Confetti */}
      <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" style={{ width: "100%", height: "100%" }} />

      {/* ─── Nav ─────────────────────────────────── */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={duckLogo} alt="moniduck" className="w-12 h-12" />
            <span className="font-semibold text-2xl tracking-tight">moniduck</span>
          </div>
          <a href="#waitlist-form" className="hidden sm:inline-flex">
            <Button size="sm" className="h-9">
              Get Early Access
            </Button>
          </a>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-16 md:pt-24 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy + Form */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Early Access — Limited Spots
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-5">
              Stop juggling dashboards.
              <br />
              <span className="text-primary">Start monitoring.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Uptime, SaaS licences, SSL certificates, cloud costs — moniduck watches everything from one screen. Join 200+ ops teams on the waitlist.
            </p>

            {/* Social proof pills */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success" />Free during beta</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success" />2-minute setup</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success" />No credit card</span>
            </div>

            {/* Form */}
            <div id="waitlist-form" className="max-w-md scroll-mt-24">
              {submitted ? <SuccessCard /> : (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Get early access</span>
                  </div>
                  <WaitlistForm onSuccess={handleSuccess} />
                </div>
              )}
            </div>
          </div>

          {/* Right — Product screenshot */}
          <div className="hidden lg:block relative">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
              <img
                src={dashboardPreview}
                alt="moniduck dashboard — services monitoring view"
                className="w-full h-auto"
                loading="eager"
              />
            </div>
            {/* Decorative glow */}
            <div className="absolute -inset-4 bg-primary/5 rounded-2xl -z-10 blur-2xl" />
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────── */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              How It <span className="text-primary">Works</span>
            </h2>
            <p className="text-muted-foreground text-lg">From zero to full visibility in 3 steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="relative">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-4">
                  {s.num}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ───────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything in <span className="text-primary">one place</span>
            </h2>
            <p className="text-muted-foreground text-lg">No more tab-switching. No more surprises.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why moniduck (benefits) ─────────────── */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Why teams choose <span className="text-primary">moniduck</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            {benefits.map((b) => (
              <div key={b.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
            Questions?
          </h2>
          <div>
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────── */}
      <section className="border-t border-border bg-card/40">
        <div className="max-w-3xl mx-auto px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to simplify your ops?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Join the waitlist and be among the first to try moniduck. Free during beta, no credit card required.
          </p>
          {submitted ? <SuccessCard /> : (
            <WaitlistForm onSuccess={handleSuccess} variant="compact" />
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground mt-6">
            <span>Free during beta</span>
            <span>·</span>
            <span>No credit card</span>
            <span>·</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={duckLogo} alt="moniduck" className="w-6 h-6" />
            <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} moniduck</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
