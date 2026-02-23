import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/hooks/use-workspace';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Trash2, RefreshCw, Check, AlertCircle, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU West (Ireland)' },
  { value: 'eu-west-2', label: 'EU West (London)' },
  { value: 'eu-west-3', label: 'EU West (Paris)' },
  { value: 'eu-central-1', label: 'EU Central (Frankfurt)' },
  { value: 'eu-central-2', label: 'EU Central (Zurich)' },
  { value: 'eu-north-1', label: 'EU North (Stockholm)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'ca-central-1', label: 'Canada (Central)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
  { value: 'me-south-1', label: 'Middle East (Bahrain)' },
  { value: 'af-south-1', label: 'Africa (Cape Town)' },
];

interface AwsCredentials {
  id: string;
  access_key_id: string;
  secret_access_key: string;
  region: string;
  last_sync_at: string | null;
  sync_status: string;
}

interface AwsConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export default function AwsConnectModal({ open, onClose, onConnected }: AwsConnectModalProps) {
  const { user } = useAuth();
  const { data: workspace } = useWorkspace();
  const workspaceId = workspace?.id;
  const [credentials, setCredentials] = useState<AwsCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('eu-west-1');

  useEffect(() => {
    if (open && user) fetchCredentials();
  }, [open, user]);

  const fetchCredentials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aws_credentials')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!error && data) {
      setCredentials(data as unknown as AwsCredentials);
      setAccessKeyId(data.access_key_id);
      setSecretAccessKey(data.secret_access_key);
      setRegion(data.region);
    } else {
      setCredentials(null);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      toast.error('Please enter both Access Key ID and Secret Access Key');
      return;
    }
    if (!accessKeyId.startsWith('AKIA') && !accessKeyId.startsWith('ASIA')) {
      toast.error('Invalid Access Key ID format (should start with AKIA or ASIA)');
      return;
    }

    setSaving(true);

    if (credentials) {
      const { error } = await supabase
        .from('aws_credentials')
        .update({ access_key_id: accessKeyId, secret_access_key: secretAccessKey, region, sync_status: 'pending' })
        .eq('id', credentials.id);

      if (error) {
        toast.error('Failed to update credentials');
      } else {
        toast.success('AWS credentials updated');
        fetchCredentials();
        onConnected?.();
      }
    } else {
      const { error } = await supabase
        .from('aws_credentials')
        .insert({ user_id: user!.id, workspace_id: workspaceId, access_key_id: accessKeyId, secret_access_key: secretAccessKey, region });

      if (error) {
        toast.error('Failed to save credentials');
        console.error(error);
      } else {
        toast.success('AWS credentials saved');
        fetchCredentials();
        onConnected?.();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!credentials) return;
    setDeleting(true);
    const { error } = await supabase.from('aws_credentials').delete().eq('id', credentials.id);
    if (error) {
      toast.error('Failed to delete credentials');
    } else {
      toast.success('AWS credentials removed');
      setCredentials(null);
      setAccessKeyId('');
      setSecretAccessKey('');
      setRegion('eu-west-1');
      onConnected?.();
    }
    setDeleting(false);
  };

  const getSyncBadge = () => {
    if (!credentials) return null;
    switch (credentials.sync_status) {
      case 'success':
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><Check className="mr-1 h-3 w-3" />Synced</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Error</Badge>;
      case 'syncing':
        return <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Syncing...</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Connect AWS Account
          </DialogTitle>
          <DialogDescription>
            Enter your IAM credentials to auto-discover and monitor your AWS infrastructure.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Status banner if connected */}
            {credentials && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div>
                  <p className="font-mono text-sm text-foreground">
                    {credentials.access_key_id.slice(0, 8)}...{credentials.access_key_id.slice(-4)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {credentials.last_sync_at
                      ? `Last synced ${formatDistanceToNow(new Date(credentials.last_sync_at))} ago`
                      : 'Never synced'}
                  </p>
                </div>
                {getSyncBadge()}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aws-access-key">Access Key ID</Label>
                <Input
                  id="aws-access-key"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aws-secret-key">Secret Access Key</Label>
                <div className="relative">
                  <Input
                    id="aws-secret-key"
                    type={showSecret ? 'text' : 'password'}
                    value={secretAccessKey}
                    onChange={(e) => setSecretAccessKey(e.target.value)}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    className="font-mono pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aws-region">Default Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger id="aws-region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {AWS_REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* IAM Policy hint */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-foreground">Required IAM Permissions</p>
              <p className="text-[11px] text-muted-foreground">
                Create a read-only IAM user with this policy:
              </p>
              <code className="block text-[10px] bg-background p-2 rounded border font-mono text-muted-foreground leading-relaxed">
                ec2:DescribeInstances, s3:ListAllMyBuckets,{'\n'}
                rds:DescribeDBInstances, lambda:ListFunctions,{'\n'}
                sts:GetCallerIdentity
              </code>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {credentials ? 'Update Credentials' : 'Connect AWS'}
              </Button>
              {credentials && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
