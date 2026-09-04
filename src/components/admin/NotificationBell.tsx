"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

interface Notification {
  id: string;
  type: string;
  level: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = () => {
    if (!user) return;
    fetch("/api/admin/notifications?unread=true").then(r => r.json()).then(d => {
      if (d.ok) setNotifications(d.data);
    });
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    await fetch("/api/admin/notifications", { method: "PATCH" });
    setNotifications([]);
  };

  const levelColor = (level: string) => {
    switch (level) {
      case "error": return "bg-red-500";
      case "warning": return "bg-amber-500";
      case "success": return "bg-emerald-500";
      default: return "bg-blue-500";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
      >
        <Bell className="w-4 h-4" />
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {notifications.length > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-700">Mark all read</button>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.map(n => (
                <div key={n.id} className="flex items-start gap-2.5 p-3 hover:bg-gray-50">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${levelColor(n.level)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">No unread notifications</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
