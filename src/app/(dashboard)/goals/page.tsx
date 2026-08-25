"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SavingsGoal } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

const GOAL_ICONS = ["💻", "🏠", "✈️", "🚗", "📱", "🎓", "💰", "🎮", "🏥", "🎄", "💍", "📚"];

export default function GoalsPage() {
  const { goals, setGoals, addGoal, updateGoal, removeGoal } = useStore();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [showDeposit, setShowDeposit] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    targetDate: "",
    icon: "💻",
  });

  const loadGoals = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/goals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGoals(data.goals || []);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [setGoals]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!form.name || !form.targetAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editing) {
        const res = await fetch(`/api/goals/${editing.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name,
            targetAmount: parseFloat(form.targetAmount),
            targetDate: form.targetDate || undefined,
            icon: form.icon,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          updateGoal(editing.id, data.goal);
          toast.success("Goal updated");
        }
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name,
            targetAmount: parseFloat(form.targetAmount),
            currentAmount: parseFloat(form.currentAmount) || 0,
            targetDate: form.targetDate || undefined,
            icon: form.icon,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          addGoal(data.goal);
          toast.success("Goal created");
        }
      }
      setShowModal(false);
      setEditing(null);
      resetForm();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!showDeposit || !depositAmount) return;

    const newAmount = showDeposit.currentAmount + parseFloat(depositAmount);

    try {
      const res = await fetch(`/api/goals/${showDeposit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentAmount: newAmount }),
      });
      const data = await res.json();
      if (res.ok) {
        updateGoal(showDeposit.id, data.goal);
        toast.success(`Added ${formatCurrency(parseFloat(depositAmount))} to ${showDeposit.name}`);
        setShowDeposit(null);
        setDepositAmount("");
        if (newAmount >= showDeposit.targetAmount) {
          toast.success(`🎉 Congratulations! You've reached your ${showDeposit.name} goal!`, { duration: 5000 });
        }
      }
    } catch {
      toast.error("Failed to add amount");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        removeGoal(id);
        toast.success("Goal deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const resetForm = () => {
    setForm({ name: "", targetAmount: "", currentAmount: "", targetDate: "", icon: "💻" });
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Savings Goals</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track your progress towards financial goals
          </p>
        </div>
        <Button onClick={() => { setShowModal(true); setEditing(null); resetForm(); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-600">Total Saved / Target</div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(totalSaved)} / {formatCurrency(totalTarget)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600">Overall Progress</div>
              <div className="text-2xl font-bold text-emerald-600">
                {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const percentage = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
            const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
            const isComplete = goal.currentAmount >= goal.targetAmount;

            return (
              <Card key={goal.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{goal.icon || "🎯"}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{goal.name}</h3>
                      {goal.targetDate && (
                        <div className="text-xs text-slate-500">
                          Target: {formatDate(goal.targetDate)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditing(goal);
                        setForm({
                          name: goal.name,
                          targetAmount: goal.targetAmount.toString(),
                          currentAmount: "",
                          targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split("T")[0] : "",
                          icon: goal.icon || "💻",
                        });
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isComplete && (
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-lg mb-3">
                    <Trophy className="w-3.5 h-3.5" />
                    Goal reached! 🎉
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                    <span className="font-medium text-slate-700">{percentage}%</span>
                  </div>
                  <ProgressBar
                    value={goal.currentAmount}
                    max={goal.targetAmount}
                    size="md"
                    color={isComplete ? "#10b981" : undefined}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {isComplete ? "Completed" : `${formatCurrency(remaining)} to go`}
                  </span>
                  {!isComplete && (
                    <button
                      onClick={() => { setShowDeposit(goal); setDepositAmount(""); }}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      + Add money
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-500 mb-4">No savings goals yet</p>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Create your first goal
          </Button>
        </Card>
      )}

      {/* Create/Edit Goal Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        title={editing ? "Edit Goal" : "Create Savings Goal"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
                    form.icon === icon
                      ? "bg-emerald-100 border-2 border-emerald-500"
                      : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Goal Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., New Laptop, Emergency Fund"
            required
          />

          <Input
            label="Target Amount *"
            type="number"
            min="0"
            value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
            placeholder="e.g., 80000"
            required
          />

          {!editing && (
            <Input
              label="Already Saved"
              type="number"
              min="0"
              value={form.currentAmount}
              onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              placeholder="0"
            />
          )}

          <Input
            label="Target Date"
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editing ? "Update" : "Create"} Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deposit Modal */}
      <Modal
        isOpen={!!showDeposit}
        onClose={() => { setShowDeposit(null); setDepositAmount(""); }}
        title={`Add Money to ${showDeposit?.name || ""}`}
        size="sm"
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          {showDeposit && (
            <div className="bg-slate-50 rounded-xl p-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-slate-600">Current</span>
                <span className="font-medium">{formatCurrency(showDeposit.currentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Target</span>
                <span className="font-medium">{formatCurrency(showDeposit.targetAmount)}</span>
              </div>
            </div>
          )}
          <Input
            label="Amount to Add *"
            type="number"
            min="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0"
            required
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => { setShowDeposit(null); setDepositAmount(""); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Money
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
