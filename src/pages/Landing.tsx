import { Link } from "react-router-dom";
import { Activity, Bell, BarChart3, Plug, Shield, Zap, Check, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useLangPrefix } from "@/hooks/use-lang-prefix";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import duckLogo from "@/assets/moniduck-logo.png";

const featureKeys = [
  { key: "uptime", icon: Activity },
  { key: "integrations", icon: Plug },
  { key: "alerts", icon: Bell },
  { key: "dashboards", icon: BarChart3 },
  { key: "security", icon: Shield },
  { key: "fast", icon: Zap },
];

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
            <img src={duckLogo} alt="MoniDuck" className="w-16 h-16" />
            <span className="font-semibold text-4xl tracking-tight">MoniDuck</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              {t("nav.features")}
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              {t("nav.pricing")}
            </a>
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
            {t("landing.heroTitle")}
            <br />
            <span className="text-primary">{t("landing.heroHighlight")}</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="text-base px-8" asChild>
              <Link to={`${lp}/auth`}>
                {t("landing.startMonitoring")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <a href="#features">{t("landing.seeHow")}</a>
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
              <span className="text-muted-foreground/60">— {t("landing.terminal.line1status")}</span>
            </p>
            <p>
              <span className="text-success">✓</span> auth.production{" "}
              <span className="text-muted-foreground/60">— {t("landing.terminal.line2status")}</span>
            </p>
            <p>
              <span className="text-warning">⚠</span> cdn.staging{" "}
              <span className="text-muted-foreground/60">— {t("landing.terminal.line3status")}</span>
            </p>
            <p>
              <span className="text-success">✓</span> google-workspace{" "}
              <span className="text-muted-foreground/60">— {t("landing.terminal.line4status")}</span>
            </p>
            <p>
              <span className="text-success">✓</span> slack-workspace{" "}
              <span className="text-muted-foreground/60">— {t("landing.terminal.line5status")}</span>
            </p>
            <p className="text-primary">→ {t("landing.terminal.summary")}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t("landing.featuresTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.featuresSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureKeys.map((f) => (
              <div key={f.key} className="group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{t(`features.${f.key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`features.${f.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border">
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

                  {/* Header */}
                  <h3 className="font-semibold text-lg mt-1">{t(`pricing.${planKey}.name`)}</h3>
                  <div className="mt-3 mb-1">
                    <span className="text-4xl font-bold">
                      {t(`pricing.${planKey}.price`)}
                      {planKey !== "enterprise" && "€"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">{t(`pricing.${planKey}.priceLabel`)}</p>

                  {/* Highlights */}
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

                  {/* Sections */}
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

                  {/* CTA */}
                  <Button
                    variant={isPopular ? "default" : "outline"}
                    className="w-full mt-6"
                    asChild
                  >
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
            <img src={duckLogo} alt="MoniDuck" className="w-6 h-6" />
            <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} MoniDuck</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              {t("nav.features")}
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              {t("nav.pricing")}
            </a>
            <Link to={`${lp}/auth`} className="hover:text-foreground transition-colors">
              {t("nav.signIn")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
