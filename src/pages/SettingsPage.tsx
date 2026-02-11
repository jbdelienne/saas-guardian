import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <AppLayout tvMode={false} onToggleTvMode={() => {}} onAddService={() => {}}>
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
      </div>
    </AppLayout>
  );
}
