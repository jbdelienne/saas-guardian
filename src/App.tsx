import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import '@/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import AppLayout from "@/components/layout/AppLayout";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import ServicesPage from "@/pages/ServicesPage";
import CloudResourcesPage from "@/pages/CloudResourcesPage";
import Integrations from "@/pages/Integrations";
import IntegrationDetail from "@/pages/IntegrationDetail";
import Alerts from "@/pages/Alerts";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import Waitlist from "@/pages/Waitlist";
import ReportsPage from "@/pages/ReportsPage";
import AwsCostDashboard from "@/pages/AwsCostDashboard";
import AwsIntegrationDetail from "@/pages/AwsIntegrationDetail";
import PublicReport from "@/pages/PublicReport";
import SaasStatusPage from "@/pages/SaasStatusPage";

const queryClient = new QueryClient();

const SUPPORTED_LANGS = ['en', 'fr', 'de'];

function LanguageWrapper({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang && SUPPORTED_LANGS.includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { lang } = useParams<{ lang: string }>();
  if (loading) return null;
  if (!user) return <Navigate to={`/${lang || 'en'}/auth`} replace />;
  return <>{children}</>;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const { lang } = useParams<{ lang: string }>();
  if (loading) return null;
  if (!user) return <Navigate to={`/${lang || 'en'}/auth`} replace />;
  return <AppLayout />;
}

function RootRedirect() {
  const browserLang = navigator.language?.split('-')[0] || 'en';
  const lang = SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'en';
  return <Navigate to={`/${lang}`} replace />;
}

function ShortcutRedirect({ path }: { path: string }) {
  const browserLang = navigator.language?.split('-')[0] || 'en';
  const lang = SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'en';
  return <Navigate to={`/${lang}/${path}`} replace />;
}

const LangRoutes = () => (
  <LanguageWrapper>
    <Routes>
      <Route index element={<Landing />} />
      <Route path="waitlist" element={<Waitlist />} />
      <Route path="auth" element={<Auth />} />
      <Route element={<ProtectedLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="cloud-resources" element={<CloudResourcesPage />} />
        <Route path="saas-status" element={<SaasStatusPage />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="integrations/aws/costs" element={<AwsCostDashboard />} />
        <Route path="integrations/aws" element={<AwsIntegrationDetail />} />
        <Route path="integrations/:type" element={<IntegrationDetail />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </LanguageWrapper>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route path="/waitlist" element={<ShortcutRedirect path="waitlist" />} />
    <Route path="/reports/shared/:shareToken" element={<PublicReport />} />
    <Route path="/:lang/*" element={<LangRoutes />} />
  </Routes>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
