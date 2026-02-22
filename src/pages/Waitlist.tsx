import { useState, useCallback, useEffect, useRef } from "react";
import {
  ArrowRight, Check, ChevronDown, Copy, Linkedin,
  Sparkles, Zap, Cloud, Rocket, Plug, CreditCard, Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import duckLogo from "@/assets/moniduck-logo.png";

/* ── Data ─────────────────────────────────────────── */

const features = [
  { icon: Zap, text: "Add any URL — we monitor uptime, response time, and SSL" },
  { icon: Cloud, text: "Connect AWS, GCP or Azure — we auto-discover your entire infrastructure" },
  { icon: Rocket, text: "Connect Vercel, Railway or Render — deployments, errors, quotas" },
  { icon: Plug, text: "Connect Google Workspace or Microsoft 365 — licences, storage, security gaps" },
  { icon: CreditCard, text: "Connect Stripe — webhooks, disputes, payouts. Silently broken, instantly caught." },
  { icon: Tv, text: "TV Mode — one click, full screen, your entire stack on the wall" },
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
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-5" : "max-h-0"}`}>
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ── Waitlist Form ────────────────────────────────── */
function WaitlistForm({
  onSuccess,
  onEmailCapture,
  variant = "default",
}: {
  onSuccess: () => void;
  onEmailCapture?: (email: string) => void;
  variant?: "default" | "compact";
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    onEmailCapture?.(email.trim().toLowerCase());
    try {
      const { error } = await supabase.from("waitlist_signups").insert({
        email: email.trim().toLowerCase(),
        company: company.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          onSuccess();
        } else throw error;
      } else {
        try {
          await supabase.functions.invoke("waitlist-welcome", {
            body: { email: email.trim().toLowerCase(), company: company.trim() || null },
          });
        } catch { /* best-effort */ }
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
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Joining...
            </span>
          ) : (
            <>Join the waitlist <ArrowRight className="w-4 h-4 ml-1" /></>
          )}
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
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Joining...
          </span>
        ) : (
          <>Join the waitlist <ArrowRight className="w-4 h-4 ml-1" /></>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        🦆 Join 200+ tech teams already waiting
      </p>
    </form>
  );
}

/* ── Success state ────────────────────────────────── */
function SuccessCard({ email }: { email: string }) {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const shareOnLinkedIn = () => {
    const text = encodeURIComponent("Just joined the @moniduck waitlist — monitoring for modern tech stacks. Check it out 👇");
    const url = encodeURIComponent(pageUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, "_blank");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    toast.success("Link copied!");
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-8 animate-scale-in text-center">
      <div className="text-5xl mb-4 animate-bounce">🦆</div>
      <p className="text-xl font-semibold mb-2">You're on the list!</p>
      <p className="text-sm text-muted-foreground mb-6">
        Confirmation sent to <span className="font-medium text-foreground">{email}</span>
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={shareOnLinkedIn} className="gap-2">
          <Linkedin className="w-4 h-4" /> Share on LinkedIn
        </Button>
        <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
          <Copy className="w-4 h-4" /> Copy link
        </Button>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────── */

export default function Waitlist() {
  const [submitted, setSubmitted] = useState(false);
  const [capturedEmail, setCapturedEmail] = useState("");
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
          {/* Left — Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Early Access — Limited Spots
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-5">
              Monitoring for
              <br />
              <span className="text-primary">modern tech stacks.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
              Connect your cloud providers, SaaS tools, and services.
              <br className="hidden sm:block" />
              Everything shows up on one dashboard. Automatically.
            </p>

            {/* Feature pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {features.map((f) => (
                <div key={f.text} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5 group-hover:bg-primary/15 transition-colors">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{f.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Form */}
          <div id="waitlist-form" className="scroll-mt-24">
            {submitted ? <SuccessCard email={capturedEmail} /> : (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Get early access</span>
                </div>
                <WaitlistForm onSuccess={handleSuccess} onEmailCapture={setCapturedEmail} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Tagline ─────────────────────────────── */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
          <p className="text-2xl md:text-3xl font-bold tracking-tight">
            One platform. Your entire stack. <span className="text-primary">No agents.</span>
          </p>
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Early access. <span className="text-primary">Free to start.</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Join the waitlist and be among the first to try moniduck. No credit card required.
          </p>
          {submitted ? <SuccessCard email={capturedEmail} /> : (
            <WaitlistForm onSuccess={handleSuccess} onEmailCapture={setCapturedEmail} variant="compact" />
          )}
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
