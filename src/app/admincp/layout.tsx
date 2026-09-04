"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Server, Cpu, KeyRound, Route, Shuffle,
  ScrollText, Users, Shield, Settings, Sparkles, Loader2, LogOut, FolderKanban,
} from "lucide-react";
import { NotificationBell } from "@/components/admin/NotificationBell";

const NAV = [
  { href: "/admincp", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admincp/providers", label: "Providers", icon: Server },
  { href: "/admincp/models", label: "Models", icon: Cpu },
  { href: "/admincp/api-keys", label: "API Credentials", icon: KeyRound },
  { href: "/admincp/routing", label: "Routing", icon: Route },
  { href: "/admincp/fallback", label: "Fallback", icon: Shuffle },
  { href: "/admincp/logs", label: "Logs", icon: ScrollText },
  { href: "/admincp/users", label: "Users", icon: Users },
  { href: "/admincp/roles", label: "Roles & Permissions", icon: Shield },
  { href: "/admincp/security", label: "Security", icon: Shield },
  { href: "/admincp/settings", label: "System Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!isAdmin) {
        router.push("/");
      }
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
        <div className="h-14 flex items-center gap-2 px-5 border-b border-gray-800">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">AdminCP</span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-2 text-sm transition-colors ${
                  active ? "bg-white/10 text-white font-medium" : "hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-800 space-y-2">
          <Link href="/" className="block">
            <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white text-sm">
              <Sparkles className="w-4 h-4 mr-2" /> Back to app
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white text-sm"
            onClick={async () => { await logout(); router.push("/login"); }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
