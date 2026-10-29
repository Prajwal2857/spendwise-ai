"use client";

import { useEffect, useState } from "react";
import { User, Shield, Bell, Download, Trash2, Smartphone, Copy, RefreshCw } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

// Realistic bank SMS used by the "test" button; parsed in dry-run mode only.
const SAMPLE_SMS =
  "Rs.450.00 debited from A/c XX1234 on 29-10-2026 to swiggy@ybl (UPI Ref 416212345678). -HDFC Bank";

export default function SettingsPage() {
  const { user, setUser } = useStore();
  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.currency || "INR");
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthlyIncome?.toString() || "");
  const [saving, setSaving] = useState(false);

  // Automatic capture (phone forwards bank SMS to /api/ingest/sms)
  const [ingestToken, setIngestToken] = useState<string | null>(null);
  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestTesting, setIngestTesting] = useState(false);
  const [ingestTest, setIngestTest] = useState<{ ok: boolean; message: string } | null>(null);

  const [prefs, setPrefs] = useState(user?.notificationPreferences || {
    budgetWarnings: true,
    subscriptionReminders: true,
    spendingAlerts: true,
    savingsMilestones: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/ingest/token", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : { token: null }))
      .then((data) => setIngestToken(typeof data.token === "string" ? data.token : null))
      .catch(() => setIngestToken(null));
  }, []);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy — select the text and copy manually");
    }
  };

  const handleGenerateToken = async () => {
    const token = localStorage.getItem("token");
    setIngestBusy(true);
    try {
      const res = await fetch("/api/ingest/token", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setIngestToken(data.token);
        setIngestTest(null);
        toast.success("Capture token created");
      } else {
        toast.error(data.error || "Could not create a token");
      }
    } catch {
      toast.error("Could not create a token");
    } finally {
      setIngestBusy(false);
    }
  };

  const handleDisableCapture = async () => {
    const token = localStorage.getItem("token");
    setIngestBusy(true);
    try {
      const res = await fetch("/api/ingest/token", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIngestToken(null);
        setIngestTest(null);
        toast.success("Automatic capture disabled");
      } else {
        toast.error("Could not disable capture");
      }
    } catch {
      toast.error("Could not disable capture");
    } finally {
      setIngestBusy(false);
    }
  };

  const handleTestIngest = async () => {
    if (!ingestToken) return;
    setIngestTesting(true);
    setIngestTest(null);
    try {
      const res = await fetch("/api/ingest/sms?dryRun=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ingest-token": ingestToken,
        },
        body: JSON.stringify({ message: SAMPLE_SMS }),
      });
      const data = await res.json();
      const first = data.transactions?.[0];
      if (res.ok && first) {
        setIngestTest({
          ok: true,
          message: `Parsed ${first.merchant} · ₹${first.amount} · ${first.type} — nothing was saved (test only)`,
        });
      } else {
        setIngestTest({ ok: false, message: data.error || "Could not parse the test message" });
      }
    } catch {
      setIngestTest({ ok: false, message: "Could not reach the server" });
    } finally {
      setIngestTesting(false);
    }
  };

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

      {/* Automatic UPI capture */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-slate-600" />
          <CardTitle>Automatic UPI capture</CardTitle>
        </div>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Every UPI payment you make — from GPay, PhonePe, Paytm, or any bank app — sends you an SMS from
            your bank. UPI has no API that lets an app read a personal UPI ID&apos;s history, so instead of pulling
            from the bank, forward those SMS to this webhook and each transaction is recorded automatically,
            usually within seconds.
          </p>

          {!ingestToken ? (
            <Button onClick={handleGenerateToken} loading={ingestBusy}>
              Generate capture token
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Webhook URL</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 truncate">
                    /api/ingest/sms
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(`${window.location.origin}/api/ingest/sms`, "Webhook URL")
                    }
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Copies the full URL for this site. Point your forwarder at it from your phone.
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Token</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 truncate">
                    {ingestToken}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(ingestToken, "Token")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
                <p className="text-xs font-medium text-slate-600">How to connect your phone</p>
                <ol className="text-xs text-slate-500 list-decimal list-inside space-y-1">
                  <li>Install any SMS-forwarding app (Tasker, MacroDroid, or a free &quot;SMS to webhook&quot; app).</li>
                  <li>Create a rule: when an SMS arrives from your bank, send a POST request to the URL above.</li>
                  <li>
                    Put the SMS text in the JSON body as <code className="font-mono">{`{"message": "<sms text>"}`}</code>,
                    or send it as <code className="font-mono">?message=</code> for GET-only apps.
                  </li>
                  <li>
                    Add the header <code className="font-mono">x-ingest-token: {ingestToken.slice(0, 10)}…</code>
                  </li>
                </ol>
              </div>

              {ingestTest && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    ingestTest.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                  }`}
                >
                  {ingestTest.message}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleTestIngest} loading={ingestTesting}>
                  Send test message
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateToken} loading={ingestBusy}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Rotate token
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisableCapture} loading={ingestBusy}>
                  Disable
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Rotating replaces the token immediately — update the forwarder on your phone afterwards.
              </p>
            </div>
          )}
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
