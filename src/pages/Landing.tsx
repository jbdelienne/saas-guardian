import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Check, X, Sparkles,
  Zap, Clock,
  Globe, Cloud, Monitor, Layers, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useLangPrefix } from "@/hooks/use-lang-prefix";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import duckLogo from "@/assets/moniduck-logo.png";
import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";

/* ── Solutions ────────────────────────────────────── */

const steps = [
  {
    number: "①",
    icon: Cloud,
    title: "Connect your cloud",
    description: "AWS auto-discovery. Every service, every resource, automatically.",
    visual: {
      lines: [
        { status: "success", label: "EC2 us-east-1", detail: "14 instances discovered" },
        { status: "success", label: "Lambda", detail: "23 functions · all healthy" },
        { status: "success", label: "RDS", detail: "3 clusters · 99.99% uptime" },
        { status: "success", label: "S3", detail: "47 buckets synced" },
        { status: "info", label: "Auto-discovery", detail: "complete · 87 resources" },
      ],
    },
  },
  {
    number: "②",
    icon: Globe,
    title: "Monitor your services",
    description: "Add any URL. We check uptime, response time, and SSL expiry around the clock.",
    visual: {
      lines: [
        { status: "success", label: "api.production", detail: "200 OK · 42ms" },
        { status: "success", label: "auth.production", detail: "200 OK · 38ms" },
        { status: "warning", label: "cdn.staging", detail: "degraded · 380ms" },
        { status: "success", label: "SSL api.prod", detail: "valid · 247 days left" },
        { status: "success", label: "Uptime (30d)", detail: "99.97%" },
      ],
    },
  },
  {
    number: "③",
    icon: Monitor,
    title: "Stay informed",
    description: "Custom dashboards, automated reports, and alerts when something needs attention.",
    visual: {
      lines: [
        { status: "success", label: "Dashboard", detail: "6 widgets · TV mode ready" },
        { status: "info", label: "Weekly report", detail: "sent to 3 admins" },
        { status: "warning", label: "Alert", detail: "cdn.staging > 300ms" },
        { status: "success", label: "Uptime SLA", detail: "report exported" },
        { status: "success", label: "Slack", detail: "notifications active" },
      ],
    },
  },
];

const statusColorMap: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

const statusDotMap: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
};

const planKeys = ["free", "startup", "scaleup", "enterprise"] as const;
const sectionKeys = ["services", "integrations", "dashboards", "alerting", "team", "support"] as const;

const annualPrices: Record<string, number> = {
  startup: 79,
  scaleup: 159,
};

/* ── Terminal typing effect ─────────────────────── */

const terminalLines = [
  { icon: "✓", color: "text-success", text: "api.production", detail: "— 200 OK · 42ms" },
  { icon: "✓", color: "text-success", text: "auth.production", detail: "— 200 OK · 38ms" },
  { icon: "⚠", color: "text-warning", text: "cdn.staging", detail: "— degraded · 380ms" },
  { icon: "✓", color: "text-success", text: "AWS us-east-1", detail: "— 12 services healthy" },
  { icon: "✓", color: "text-success", text: "Google Workspace", detail: "— 142 users · 68% storage" },
  { icon: "✓", color: "text-success", text: "Stripe", detail: "— webhooks healthy · $48.2k MRR" },
];

