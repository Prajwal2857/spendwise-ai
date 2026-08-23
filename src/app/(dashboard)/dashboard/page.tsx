"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useStore } from "@/store/useStore";
import { formatCurrency, formatShortDate, getCategoryEmoji, getGreeting, getPercentageChange } from "@/lib/utils";
import { Insight, Transaction } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savings: 0,
    previousMonthExpenses: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; amount: number; emoji: string; color: string }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Load transactions
      const txRes = await fetch("/api/transactions?limit=100", { headers });
      const txData = await txRes.json();
      const transactions = txData.transactions || [];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const currentMonth = transactions.filter(
        (t: Transaction) => new Date(t.date) >= startOfMonth
      );
      const lastMonth = transactions.filter(
        (t: Transaction) =>
          new Date(t.date) >= startOfLastMonth && new Date(t.date) <= endOfLastMonth
      );

      const monthlyIncome = currentMonth
        .filter((t: Transaction) => t.type === "income")
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const monthlyExpenses = currentMonth
        .filter((t: Transaction) => t.type === "expense")
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const previousMonthExpenses = lastMonth
        .filter((t: Transaction) => t.type === "expense")
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      setStats({
        totalBalance: monthlyIncome - monthlyExpenses + 50000,
        monthlyIncome,
        monthlyExpenses,
        savings: monthlyIncome - monthlyExpenses,
        previousMonthExpenses,
      });

      // Category breakdown
      const catMap = new Map<string, number>();
      currentMonth
        .filter((t: Transaction) => t.type === "expense")
        .forEach((t: Transaction) => {
          catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
        });

      const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
      const catData = [...catMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, amount], i) => ({
          name,
          amount,
          emoji: getCategoryEmoji(name),
          color: colors[i % colors.length],
        }));

      setCategoryData(catData);

      // Monthly trend (last 6 months)
      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const mTx = transactions.filter(
          (t: Transaction) =>
            new Date(t.date) >= m && new Date(t.date) <= mEnd
        );
        trend.push({
          month: m.toLocaleString("en-IN", { month: "short" }),
          income: mTx.filter((t: Transaction) => t.type === "income").reduce((s: number, t: Transaction) => s + t.amount, 0),
          expenses: mTx.filter((t: Transaction) => t.type === "expense").reduce((s: number, t: Transaction) => s + t.amount, 0),
        });
      }
      setMonthlyTrend(trend);

      // Recent transactions
      setRecentTransactions(transactions.slice(0, 5));

      // Load insights
      const insRes = await fetch("/api/insights", { headers });
      const insData = await insRes.json();
      setInsights(insData.insights || []);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const savingsRate = stats.monthlyIncome > 0
    ? Math.round((stats.savings / stats.monthlyIncome) * 100)
    : 0;

  const expenseChange = stats.previousMonthExpenses > 0
    ? getPercentageChange(stats.monthlyExpenses, stats.previousMonthExpenses)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {getGreeting()}, {user?.name?.split(" ")[0] || "User"} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Here&apos;s your money snapshot</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-sm text-slate-500">Balance</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(stats.totalBalance)}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-500">Income</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">
            {formatCurrency(stats.monthlyIncome)}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-slate-500">Spent</span>
          </div>
          <div className="text-2xl font-bold text-red-600 tabular-nums">
            {formatCurrency(stats.monthlyExpenses)}
          </div>
          {expenseChange !== 0 && (
            <div className="flex items-center gap-1 mt-1">
              {expenseChange < 0 ? (
                <TrendingDown className="w-3 h-3 text-emerald-500" />
              ) : (
                <TrendingUp className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${expenseChange < 0 ? "text-emerald-600" : "text-red-600"}`}>
                {Math.abs(expenseChange)}% {expenseChange < 0 ? "less" : "more"} than last month
              </span>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500">Saved</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 tabular-nums">
            {formatCurrency(stats.savings)}
          </div>
          <div className="text-xs text-slate-500 mt-1">{savingsRate}% savings rate</div>
        </Card>
      </div>

      {/* AI Month Summary */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-100">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                🧠 Your Month in Plain English
              </h3>
              <div className="text-sm text-slate-700 leading-relaxed space-y-1">
                {stats.monthlyIncome > 0 && stats.monthlyExpenses > 0 ? (
                  <>
                    <p>
                      You earned <strong>{formatCurrency(stats.monthlyIncome)}</strong> this month
                      and spent <strong>{formatCurrency(stats.monthlyExpenses)}</strong>.
                    </p>
                    {categoryData.length > 0 && (
                      <p>
                        Your biggest category was <strong>{categoryData[0].emoji} {categoryData[0].name} ({formatCurrency(categoryData[0].amount)})</strong>.
                      </p>
                    )}
                    {expenseChange !== 0 && (
                      <p>
                        Your spending is <strong>{Math.abs(expenseChange)}% {expenseChange < 0 ? "lower" : "higher"}</strong> than last month.
                      </p>
                    )}
                    <p>
                      You are currently saving approximately <strong>{formatCurrency(stats.savings)}</strong> this month.
                    </p>
                    {stats.monthlyIncome > 0 && (
                      <p>
                        If you maintain this pattern, you&apos;re on track to save approximately{" "}
                        <strong>{formatCurrency(stats.savings * 12)}</strong> this year.
                      </p>
                    )}
                  </>
                ) : (
                  <p>Add some transactions to see your AI-powered monthly summary.</p>
                )}
              </div>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Ask AI about my spending <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <CardTitle>Monthly Overview</CardTitle>
          </div>
          <CardContent className="p-6">
            {monthlyTrend.some((m) => m.income > 0 || m.expenses > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
                Add transactions to see your monthly trend
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <CardTitle>Spending by Category</CardTitle>
          </div>
          <CardContent className="p-6">
            {categoryData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        dataKey="amount"
                        paddingAngle={2}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {categoryData.slice(0, 5).map((cat) => {
                    const total = categoryData.reduce((s, c) => s + c.amount, 0);
                    const pct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
                    return (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm text-slate-700">
                            {cat.emoji} {cat.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-slate-900 tabular-nums">{formatCurrency(cat.amount)}</span>
                          <span className="text-xs text-slate-500 ml-1">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">
                Add expenses to see category breakdown
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/transactions" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              View all
            </Link>
          </div>
          <CardContent className="p-0">
            {recentTransactions.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {recentTransactions.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg">
                        {getCategoryEmoji(tx.category)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{tx.merchant}</div>
                        <div className="text-xs text-slate-500">
                          {tx.category} · {formatShortDate(tx.date)} · {tx.paymentMethod}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.type === "income" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"} {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <p className="text-sm mb-2">No transactions yet</p>
                <Link href="/transactions" className="text-sm text-emerald-600 font-medium">
                  Add your first transaction
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <CardTitle>Your Money Insights</CardTitle>
            <Link href="/analytics" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              View all
            </Link>
          </div>
          <CardContent className="p-0">
            {insights.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {insights.slice(0, 5).map((insight, i) => (
                  <div key={i} className="px-6 py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">{insight.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-slate-900">{insight.title}</span>
                          <Badge variant={
                            insight.severity === "success" ? "success" :
                            insight.severity === "warning" ? "warning" :
                            insight.severity === "danger" ? "danger" : "info"
                          }>
                            {insight.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Sparkles className="w-8 h-8 mb-2" />
                <p className="text-sm">Add more transactions to get AI insights</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
