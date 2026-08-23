"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Transaction } from "@/types";
import { formatCurrency, getCategoryEmoji, getCategoryColor } from "@/lib/utils";
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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Download } from "lucide-react";
import Button from "@/components/ui/Button";

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"1m" | "3m" | "6m" | "1y">("6m");

  const loadTransactions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/transactions?limit=1000", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch {
      console.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const now = new Date();
  const periodMonths = period === "1m" ? 1 : period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const startDate = new Date(now.getFullYear(), now.getMonth() - periodMonths, 1);

  const filteredTx = transactions.filter((t) => new Date(t.date) >= startDate);
  const expenses = filteredTx.filter((t) => t.type === "expense");
  const income = filteredTx.filter((t) => t.type === "income");

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  // Spending by category
  const catMap = new Map<string, number>();
  expenses.forEach((t) => {
    catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
  });
  const catData = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      emoji: getCategoryEmoji(name),
      color: getCategoryColor(name),
    }));

  // Monthly spending
  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  for (let i = periodMonths - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = m.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    monthlyMap.set(key, { income: 0, expenses: 0 });
  }
  filteredTx.forEach((t) => {
    const d = new Date(t.date);
    const key = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    const entry = monthlyMap.get(key);
    if (entry) {
      if (t.type === "income") entry.income += t.amount;
      else entry.expenses += t.amount;
    }
  });
  const monthlyData = [...monthlyMap.entries()].map(([month, data]) => ({
    month,
    ...data,
  }));

  // Top merchants
  const merchantMap = new Map<string, number>();
  expenses.forEach((t) => {
    merchantMap.set(t.merchant, (merchantMap.get(t.merchant) || 0) + t.amount);
  });
  const topMerchants = [...merchantMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Payment method breakdown
  const paymentMap = new Map<string, number>();
  expenses.forEach((t) => {
    paymentMap.set(t.paymentMethod, (paymentMap.get(t.paymentMethod) || 0) + t.amount);
  });
  const paymentData = [...paymentMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const exportCSV = () => {
    const headers = ["Date", "Merchant", "Category", "Amount", "Type", "Payment Method", "Notes"];
    const rows = filteredTx.map((t) => [
      new Date(t.date).toISOString().split("T")[0],
      t.merchant,
      t.category,
      t.amount.toString(),
      t.type,
      t.paymentMethod,
      t.notes || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spendwise-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Understand your financial patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(["1m", "3m", "6m", "1y"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p === "1m" ? "1 Month" : p === "3m" ? "3 Months" : p === "6m" ? "6 Months" : "1 Year"}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-sm text-slate-500 mb-1">Total Income</div>
          <div className="text-xl font-bold text-emerald-600 tabular-nums">{formatCurrency(totalIncome)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-slate-500 mb-1">Total Expenses</div>
          <div className="text-xl font-bold text-red-600 tabular-nums">{formatCurrency(totalExpenses)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-slate-500 mb-1">Net Savings</div>
          <div className="text-xl font-bold text-blue-600 tabular-nums">{formatCurrency(totalIncome - totalExpenses)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-slate-500 mb-1">Savings Rate</div>
          <div className="text-xl font-bold text-slate-900">{savingsRate}%</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Income vs Expenses */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <CardTitle>Income vs Expenses</CardTitle>
          </div>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Spending by Category */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <CardTitle>Spending by Category</CardTitle>
          </div>
          <CardContent className="p-6">
            {catData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-48 h-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="amount" paddingAngle={2}>
                        {catData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {catData.map((cat) => {
                    const pct = totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0;
                    return (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm text-slate-700">{cat.emoji} {cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(cat.amount)}</span>
                          <span className="text-xs text-slate-500 ml-1">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                No expense data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Merchants */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <CardTitle>Top Merchants</CardTitle>
          </div>
          <CardContent className="p-0">
            {topMerchants.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {topMerchants.map(([merchant, amount], i) => (
                  <div key={merchant} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-400 w-6">{i + 1}.</span>
                      <span className="text-sm font-medium text-slate-900">{merchant}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900 tabular-nums">{formatCurrency(amount)}</span>
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

        {/* Payment Method Analysis */}
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <CardTitle>Payment Methods</CardTitle>
          </div>
          <CardContent className="p-6">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {paymentData.map((_, index) => (
                      <Cell key={index} fill={["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"][index % 7]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spending Trend Line */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100">
          <CardTitle>Spending Trend</CardTitle>
        </div>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
