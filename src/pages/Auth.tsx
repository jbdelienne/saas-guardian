import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useLangPrefix } from "@/hooks/use-lang-prefix";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import duckLogo from "@/assets/moniduck-logo.png";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const lp = useLangPrefix();

  if (loading) return null;
  if (user) return <Navigate to={`${lp}/dashboard`} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = isSignUp ? await signUp(email, password, displayName) : await signIn(email, password);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (isSignUp) {
      toast({ title: t("auth.checkEmail"), description: t("auth.confirmationSent") });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/3 bg-card border-r border-border flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <img src={duckLogo} alt="moniduck" className="w-10 h-10" />
            <span className="text-lg font-semibold text-foreground tracking-tight">moniduck</span>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-semibold text-foreground tracking-tight leading-tight whitespace-pre-line">
            {t("auth.brandTagline")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            {t("auth.brandDescription")}
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground font-mono uppercase tracking-widest">
            <span>Uptime</span>
            <span className="text-border">·</span>
            <span>{t("sidebar.integrations")}</span>
            <span className="text-border">·</span>
            <span>{t("sidebar.alerts")}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60 font-mono">
          © {new Date().getFullYear()} moniduck
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo + language */}
          <div className="flex items-center justify-between mb-4">
            <div className="lg:hidden flex items-center gap-3">
              <img src={duckLogo} alt="moniduck" className="w-10 h-10" />
              <span className="text-lg font-semibold text-foreground tracking-tight">moniduck</span>
            </div>
            <LanguageSwitcher variant="outline" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {isSignUp ? t("auth.createAccount") : t("auth.welcomeBack")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? t("auth.getStarted") : t("auth.signInToAccount")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("auth.displayName")}
                </Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.yourName")}
                  className="h-10 bg-card border-border"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("auth.email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-10 bg-card border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("auth.password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-10 bg-card border-border"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {submitting ? t("auth.loading") : isSignUp ? t("auth.createAccountBtn") : t("auth.signInBtn")}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-medium hover:underline">
              {isSignUp ? t("auth.signInBtn") : t("auth.signUp")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
