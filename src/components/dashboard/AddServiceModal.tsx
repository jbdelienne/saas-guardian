import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (service: { name: string; icon: string; url: string; check_interval: number }) => void;
}

const emojiOptions = ['🌐', '💳', '🐙', '💬', '☁️', '▲', '🐕', '✉️', '📞', '🔒', '📊', '🛒'];

export default function AddServiceModal({ open, onClose, onAdd }: AddServiceModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🌐');
  const [url, setUrl] = useState('');
  const [interval, setInterval] = useState('5');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, icon, url, check_interval: Number(interval) });
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setName('');
      setUrl('');
      setIcon('🌐');
      setInterval('5');
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add new service</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-8 animate-scale-in">
            <CheckCircle className="w-12 h-12 text-success mb-3" />
            <p className="font-semibold text-foreground">Service added!</p>
            <p className="text-sm text-muted-foreground">Checking status...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Service name</Label>
              <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stripe API" required />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex gap-2 flex-wrap">
                {emojiOptions.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => setIcon(e)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition-colors ${
                      icon === e ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-url">URL to monitor</Label>
              <Input id="svc-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/health" required />
            </div>

            <div className="space-y-2">
              <Label>Check interval</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every 1 min</SelectItem>
                  <SelectItem value="2">Every 2 min</SelectItem>
                  <SelectItem value="5">Every 5 min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Start Monitoring
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
