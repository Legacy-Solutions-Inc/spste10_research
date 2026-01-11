"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          // Fetch profile data
          // @ts-ignore - Supabase types may not be fully generated
          const { data: profileRaw } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .single();

          // Type assertion for profile data
          type ProfileData = {
            full_name: string | null;
            role: string | null;
          } | null;

          const profile = profileRaw as ProfileData;

          // Check if user is admin
          const userIsAdmin = profile?.role === "admin";
          setIsAdmin(userIsAdmin);

          // Try to fetch responder profile for municipality
          let fetchedMunicipality: string | null = null;
          try {
            // @ts-ignore - Supabase types may not be fully generated
            const { data: responderProfileRaw } = await supabase
              .from("responder_profiles")
              .select("municipality")
              .eq("id", user.id)
              .single();

            type ResponderProfileData = {
              municipality: string | null;
            } | null;

            const responderProfile = responderProfileRaw as ResponderProfileData;

            if (responderProfile?.municipality) {
              fetchedMunicipality = responderProfile.municipality;
              setMunicipality(responderProfile.municipality);
            }
          } catch {
            // Responder profile might not exist - that's okay
          }

          // Set user name with fallback priority: full_name > email
          if (profile?.full_name) {
            setUserName(profile.full_name);
          } else {
            setUserName(user.email?.split("@")[0] || "User");
          }
        } catch {
          // Profiles table might not exist, use email as fallback
          setUserName(user.email?.split("@")[0] || "User");
          setIsAdmin(false);
        }
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "History", path: "/history", icon: History },
    { name: "Settings", path: "/settings", icon: Settings },
    ...(isAdmin ? [{ name: "Admin", path: "/admin", icon: Shield }] : []),
  ];

  // Display full_name from profiles table (highest priority)
  const responderInfo = userName || "User";

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-white flex flex-col z-40 transition-transform duration-300 ease-in-out flex-shrink-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* AGAP Logo/Title */}
        <div className="p-6 border-b border-blue-800/50 dark:border-slate-700/50">
          <h1 className="text-2xl font-bold">AGAP</h1>
          {responderInfo && (
            <p className="text-sm text-blue-200/80 dark:text-slate-300/80 mt-2">
              {responderInfo}
            </p>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-200 font-medium text-sm ${
                  isActive
                    ? "bg-blue-800/50 dark:bg-slate-700/50 text-white border-l-4 border-blue-400"
                    : "text-blue-200 dark:text-slate-300 hover:bg-blue-800/30 dark:hover:bg-slate-700/30"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-blue-800/50 dark:border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-blue-200 dark:text-slate-300 hover:bg-blue-800/30 dark:hover:bg-slate-700/30 transition-colors duration-200 font-medium text-sm"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

