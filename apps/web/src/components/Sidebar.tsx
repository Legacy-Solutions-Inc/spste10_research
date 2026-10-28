"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Settings,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { LogoMark } from "@/components/brand/Logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "agap:sidebar-collapsed";

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const RESPONDER_NAV: NavItem[] = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "History", path: "/history", icon: History },
  { name: "Settings", path: "/settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { name: "Responder accounts", path: "/admin", icon: Users },
  { name: "Settings", path: "/settings", icon: Settings },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Wraps a rail item in a tooltip only while the rail is collapsed. */
function RailTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useCurrentProfile();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // Storage can be unavailable (private mode); the rail just starts expanded
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore: preference simply won't persist
      }
      return next;
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navItems = profile?.role === "admin" ? ADMIN_NAV : RESPONDER_NAV;
  const subtitle =
    profile?.role === "admin"
      ? "Administrator"
      : [profile?.municipality, profile?.province].filter(Boolean).join(", ") || "Response office";

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 flex h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
      aria-label="Main navigation"
    >
      <div className={cn("flex h-16 items-center gap-2.5", collapsed ? "justify-center px-0" : "px-5")}>
        <LogoMark inverted />
        {!collapsed && <span className="text-lg font-bold tracking-tight">AGAP</span>}
      </div>

      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <RailTooltip key={item.path} label={item.name} collapsed={collapsed}>
              <Link
                href={item.path}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                  collapsed ? "justify-center px-0" : "px-3",
                  isActive
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-muted hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
                {collapsed && <span className="sr-only">{item.name}</span>}
              </Link>
            </RailTooltip>
          );
        })}
      </nav>

      <div className={cn("border-t border-white/10 py-3", collapsed ? "px-2" : "px-3")}>
        {profile && !collapsed && (
          <div className="mb-2 flex items-center gap-3 px-2 py-1.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">
              {initials(profile.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile.name}</p>
              <p className="truncate text-xs text-sidebar-muted">{subtitle}</p>
            </div>
          </div>
        )}
        <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "items-center")}>
          <RailTooltip label="Log out" collapsed={collapsed}>
            <button
              onClick={handleLogout}
              className={cn(
                "flex h-9 items-center gap-3 rounded-md text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                collapsed ? "w-10 justify-center" : "flex-1 px-3"
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {collapsed ? <span className="sr-only">Log out</span> : <span>Log out</span>}
            </button>
          </RailTooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="grid h-9 w-10 place-items-center rounded-md text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
