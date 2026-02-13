import { Link } from "react-router-dom";
import { Activity, Bell, BarChart3, Plug, Shield, Zap, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import duckLogo from "@/assets/moniduck-logo.png";

const features = [
  {
    icon: Activity,
    title: "Uptime Monitoring",
    description:
      "HTTP health checks on all your services with configurable intervals and instant alerts when things go down.",
  },
  {
    icon: Plug,
    title: "SaaS Integrations",
    description: "Connect Google Workspace, Slack, and more. Pull real-time metrics into a single operational view.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Threshold-based alerting with severity levels. Get notified before your users notice anything.",
  },
  {
    icon: BarChart3,
    title: "Custom Dashboards",
    description:
      "Drag-and-drop widgets. Build the exact view your ops team needs — response times, storage, uptime charts.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Row-level security, encrypted tokens, and scoped access. Your data stays yours.",
  },
  {
    icon: Zap,
    title: "Fast & Lightweight",
    description: "Sub-second dashboard loads. No bloated agents to install. Just add your URLs and connect your tools.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "0",
    period: "/month",
    description: "For small teams getting started",
    features: ["5 services monitored", "1 dashboard", "2 integrations", "Email alerts", "5-min check interval"],
    cta: "Get started free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "29",
    period: "/month",
    description: "For growing teams who need visibility",
    features: [
      "25 services monitored",
      "Unlimited dashboards",
      "10 integrations",
      "Slack + Email alerts",
      "1-min check interval",
      "Custom thresholds",
      "TV mode",
    ],
    cta: "Start 14-day trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "79",
    period: "/month",
    description: "For ops teams at scale",
    features: [
      "Unlimited services",
      "Unlimited dashboards",
      "Unlimited integrations",
      "All alert channels",
      "30-sec check interval",
      "Priority support",
      "SSO & team roles",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={duckLogo} alt="MoniDuck" className="w-16 h-16" />
            <span className="font-semibold text-4xl tracking-tight">MoniDuck</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            All systems operational
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Monitor your modern stack in
            <span className="text-primary"> one place.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
            Uptime checks, integration health, license tracking and operational dashboards — built for IT/Ops teams at
            scaling companies.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="text-base px-8" asChild>
              <Link to="/auth">
                Start monitoring
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <a href="#features">See how it works</a>
            </Button>
          </div>
        </div>

        {/* Terminal-style preview */}
        <div className="mt-16 md:mt-20 rounded-xl border border-border bg-card overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
            <span className="ml-3 text-xs font-mono text-muted-foreground">dashboard — moniduck</span>
          </div>
          <div className="p-6 md:p-8 font-mono text-sm text-muted-foreground space-y-2">
            <p>
              <span className="text-success">✓</span> api.production{" "}
              <span className="text-muted-foreground/60">— 99.98% uptime — 142ms avg</span>
            </p>
            <p>
              <span className="text-success">✓</span> auth.production{" "}
              <span className="text-muted-foreground/60">— 99.99% uptime — 89ms avg</span>
            </p>
            <p>
              <span className="text-warning">⚠</span> cdn.staging{" "}
              <span className="text-muted-foreground/60">— 98.2% uptime — 340ms avg — degraded</span>
            </p>
            <p>
              <span className="text-success">✓</span> google-workspace{" "}
              <span className="text-muted-foreground/60">— synced 2m ago — 48/50 licenses</span>
            </p>
            <p>
              <span className="text-success">✓</span> slack-workspace{" "}
              <span className="text-muted-foreground/60">— synced 5m ago — all channels healthy</span>
            </p>
            <p className="text-primary">→ 4 services up · 1 degraded · 0 down</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything ops teams need</h2>
            <p className="text-muted-foreground text-lg">
              No bloat, no complexity. Just the tools you need to keep your stack healthy.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing.</h2>
            <p className="text-muted-foreground text-lg">Start free. Scale as your team grows.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-primary bg-primary/5 shadow-lg ring-1 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && <span className="text-xs font-medium text-primary mb-3">Most popular</span>}
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.highlighted ? "default" : "outline"} className="w-full" asChild>
                  <Link to="/auth">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={duckLogo} alt="MoniDuck" className="w-6 h-6" />
            <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} MoniDuck</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
