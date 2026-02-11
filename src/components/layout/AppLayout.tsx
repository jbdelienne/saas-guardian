import { useState, ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tvMode, setTvMode] = useState(false);

  if (tvMode) {
    return (
      <div className="min-h-screen bg-background tv-mode">
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setTvMode(false)}
            className="bg-card/80 backdrop-blur border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Exit TV Mode
          </button>
        </div>
        <main className="p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          tvMode={tvMode}
          onToggleTvMode={() => setTvMode(true)}
        />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
