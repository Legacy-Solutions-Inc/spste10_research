"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserName = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Try to get name from profiles table
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .single();

          if (profile?.name) {
            setUserName(profile.name);
          } else {
            // Fallback to email if name not available
            setUserName(user.email?.split("@")[0] || "User");
          }
        } catch {
          // Profiles table might not exist, use email as fallback
          setUserName(user.email?.split("@")[0] || "User");
        }
      }
    };

    fetchUserName();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "🛑" },
    { name: "History", path: "/history", icon: "🕘" },
    { name: "Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <div className="w-64 bg-blue-900 text-white flex flex-col min-h-screen">
      {/* AGAP Logo/Title */}
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-2xl font-bold">AGAP</h1>
        {userName && (
          <p className="text-sm text-blue-200 mt-2">{userName}</p>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition hover:opacity-80 ${
                isActive
                  ? "bg-blue-800 text-white"
                  : "text-blue-200 hover:bg-blue-800"
              }`}
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-blue-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-blue-200 hover:bg-blue-800 hover:opacity-80 transition"
        >
          <span>🔓</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

