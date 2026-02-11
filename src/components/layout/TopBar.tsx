import { Bell, Monitor, Plus, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TopBarProps {
  tvMode: boolean;
  onToggleTvMode: () => void;
  onAddService: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function TopBar({ tvMode, onToggleTvMode, onAddService, onToggleSidebar, sidebarCollapsed }: TopBarProps) {
  const { user, signOut } = useAuth();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  if (tvMode) return null;

  return (
    <header className="h-[60px] border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="text-muted-foreground hover:text-foreground transition-colors lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-medium text-muted-foreground">Dashboard</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAddService} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Service</span>
        </Button>

        <Button
          variant={tvMode ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleTvMode}
          className="gap-2"
        >
          <Monitor className="w-4 h-4" />
          <span className="hidden sm:inline">TV Mode</span>
        </Button>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </Button>

        <div className="flex items-center gap-2 ml-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
