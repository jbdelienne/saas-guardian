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

export default function Landing() {
  const { t } = useTranslation();
  const lp = useLangPrefix();

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
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
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
            <Button size="lg" className="text-base px-8" asChild>
              <Link to={`${lp}/auth`}>
                {t("landing.startMonitoring")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <a href="#solutions">How it works</a>
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
            <p><span className="text-success">✓</span> api.production <span className="text-muted-foreground/60">— 200 OK · 42ms</span></p>
            <p><span className="text-success">✓</span> auth.production <span className="text-muted-foreground/60">— 200 OK · 38ms</span></p>
            <p><span className="text-warning">⚠</span> cdn.staging <span className="text-muted-foreground/60">— degraded · 380ms</span></p>
            <p><span className="text-success">✓</span> AWS us-east-1 <span className="text-muted-foreground/60">— 12 services healthy</span></p>
            <p><span className="text-success">✓</span> Google Workspace <span className="text-muted-foreground/60">— 142 users · 68% storage</span></p>
            <p><span className="text-success">✓</span> Stripe <span className="text-muted-foreground/60">— webhooks healthy · $48.2k MRR</span></p>
            <p className="text-primary">→ 6 sources connected · 1 warning · 0 critical</p>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────── */}
      <section id="solutions" className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
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
              <div key={step.number} className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center`}>
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
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
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
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t("landing.pricingTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.pricingSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {planKeys.map((planKey) => {
              const isPopular = planKey === "startup";
              const highlights = t(`pricing.${planKey}.highlights`, { returnObjects: true, defaultValue: [] }) as string[];
              const excluded = t(`pricing.${planKey}.integrations.excluded`, { returnObjects: true, defaultValue: [] }) as string[];
              const badge = t(`pricing.${planKey}.badge`, { defaultValue: "" });

              return (
                <div
                  key={planKey}
                  className={`rounded-xl border p-5 flex flex-col relative ${
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
                  <div className="mt-3 mb-1">
                    <span className="text-4xl font-bold">
                      {t(`pricing.${planKey}.price`)}
                      {planKey !== "enterprise" && "€"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">{t(`pricing.${planKey}.priceLabel`)}</p>

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
          <div className="max-w-3xl mx-auto mt-20 md:mt-28">
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
