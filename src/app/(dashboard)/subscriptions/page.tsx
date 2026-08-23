"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, CreditCard, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input, { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Subscription } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export default function SubscriptionsPage() {
  const { subscriptions, setSubscriptions, addSubscription, updateSubscription, removeSubscription } = useStore();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    billingCycle: "monthly" as "monthly" | "yearly" | "weekly" | "quarterly",
    renewalDate: "",
    category: "Subscriptions",
    notes: "",
  });

  const loadSubscriptions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/subscriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [setSubscriptions]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!form.name || !form.amount || !form.renewalDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editing) {
        const res = await fetch(`/api/subscriptions/${editing._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
            amount: parseFloat(form.amount),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          updateSubscription(editing._id, data.subscription);
          toast.success("Subscription updated");
        }
      } else {
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...form,
            amount: parseFloat(form.amount),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          addSubscription(data.subscription);
          toast.success("Subscription added");
        }
      }
      setShowModal(false);
      setEditing(null);
      resetForm();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subscription?")) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        removeSubscription(id);
        toast.success("Subscription deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleToggle = async (sub: Subscription) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/subscriptions/${sub._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !sub.isActive }),
      });
      const data = await res.json();
      if (res.ok) {
        updateSubscription(sub._id, data.subscription);
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      amount: "",
      billingCycle: "monthly",
      renewalDate: "",
      category: "Subscriptions",
      notes: "",
    });
  };

  const activeSubs = subscriptions.filter((s) => s.isActive);
  const totalMonthly = activeSubs.reduce((sum, s) => {
    if (s.billingCycle === "yearly") return sum + s.amount / 12;
    if (s.billingCycle === "weekly") return sum + s.amount * 4;
    if (s.billingCycle === "quarterly") return sum + s.amount / 3;
    return sum + s.amount;
  }, 0);
  const totalAnnual = totalMonthly * 12;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track and manage your recurring expenses
          </p>
        </div>
        <Button onClick={() => { setShowModal(true); setEditing(null); resetForm(); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Subscription
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-500">Monthly Cost</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalMonthly)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500">Annual Cost</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalAnnual)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-500">Active Subscriptions</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {activeSubs.length}
          </div>
        </Card>
      </div>

      {/* Subscription List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subscriptions.length > 0 ? (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const now = new Date();
            const renewal = new Date(sub.renewalDate);
            const daysUntilRenewal = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isUpcoming = daysUntilRenewal <= 7 && daysUntilRenewal >= 0;

            return (
              <Card key={sub._id} className={`p-5 ${!sub.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900">{sub.name}</h3>
                        {!sub.isActive && <Badge variant="default">Paused</Badge>}
                        {isUpcoming && sub.isActive && <Badge variant="warning">Renewing in {daysUntilRenewal}d</Badge>}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1)} · Renews {formatDate(sub.renewalDate)}
                        {sub.notes && ` · ${sub.notes}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(sub.amount)}
                      </div>
                      <div className="text-xs text-slate-500">/{sub.billingCycle === "yearly" ? "year" : sub.billingCycle === "weekly" ? "week" : sub.billingCycle === "quarterly" ? "quarter" : "month"}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggle(sub)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          sub.isActive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {sub.isActive ? "Active" : "Paused"}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(sub);
                          setForm({
                            name: sub.name,
                            amount: sub.amount.toString(),
                            billingCycle: sub.billingCycle,
                            renewalDate: new Date(sub.renewalDate).toISOString().split("T")[0],
                            category: sub.category,
                            notes: sub.notes || "",
                          });
                          setShowModal(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-500 mb-4">No subscriptions tracked yet</p>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add your first subscription
          </Button>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        title={editing ? "Edit Subscription" : "Add Subscription"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Service Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Netflix, Spotify, etc."
            required
          />
          <Input
            label="Amount *"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="e.g., 649"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Billing Cycle"
              value={form.billingCycle}
              onChange={(e) => setForm({ ...form, billingCycle: e.target.value as "monthly" | "yearly" | "weekly" | "quarterly" })}
              options={[
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
            <Input
              label="Renewal Date *"
              type="date"
              value={form.renewalDate}
              onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
              required
            />
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editing ? "Update" : "Add"} Subscription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