function TerminalTyping() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          let i = 0;
          const interval = setInterval(() => {
            i++;
            if (i <= terminalLines.length) {
              setVisibleLines(i);
            } else {
              setShowSummary(true);
              clearInterval(interval);
            }
          }, 400);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="p-6 md:p-8 font-mono text-sm text-muted-foreground space-y-2">
      {terminalLines.map((line, i) => (
        <p
          key={i}
          className={`transition-all duration-300 ${
            i < visibleLines ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <span className={line.color}>{line.icon}</span>{" "}
          {line.text}{" "}
          <span className="text-muted-foreground/60">{line.detail}</span>
        </p>
      ))}
      <p
        className={`text-primary transition-all duration-500 ${
          showSummary ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        → 6 sources connected · 1 warning · 0 critical
      </p>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const lp = useLangPrefix();
  const [isAnnual, setIsAnnual] = useState(false);

  // Scroll reveal refs
  const heroRef = useScrollReveal({ delay: 100 });
  const terminalRef = useScrollReveal({ delay: 300 });
  const howItWorksHeaderRef = useScrollReveal();
  const pricingHeaderRef = useScrollReveal();
  const faqRef = useScrollReveal();
  const pricingGridRef = useStaggerReveal(planKeys.length, 120);

  const stepRefs = [
    useScrollReveal({ delay: 0 }),
    useScrollReveal({ delay: 0 }),
    useScrollReveal({ delay: 0 }),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={duckLogo} alt="moniduck" className="w-16 h-16" />
            <span className="font-semibold text-4xl tracking-tight">moniduck</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#solutions" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link to={`${lp}/auth`}>{t("nav.signIn")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={`${lp}/auth`}>{t("nav.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div ref={heroRef} className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {t("landing.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            One platform to monitor
            <br />
            <span className="text-primary">your entire tech stack.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            From HTTP endpoints to cloud providers and SaaS tools — moniduck gives your team
            full visibility, cost intelligence, and security posture in a single dashboard.
          </p>

          {/* Differentiators */}
          <div className="flex flex-wrap gap-5 mb-10">
            {[
              { icon: Shield, text: "No agents" },
              { icon: Layers, text: "No YAML" },
              { icon: Clock, text: "2-min setup" },
            ].map((d) => (
              <div key={d.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <d.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span>{d.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="text-base px-8 group" asChild>
              <Link to={`${lp}/auth`}>
                {t("landing.startMonitoring")}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <a href="#solutions">How it works</a>
            </Button>
          </div>
        </div>

        {/* Terminal-style preview */}
        <div ref={terminalRef} className="mt-16 md:mt-20 rounded-xl border border-border bg-card overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
            <span className="ml-3 text-xs font-mono text-muted-foreground">dashboard — moniduck</span>
          </div>
          <TerminalTyping />
        </div>
      </section>

      {/* ── How it works ────────────────────────────── */}
      <section id="solutions" className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div ref={howItWorksHeaderRef} className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3 tracking-wide uppercase">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Up and running <span className="text-primary">in minutes.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three steps to full visibility over your tech stack.
            </p>
          </div>

          <div className="space-y-20 md:space-y-28">
            {steps.map((step, i) => (
              <div ref={stepRefs[i]} key={step.number} className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center`}>
                {/* Text */}
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-3xl font-bold text-primary">{step.number}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">{step.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{step.description}</p>
                </div>

                {/* Visual */}
                <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-500">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">{step.title.toLowerCase()}</span>
                    </div>
                    <div className="p-5 font-mono text-xs space-y-2.5">
                      {step.visual.lines.map((line, j) => (
                        <div key={j} className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${statusDotMap[line.status]}`} />
                          <span className="text-foreground font-medium">{line.label}</span>
                          <span className="text-muted-foreground ml-auto text-right">{line.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div ref={pricingHeaderRef} className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t("landing.pricingTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.pricingSubtitle")}</p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-16">
            <span className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              {t("pricing.monthly", { defaultValue: "Monthly" })}
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isAnnual ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${isAnnual ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              {t("pricing.annual", { defaultValue: "Annual" })}
            </span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-success/15 text-success text-xs font-semibold">
              -20%
            </span>
          </div>

          <div ref={pricingGridRef} className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {planKeys.map((planKey) => {
              const isPopular = planKey === "startup";
              const highlights = t(`pricing.${planKey}.highlights`, { returnObjects: true, defaultValue: [] }) as string[];
              const excluded = t(`pricing.${planKey}.integrations.excluded`, { returnObjects: true, defaultValue: [] }) as string[];
              const badge = t(`pricing.${planKey}.badge`, { defaultValue: "" });
              const monthlyPrice = t(`pricing.${planKey}.price`);
              const hasAnnual = planKey in annualPrices;
              const displayPrice = isAnnual && hasAnnual ? annualPrices[planKey] : monthlyPrice;

              return (
                <div
                  key={planKey}
                  className={`rounded-xl border p-5 flex flex-col relative hover:scale-[1.02] transition-transform duration-300 ${
                    isPopular
                      ? "border-primary bg-primary/5 shadow-lg ring-1 ring-primary/20"
                      : "border-border bg-card"
                  }`}
                >
                  {badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {badge}
                    </span>
                  )}
                  <h3 className="font-semibold text-lg mt-1">{t(`pricing.${planKey}.name`)}</h3>
                  <div className="mt-3 mb-1 flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      {displayPrice}
                      {planKey !== "enterprise" && "€"}
                    </span>
                    {isAnnual && hasAnnual && (
                      <span className="text-base text-muted-foreground line-through">
                        {monthlyPrice}€
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    {isAnnual && hasAnnual
                      ? t("pricing.perMonthBilledAnnually", { defaultValue: "/mo, billed annually" })
                      : t(`pricing.${planKey}.priceLabel`)}
                  </p>

                  {Array.isArray(highlights) && highlights.length > 0 && (
                    <div className="mb-4 space-y-1.5">
                      {highlights.map((h) => (
                        <div key={h} className="flex items-center gap-2 text-xs font-medium text-primary">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    {sectionKeys.map((section) => {
                      const items = t(`pricing.${planKey}.${section}.items`, { returnObjects: true, defaultValue: [] }) as string[];
                      const sectionTitle = t(`pricing.${planKey}.${section}.title`, { defaultValue: section.toUpperCase() });
                      return (
                        <div key={section}>
                          <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5">{sectionTitle}</p>
                          <ul className="space-y-1">
                            {items.map((item) => (
                              <li key={item} className="flex items-start gap-2 text-sm">
                                <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                            {section === "integrations" && excluded.length > 0 &&
                              excluded.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <X className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  <Button variant={isPopular ? "default" : "outline"} className="w-full mt-6" asChild>
                    <Link to={planKey === "enterprise" ? "#" : `${lp}/auth`}>
                      {t(`pricing.${planKey}.cta`)}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div ref={faqRef} className="max-w-3xl mx-auto mt-20 md:mt-28">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-10">
              {t("pricing.faq.title")}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {(t("pricing.faq.items", { returnObjects: true }) as Array<{ q: string; a: string }>).map(
                (item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </AccordionItem>
                )
              )}
            </Accordion>
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
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#solutions" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
            <Link to={`${lp}/auth`} className="hover:text-foreground transition-colors">{t("nav.signIn")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
