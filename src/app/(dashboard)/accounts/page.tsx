"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Wallet, CreditCard, Banknote, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input, { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Account } from "@/types";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const accountTypeIcons: Record<string, React.ReactNode> = {
  bank: <Wallet className="w-6 h-6" />,
  credit_card: <CreditCard className="w-6 h-6" />,
  debit_card: <CreditCard className="w-6 h-6" />,
  cash: <Banknote className="w-6 h-6" />,
  upi: <Smartphone className="w-6 h-6" />,
  other: <Wallet className="w-6 h-6" />,
};

const accountTypeLabels: Record<string, string> = {
  bank: "Bank Account",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  cash: "Cash",
  upi: "UPI",
  other: "Other",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({
    accountName: "",
    accountType: "bank",
    balance: "",
    institution: "",
  });

  const loadAccounts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!form.accountName) {
      toast.error("Account name is required");
      return;
    }

    try {
      if (editing) {
        const res = await fetch(`/api/accounts/${editing._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0 }),
        });
        const data = await res.json();
        if (res.ok) {
          setAccounts((prev) => prev.map((a) => (a._id === editing._id ? data.account : a)));
          toast.success("Account updated");
        }
      } else {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form, balance: parseFloat(form.balance) || 0 }),
        });
        const data = await res.json();
        if (res.ok) {
          setAccounts((prev) => [data.account, ...prev]);
          toast.success("Account added");
        }
      }
      setShowModal(false);
      setEditing(null);
      setForm({ accountName: "", accountType: "bank", balance: "", institution: "" });
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a._id !== id));
        toast.success("Account deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your financial accounts</p>
        </div>
        <Button onClick={() => { setShowModal(true); setEditing(null); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      <Card className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="text-sm text-slate-300 mb-1">Total Balance</div>
        <div className="text-3xl font-bold tabular-nums">{formatCurrency(totalBalance)}</div>
        <div className="text-sm text-slate-400 mt-1">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account._id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                    {accountTypeIcons[account.accountType] || <Wallet className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{account.accountName}</h3>
                    <p className="text-xs text-slate-500">{accountTypeLabels[account.accountType]}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(account); setForm({ accountName: account.accountName, accountType: account.accountType, balance: account.balance.toString(), institution: account.institution || "" }); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(account._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(account.balance)}</div>
              {account.institution && <div className="text-xs text-slate-500 mt-1">{account.institution}</div>}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-500 mb-4">No accounts added yet</p>
          <Button onClick={() => setShowModal(true)} size="sm">Add your first account</Button>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? "Edit Account" : "Add Account"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Account Name *" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="e.g., SBI Savings" required />
          <Select label="Account Type" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} options={Object.entries(accountTypeLabels).map(([v, l]) => ({ value: v, label: l }))} />
          <Input label="Balance" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0" />
          <Input label="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g., State Bank of India" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{editing ? "Update" : "Add"} Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
