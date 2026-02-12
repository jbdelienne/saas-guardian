import { LayoutDashboard, Server, Plug, Bell, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import duckLogo from "@/assets/moniduck-logo.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Services", url: "/services", icon: Server },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-30 transition-all duration-300 flex flex-col ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border min-h-[60px]">
        <img src={duckLogo} alt="MoniDuck" className="w-30 h-30 flex-shrink-0" />
        {!collapsed && <span className="text-lg font-bold text-foreground">MoniDuck</span>}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm font-medium"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="p-4 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors text-xs"
      >
        {collapsed ? "→" : "← Collapse"}
      </button>
    </aside>
  );
}
