import { LayoutDashboard, Server, Plug, Bell, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";
import { useLangPrefix } from "@/hooks/use-lang-prefix";
import duckLogo from "@/assets/moniduck-logo.png";

export default function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const lp = useLangPrefix();

  const navItems = [
    { title: t("sidebar.dashboard"), url: `${lp}/dashboard`, icon: LayoutDashboard },
    { title: t("sidebar.services"), url: `${lp}/services`, icon: Server },
    { title: t("sidebar.integrations"), url: `${lp}/integrations`, icon: Plug },
    { title: t("sidebar.alerts"), url: `${lp}/alerts`, icon: Bell },
    { title: t("sidebar.settings"), url: `${lp}/settings`, icon: Settings },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-30 transition-all duration-300 flex flex-col ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="items-center gap-2 p-4 border-b border-sidebar-border min-h-[60px] flex flex-col">
        <img src={duckLogo} alt="MoniDuck" className="w-20 h-20 flex-shrink-0" />
        {!collapsed && <span className="text-lg font-bold text-foreground">MoniDuck</span>}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === `${lp}/dashboard`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-colors text-sm font-medium"
            activeClassName="bg-primary/10 text-primary font-semibold"
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
        {collapsed ? "→" : `← ${t("sidebar.collapse")}`}
      </button>
    </aside>
  );
}
