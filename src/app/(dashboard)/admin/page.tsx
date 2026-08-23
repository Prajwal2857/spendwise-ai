"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, Users, ArrowLeftRight, Target, CreditCard, BarChart3 } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useStore } from "@/store/useStore";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newRegistrations: number;
  totalTransactions: number;
  totalBudgets: number;
  totalSubscriptions: number;
  topCategories: { _id: string; count: number; totalAmount: number }[];
  recentUsers: { _id: string; name: string; email: string; role: string; createdAt: string }[];
}

export default function AdminPage() {
  const { user } = useStore();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      } else {
        toast.error(data.error || "Access denied");
        router.push("/dashboard");
      }
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-700">Admin Access Required</p>
          <p className="text-sm text-slate-500">You don&apos;t have permission to view this page</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Platform overview and management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500">Total Users</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-500">Active (30d)</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats?.activeUsers || 0}</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500">Transactions</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.totalTransactions || 0}</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-slate-500">New (7d)</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats?.newRegistrations || 0}</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-600" />
            <CardTitle>Top Categories</CardTitle>
          </div>
          <CardContent className="p-0">
            {stats?.topCategories && stats.topCategories.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {stats.topCategories.map((cat, i) => (
                  <div key={cat._id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-400 w-6">{i + 1}.</span>
                      <span className="text-sm font-medium text-slate-900">{cat._id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(cat.totalAmount)}</span>
                      <span className="text-xs text-slate-500 ml-2">({cat.count} txns)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            <CardTitle>Recent Users</CardTitle>
          </div>
          <CardContent className="p-0">
            {stats?.recentUsers && stats.recentUsers.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {stats.recentUsers.map((u) => (
                  <div key={u._id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-emerald-700">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={u.role === "admin" ? "info" : "default"}>{u.role}</Badge>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(u.createdAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                No users yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
