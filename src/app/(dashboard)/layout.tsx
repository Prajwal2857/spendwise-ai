"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { useStore } from "@/store/useStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, setUser, setToken, setNotifications, setUnreadNotifications, logout } = useStore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = token || localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            if (!data.user.onboardingCompleted) {
              router.push("/onboarding");
            }
          } else {
            logout();
            router.push("/login");
          }
        })
        .catch(() => {
          logout();
          router.push("/login");
        })
        .finally(() => setLoading(false));
    } else {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setNotifications(data.notifications || []);
          setUnreadNotifications(data.unreadCount || 0);
        })
        .catch(() => {});
    }
  }, [token, setNotifications, setUnreadNotifications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading SpendWise AI...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <MobileNav />

      <div className="lg:ml-64">
        <Header onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="p-4 lg:p-8 pb-24 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
