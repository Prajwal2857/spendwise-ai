"use client";

import { useState } from "react";
import { User, Shield, Bell, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, setUser } = useStore();
  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.currency || "INR");
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthlyIncome?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(user?.notificationPreferences || {
    budgetWarnings: true,
    subscriptionReminders: true,
    spendingAlerts: true,
    savingsMilestones: true,
  });

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          currency,
          monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
          notificationPreferences: prefs,
        }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        toast.success("Profile updated");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/transactions?limit=10000", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const csv = [
        "Date,Merchant,Category,Amount,Type,Payment Method,Notes",
        ...data.transactions.map((t: { date: string; merchant: string; category: string; amount: number; type: string; paymentMethod: string; notes: string }) =>
          `${new Date(t.date).toISOString().split("T")[0]},${t.merchant},${t.category},${t.amount},${t.type},${t.paymentMethod},${t.notes || ""}`
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spendwise-export.csv";
      a.click();
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Profile */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-600" />
          <CardTitle>Profile</CardTitle>
        </div>
        <CardContent className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={user?.email || ""} disabled />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled />
            <Input label="Monthly Income" type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="e.g., 50000" />
          </div>
          <Button onClick={handleSaveProfile} loading={saving}>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-600" />
          <CardTitle>Notification Preferences</CardTitle>
        </div>
        <CardContent className="space-y-3">
          {[
            { key: "budgetWarnings" as const, label: "Budget warnings", desc: "When you reach 75% or 90% of a budget" },
            { key: "subscriptionReminders" as const, label: "Subscription reminders", desc: "Before a subscription renews" },
            { key: "spendingAlerts" as const, label: "Spending alerts", desc: "When spending is unusually high" },
            { key: "savingsMilestones" as const, label: "Savings milestones", desc: "When you reach a savings goal" },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-slate-900">{item.label}</div>
                <div className="text-xs text-slate-500">{item.desc}</div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  onChange={(e) => setPrefs({ ...prefs, [item.key]: e.target.checked })}
                  className="sr-only"
                />
                <div
                  onClick={() => setPrefs({ ...prefs, [item.key]: !prefs[item.key] })}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${prefs[item.key] ? "bg-emerald-600" : "bg-slate-300"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mt-0.5 ${prefs[item.key] ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                </div>
              </div>
            </label>
          ))}
          <Button onClick={handleSaveProfile} loading={saving} size="sm" className="mt-2">Save Preferences</Button>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-600" />
          <CardTitle>Data & Privacy</CardTitle>
        </div>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-slate-900">Export Data</div>
              <div className="text-xs text-slate-500">Download all your transactions as CSV</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-red-600">Delete Account</div>
                <div className="text-xs text-slate-500">Permanently delete your account and all data</div>
              </div>
              <Button variant="danger" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="p-6 bg-slate-50 border-slate-200">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>Disclaimer:</strong> SpendWise AI provides personal budgeting and financial education tools.
          It does not provide personalized investment, tax, or financial advice.
        </p>
      </Card>
    </div>
  );
}
