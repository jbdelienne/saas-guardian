import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowRight, Check, Activity, Globe, CreditCard, ShieldCheck, Tv, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import duckLogo from "@/assets/moniduck-logo.png";

const features = [
  { icon: Activity, title: "Real-time endpoint monitoring", desc: "Know before your users do." },
  { icon: Search, title: "AWS auto-discovery", desc: "Connect once. We find everything in 2 minutes." },
  { icon: Globe, title: "Google Workspace & Microsoft 365", desc: "Unused licences, full storage, missing 2FA. We catch it all." },
  { icon: CreditCard, title: "Stripe monitoring", desc: "Webhooks down, disputes pending, payout failed. Instant alerts." },
  { icon: ShieldCheck, title: "SSL certificate alerts", desc: "Never wake up to a broken padlock again." },
  { icon: Tv, title: "TV Mode", desc: "One click. Full screen. Your infra on the wall." },
];

/* ── Confetti ─────────────────────────────────────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
}

const CONFETTI_COLORS = [
  "hsl(161, 93%, 30%)",  // primary
  "hsl(38, 92%, 50%)",   // warning / gold
  "hsl(217, 91%, 60%)",  // info / blue
  "hsl(160, 84%, 39%)",  // success
  "hsl(280, 70%, 55%)",  // purple
  "hsl(350, 80%, 55%)",  // pink
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

    // spawn particles from center-top
    const cx = canvas.width / 2;
    for (let i = 0; i < 120; i++) {
      particles.current.push({
        x: cx + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 16 - 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        life: 1,
      });
    }

    const animate = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current = particles.current.filter((p) => p.life > 0);

      for (const p of particles.current) {
        p.x += p.vx;
        p.vy += 0.35; // gravity
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life -= 0.012;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (particles.current.length > 0) {
        raf.current = requestAnimationFrame(animate);
      }
    };

    if (raf.current) cancelAnimationFrame(raf.current);
    animate();
  }, []);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  return { canvasRef, fire };
}

/* ── Component ────────────────────────────────────── */

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { canvasRef, fire } = useConfetti();

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
          fire();
        } else {
          throw error;
        }
      } else {
        try {
          await supabase.functions.invoke("waitlist-welcome", {
            body: { email: email.trim().toLowerCase(), company: company.trim() || null },
          });
        } catch {
          // Email is best-effort
        }
        toast.success("You're on the list! 🎉");
        setSubmitted(true);
        fire();
      }
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[100] pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

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
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            Early Access — Limited Spots
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            All your IT assets,
            <br />
            <span className="text-primary">one dashboard.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
            moniduck centralizes uptime monitoring, SaaS integrations, and security checks into a single pane of glass. Join the waitlist to get early access.
          </p>

          {/* Waitlist Form — centered card */}
          <div className="max-w-md mx-auto">
            {submitted ? (
              <div className="rounded-2xl border border-success/30 bg-success/5 p-8 animate-scale-in">
                <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-success" />
                </div>
                <p className="text-xl font-semibold mb-1">You're on the list!</p>
                <p className="text-sm text-muted-foreground">We'll reach out when your spot is ready.</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-lg space-y-4 text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Get early access</span>
                </div>
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
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base"
                  disabled={loading}
                >
                  {loading ? "Joining..." : "Join the Waitlist"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  No spam, ever. We'll only email you when it's ready.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Terminal preview */}
        <div className="mt-16 md:mt-20 rounded-xl border border-border bg-card overflow-hidden shadow-lg max-w-4xl mx-auto">
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
