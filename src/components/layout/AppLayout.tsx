import { useState, ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';


interface AppLayoutProps {
  children: ReactNode;
  centered?: boolean;
}

export default function AppLayout({ children, centered = false }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className={`flex-1 p-6 ${centered ? 'flex items-center justify-center' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
