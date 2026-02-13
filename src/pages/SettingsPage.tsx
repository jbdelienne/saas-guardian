import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <AppLayout>
      <div className="max-w-xl animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled />
          </div>

          <div className="space-y-2">
            <Label>Workspace</Label>
            <Input defaultValue="My Workspace" />
          </div>

          <Button className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Save Changes
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
              <div>
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
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
