import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import duckLogo from "@/assets/moniduck-logo.png";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = isSignUp ? await signUp(email, password, displayName) : await signIn(email, password);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (isSignUp) {
      toast({ title: "Check your email", description: "We sent you a confirmation link." });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/3 bg-card border-r border-border flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <img src={duckLogo} alt="MoniDuck" className="w-10 h-10" />
            <span className="text-lg font-semibold text-foreground tracking-tight">MoniDuck</span>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-semibold text-foreground tracking-tight leading-tight">
            Infrastructure monitoring,<br />simplified.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            Monitor your SaaS stack, track uptime, and get alerted before your users notice anything.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground font-mono uppercase tracking-widest">
            <span>Uptime</span>
            <span className="text-border">·</span>
            <span>Integrations</span>
            <span className="text-border">·</span>
            <span>Alerts</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60 font-mono">
          © {new Date().getFullYear()} MoniDuck
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <img src={duckLogo} alt="MoniDuck" className="w-10 h-10" />
            <span className="text-lg font-semibold text-foreground tracking-tight">MoniDuck</span>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? "Get started with MoniDuck" : "Sign in to your account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Display name
                </Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-10 bg-card border-border"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
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
                Password
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
              {submitting ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-medium hover:underline">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
