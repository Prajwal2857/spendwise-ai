"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input, { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Budget, Transaction } from "@/types";
import { formatCurrency, getCategoryEmoji, DEFAULT_CATEGORIES } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export default function BudgetsPage() {
  const { budgets, setBudgets, addBudget, updateBudget, removeBudget } = useStore();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [categorySpending, setCategorySpending] = useState<Map<string, number>>(new Map());
  const [form, setForm] = useState({
    category: "Food",
    amount: "",
    period: "monthly" as "weekly" | "monthly" | "yearly",
  });

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Load budgets
      const budgetRes = await fetch("/api/budgets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const budgetData = await budgetRes.json();
      setBudgets(budgetData.budgets || []);

      // Load current month spending per category
      const txRes = await fetch("/api/transactions?type=expense&limit=500", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txData = await txRes.json();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthTx = (txData.transactions || []).filter(
        (t: Transaction) => new Date(t.date) >= startOfMonth
      );

      const spendingMap = new Map<string, number>();
      currentMonthTx.forEach((t: Transaction) => {
        spendingMap.set(t.category, (spendingMap.get(t.category) || 0) + t.amount);
      });
      setCategorySpending(spendingMap);
    } catch {
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [setBudgets]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      if (editing) {
        const res = await fetch(`/api/budgets/${editing.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: parseFloat(form.amount) }),
        });
        const data = await res.json();
        if (res.ok) {
          updateBudget(editing.id, data.budget);
          toast.success("Budget updated");
        }
      } else {
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            category: form.category,
            amount: parseFloat(form.amount),
            period: form.period,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          addBudget(data.budget);
          toast.success("Budget created");
        } else {
          toast.error(data.error || "Failed to create budget");
        }
      }
      setShowModal(false);
      setEditing(null);
      setForm({ category: "Food", amount: "", period: "monthly" });
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/budgets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        removeBudget(id);
        toast.success("Budget deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = [...categorySpending.values()].reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budgets</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Set spending limits and track your progress
          </p>
        </div>
        <Button onClick={() => { setShowModal(true); setEditing(null); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Overall Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm text-slate-500">Total Monthly Budget</h3>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
            </div>
          </div>
          <Badge variant={totalBudget > 0 && (totalSpent / totalBudget) > 0.9 ? "danger" : totalBudget > 0 && (totalSpent / totalBudget) > 0.75 ? "warning" : "success"}>
            {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% used
          </Badge>
        </div>
        <ProgressBar value={totalSpent} max={totalBudget || 1} size="lg" />
      </Card>

      {/* Budget Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgets.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => {
            const spent = categorySpending.get(budget.category) || 0;
            const percentage = Math.round((spent / budget.amount) * 100);
            const remaining = Math.max(budget.amount - spent, 0);

            return (
              <Card key={budget.id} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCategoryEmoji(budget.category)}</span>
                    <span className="font-medium text-slate-900">{budget.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditing(budget);
                        setForm({ ...form, amount: budget.amount.toString() });
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">
                      {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                    </span>
                    <Badge
                      variant={percentage >= 100 ? "danger" : percentage >= 75 ? "warning" : percentage >= 50 ? "info" : "success"}
                    >
                      {percentage >= 100 ? "Over budget" : percentage >= 75 ? "Warning" : "On track"}
                    </Badge>
                  </div>
                  <ProgressBar value={spent} max={budget.amount} size="md" />
                </div>

                <div className="text-xs text-slate-500">
                  {percentage >= 100
                    ? `Over by ${formatCurrency(spent - budget.amount)}`
                    : `${formatCurrency(remaining)} remaining`}
                  <span className="ml-1 capitalize">· {budget.period}</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-500 mb-4">No budgets set yet</p>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Create your first budget
          </Button>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        title={editing ? "Edit Budget" : "Create Budget"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={DEFAULT_CATEGORIES.filter((c) => !["Income", "Salary", "Freelance"].includes(c)).map((c) => ({
              value: c,
              label: `${getCategoryEmoji(c)} ${c}`,
            }))}
            disabled={!!editing}
          />
          <Input
            label="Budget Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="e.g., 6000"
            required
          />
          <Select
            label="Period"
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value as "weekly" | "monthly" | "yearly" })}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editing ? "Update" : "Create"} Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PiggyBank(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-0.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2" />
      <path d="M2 9v1c0 1.1.9 2 2 2h1" />
      <path d="M16 11h.01" />
    </svg>
  );
}
