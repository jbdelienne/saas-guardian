import { Link } from "react-router-dom";
import {
  ArrowRight, Check, X, Sparkles,
  Eye, TrendingDown, ShieldCheck, FileCheck, Zap, Clock,
  Globe, Cloud, Plug, Server, Monitor, CreditCard, Tv, Layers, Shield, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useLangPrefix } from "@/hooks/use-lang-prefix";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import duckLogo from "@/assets/moniduck-logo.png";

/* ── Solutions ────────────────────────────────────── */

const solutions = [
  {
    id: "visibility",
    icon: Eye,
    title: "Full-Stack Visibility",
    headline: "See everything. Miss nothing.",
    description:
      "Get a real-time, unified view of your entire tech stack — endpoints, cloud resources, and SaaS tools — from a single composable dashboard. No more tab-switching between 5 consoles.",
    capabilities: [
      "HTTP uptime, response times & SSL certificates",
      "Auto-discovery of AWS, GCP & Azure resources",
      "Google Workspace & Microsoft 365 health metrics",
      "Composable dashboards with TV Mode for war rooms",
    ],
    visual: {
      lines: [
        { status: "success", label: "api.production", detail: "200 OK · 42ms" },
        { status: "success", label: "auth.production", detail: "200 OK · 38ms" },
        { status: "warning", label: "cdn.staging", detail: "degraded · 380ms" },
        { status: "success", label: "AWS us-east-1", detail: "12 services · all healthy" },
        { status: "success", label: "Google Workspace", detail: "142 users · 68% storage" },
      ],
    },
  },
  {
    id: "cost",
    icon: TrendingDown,
    title: "Cost Intelligence",
    headline: "Stop overspending on cloud.",
    description:
      "Surface billing anomalies, unused resources, and SaaS license waste before they hit your budget. moniduck aggregates cost data across AWS, GCP, Azure, Stripe, and more — automatically.",
    capabilities: [
      "30-day cloud spend breakdown by service",
      "Unused EC2, Lambda & RDS detection",
      "SaaS license usage vs. allocation",
      "Custom alerts on cost thresholds",
    ],
    visual: {
      lines: [
        { status: "info", label: "AWS Cost (30d)", detail: "$2,847.32 · ↓12% vs last month" },
        { status: "warning", label: "3 unused EC2", detail: "t3.medium · stopped > 14 days" },
        { status: "success", label: "Lambda spend", detail: "$12.40 · 847K invocations" },
        { status: "warning", label: "GWS licenses", detail: "142/200 used · 29% waste" },
        { status: "info", label: "Stripe MRR", detail: "$48,200 · 0 disputes" },
      ],
    },
  },
  {
    id: "security",
    icon: ShieldCheck,
    title: "Security Posture",
    headline: "Spot blind spots before attackers do.",
    description:
      "Monitor SSL expirations, MFA adoption, suspended accounts, and public exposure across your stack. Get proactive alerts instead of post-mortems.",
    capabilities: [
      "SSL certificate expiry tracking & alerts",
      "MFA adoption rates across SaaS tools",
      "Suspended & inactive user detection",
      "Cloud security group & public exposure monitoring",
    ],
    visual: {
      lines: [
        { status: "warning", label: "SSL api.prod", detail: "expires in 12 days" },
        { status: "destructive", label: "MFA coverage", detail: "72% — 8 users without MFA" },
        { status: "warning", label: "3 suspended", detail: "Google Workspace accounts" },
        { status: "success", label: "AWS IAM", detail: "no root access detected" },
        { status: "success", label: "RDS public", detail: "0 publicly accessible instances" },
      ],
    },
  },
  {
    id: "compliance",
    icon: FileCheck,
    title: "Operational Compliance",
    headline: "Prove uptime. Report effortlessly.",
    description:
      "Generate SLA reports, track uptime percentages over any period, and export data for audits. Perfect for teams with contractual SLA obligations or ISO compliance needs.",
    capabilities: [
      "Uptime SLA reports (24h, 7d, 30d, 12mo)",
      "Response time & incident history exports (CSV/JSON)",
      "Per-service & per-integration audit trails",
      "Workspace-level access control & role management",
    ],
    visual: {
      lines: [
        { status: "success", label: "api.production", detail: "99.97% uptime (30d)" },
        { status: "success", label: "auth.production", detail: "99.99% uptime (30d)" },
        { status: "info", label: "SLA report", detail: "exported · 2,847 checks" },
        { status: "success", label: "Audit trail", detail: "all changes logged" },
        { status: "info", label: "RBAC", detail: "3 admins · 8 members" },
      ],
    },
  },
];

/* ── Products ─────────────────────────────────────── */

const products = [
  {
    icon: Globe,
    title: "HTTP Monitoring",
    description: "Add any URL. Get uptime, response time, SSL tracking, and content validation — with checks every 1 to 5 minutes.",
  },
  {
    icon: Cloud,
    title: "Cloud & PaaS Discovery",
    description: "Connect your AWS, GCP, or Azure account. moniduck auto-discovers EC2, Lambda, RDS, S3 and more — no agents needed.",
  },
  {
    icon: Plug,
    title: "SaaS Integrations",
    description: "Pull health metrics from Google Workspace, Microsoft 365, Stripe, GitHub and others. One OAuth flow, real-time data.",
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
            <a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a>
            <a href="#products" className="hover:text-foreground transition-colors">Products</a>
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
              <a href="#solutions">See solutions</a>
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

      {/* ── Solutions ────────────────────────────────── */}
      <section id="solutions" className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3 tracking-wide uppercase">Solutions</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for how <span className="text-primary">teams actually work.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              moniduck solves real operational problems — not just pings. Choose the use case that matters most to your team.
            </p>
          </div>

          <div className="space-y-20 md:space-y-28">
            {solutions.map((sol, i) => (
              <div key={sol.id} className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${i % 2 === 1 ? "lg:direction-rtl" : ""}`}>
                {/* Text */}
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <sol.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-primary tracking-wider uppercase mb-2">{sol.title}</p>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">{sol.headline}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">{sol.description}</p>
                  <ul className="space-y-2.5">
                    {sol.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual */}
                <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">{sol.title.toLowerCase()}</span>
                    </div>
                    <div className="p-5 font-mono text-xs space-y-2.5">
                      {sol.visual.lines.map((line, j) => (
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

      {/* ── Products ─────────────────────────────────── */}
      <section id="products" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3 tracking-wide uppercase">Products</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Three engines. <span className="text-primary">One platform.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Each product works standalone or together — feeding the same dashboards, alerts, and reports.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.title}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <product.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{product.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
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
            <a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a>
            <a href="#products" className="hover:text-foreground transition-colors">Products</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
            <Link to={`${lp}/auth`} className="hover:text-foreground transition-colors">{t("nav.signIn")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
