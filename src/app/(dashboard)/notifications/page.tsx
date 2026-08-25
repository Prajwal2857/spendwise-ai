"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Notification } from "@/types";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

const typeIcons: Record<string, string> = {
  budget_warning: "🎯",
  subscription_reminder: "🔔",
  spending_alert: "⚠️",
  savings_milestone: "🏆",
  info: "ℹ️",
};

const typeBadgeVariants: Record<string, "warning" | "danger" | "success" | "info"> = {
  budget_warning: "warning",
  subscription_reminder: "info",
  spending_alert: "danger",
  savings_milestone: "success",
  info: "info",
};

export default function NotificationsPage() {
  const { notifications, setNotifications, setUnreadNotifications } = useStore();
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadNotifications(data.unreadCount || 0);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setUnreadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    const token = localStorage.getItem("token");
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadNotifications(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markRead = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadNotifications(Math.max(0, notifications.filter((n) => !n.read && n.id !== id).length));
    } catch {
      // silent
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 cursor-pointer transition-colors ${!n.read ? "bg-emerald-50/50 border-emerald-100" : ""}`}
              onClick={() => !n.read && markRead(n.id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{typeIcons[n.type] || "ℹ️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-medium ${!n.read ? "text-slate-900" : "text-slate-700"}`}>
                      {n.title}
                    </span>
                    <Badge variant={typeBadgeVariants[n.type] || "info"}>
                      {n.type.replace(/_/g, " ")}
                    </Badge>
                    {!n.read && <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-500">No notifications yet</p>
          <p className="text-xs text-slate-400 mt-1">We&apos;ll notify you about budgets, subscriptions, and spending alerts</p>
        </Card>
      )}
    </div>
  );
}
