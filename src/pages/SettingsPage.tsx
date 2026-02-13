import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="max-w-xl animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t('settings.title')}</h1>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.email')}</Label>
            <Input value={user?.email ?? ''} disabled />
          </div>

          <div className="space-y-2">
            <Label>{t('settings.workspace')}</Label>
            <Input defaultValue={t('settings.myWorkspace')} />
          </div>

          <Button className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
            {t('settings.saveChanges')}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
              <div>
                <Label className="text-sm font-medium">{t('settings.darkMode')}</Label>
                <p className="text-xs text-muted-foreground">{t('settings.darkModeDesc')}</p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
