import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, Wrench, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ServiceAlertSettingsProps {
  serviceId: string;
  alertEmailEnabled: boolean;
  alertEmail: string | null;
  alertChecksThreshold: number;
  maintenanceUntil: string | null;
}

export default function ServiceAlertSettings({
  serviceId,
  alertEmailEnabled,
  alertEmail,
  alertChecksThreshold,
  maintenanceUntil,
}: ServiceAlertSettingsProps) {
  const qc = useQueryClient();
  const [emailEnabled, setEmailEnabled] = useState(alertEmailEnabled);
  const [email, setEmail] = useState(alertEmail || '');
  const [threshold, setThreshold] = useState(String(alertChecksThreshold));
  const [maintenance, setMaintenance] = useState(maintenanceUntil || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('services')
        .update({
          alert_email_enabled: emailEnabled,
          alert_email: email || null,
          alert_checks_threshold: Number(threshold),
          maintenance_until: maintenance || null,
        })
        .eq('id', serviceId);

      if (error) throw error;
      toast.success('Alert settings saved');
      qc.invalidateQueries({ queryKey: ['services'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bell className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Alert Settings</h3>
      </div>

      <div className="space-y-4 bg-muted/10 border border-border rounded-xl p-4">
        {/* Email toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm">Email alerts</Label>
          </div>
          <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
        </div>

        {/* Email destination */}
        {emailEnabled && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email destination (leave empty for default)</Label>
            <Input
              type="email"
              placeholder="team@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}

        {/* Checks before alert */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Failed checks before alert</Label>
          <Select value={threshold} onValueChange={setThreshold}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 check (immediate)</SelectItem>
              <SelectItem value="2">2 consecutive checks</SelectItem>
              <SelectItem value="5">5 consecutive checks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Maintenance window */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Silence until (maintenance)</Label>
          </div>
          <Input
            type="datetime-local"
            value={maintenance ? maintenance.slice(0, 16) : ''}
            onChange={(e) => setMaintenance(e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="h-8 text-sm"
          />
          {maintenance && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setMaintenance('')}
            >
              Clear maintenance window
            </Button>
          )}
        </div>

        <Button
          size="sm"
          className="w-full gradient-primary text-primary-foreground hover:opacity-90"
          onClick={handleSave}
          disabled={saving}
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          Save alert settings
        </Button>
      </div>
    </div>
  );
}
