"use client";

import { Bell, Search, Menu } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, unreadNotifications } = useStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions... (e.g., 'How much did I spend on food?')"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </form>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-emerald-700">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700">
              {user?.name?.split(" ")[0] || "User"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
