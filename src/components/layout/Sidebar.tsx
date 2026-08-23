"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  CreditCard,
  BarChart3,
  Wallet,
  Bell,
  Settings,
  Shield,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, unreadNotifications } = useStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">SpendWise</span>
            <span className="text-lg font-bold text-emerald-600"> AI</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
              {item.label}
              {item.href === "/notifications" && unreadNotifications > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <>
            <div className="border-t border-slate-100 my-3" />
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/admin"
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Shield className={`w-5 h-5 ${pathname === "/admin" ? "text-emerald-600" : "text-slate-400"}`} />
              Admin Dashboard
            </Link>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <item.icon className="w-5 h-5 text-slate-400" />
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
