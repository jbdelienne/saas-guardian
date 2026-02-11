import { useState, ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: ReactNode;
  tvMode: boolean;
  onToggleTvMode: () => void;
  onAddService: () => void;
}

export default function AppLayout({ children, tvMode, onToggleTvMode, onAddService }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (tvMode) {
    return (
      <div className="min-h-screen bg-background tv-mode p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">MoniDuck</h1>
          <button
            onClick={onToggleTvMode}
            className="px-4 py-2 rounded-lg bg-card border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Exit TV Mode
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <TopBar
          tvMode={tvMode}
          onToggleTvMode={onToggleTvMode}
          onAddService={onAddService}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
