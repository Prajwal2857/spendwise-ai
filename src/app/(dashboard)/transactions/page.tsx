"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input, { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Transaction } from "@/types";
import { formatCurrency, formatDate, getCategoryEmoji, DEFAULT_CATEGORIES, PAYMENT_METHODS } from "@/lib/utils";
import toast from "react-hot-toast";
import { useStore } from "@/store/useStore";

export default function TransactionsPage() {
  const { transactions, setTransactions, addTransaction, updateTransaction, removeTransaction } = useStore();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [form, setForm] = useState({
    merchant: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "Food",
    paymentMethod: "UPI",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    recurring: false,
  });

  // CSV import state
  const [importing, setImporting] = useState(false);

  const loadTransactions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      let url = "/api/transactions?limit=200";
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (filterCategory) url += `&category=${encodeURIComponent(filterCategory)}`;
      if (filterType) url += `&type=${filterType}`;
      if (filterPayment) url += `&paymentMethod=${encodeURIComponent(filterPayment)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterType, filterPayment, setTransactions]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!form.merchant || !form.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingTx) {
        const res = await fetch(`/api/transactions/${editingTx._id}`, {
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
          updateTransaction(editingTx._id, data.transaction);
          toast.success("Transaction updated");
        }
      } else {
        const res = await fetch("/api/transactions", {
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
          addTransaction(data.transaction);
          toast.success("Transaction added");
        }
      }
      setShowAddModal(false);
      setEditingTx(null);
      resetForm();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        removeTransaction(id);
        toast.success("Transaction deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const token = localStorage.getItem("token");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/csv-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const r = data.summary || data.result;
        toast.success(
          `Imported ${r.imported} transactions (${r.duplicates} duplicates, ${r.needsReview} need review)`
        );
        loadTransactions();
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const resetForm = () => {
    setForm({
      merchant: "",
      amount: "",
      type: "expense",
      category: "Food",
      paymentMethod: "UPI",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      recurring: false,
    });
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setForm({
      merchant: tx.merchant,
      amount: tx.amount.toString(),
      type: tx.type,
      category: tx.category,
      paymentMethod: tx.paymentMethod,
      date: new Date(tx.date).toISOString().split("T")[0],
      notes: tx.notes || "",
      recurring: tx.recurring,
    });
    setShowAddModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {transactions.length} transactions total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
              <Upload className="w-4 h-4" />
              {importing ? "Importing..." : "Import CSV"}
            </span>
          </label>
          <Button
            onClick={() => {
              resetForm();
              setEditingTx(null);
              setShowAddModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by merchant or notes..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterCategory || filterType || filterPayment) && (
              <Badge variant="info" className="ml-1">Active</Badge>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            <Select
              label="Category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={[
                { value: "", label: "All Categories" },
                ...DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
            <Select
              label="Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: "", label: "All Types" },
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
            />
            <Select
              label="Payment Method"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              options={[
                { value: "", label: "All Methods" },
                ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
              ]}
            />
          </div>
        )}
      </Card>

      {/* Transaction List */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {transactions.map((tx) => (
              <div
                key={tx._id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-xl">
                    {getCategoryEmoji(tx.category)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {tx.merchant}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{tx.category}</span>
                      <span>·</span>
                      <span>{formatDate(tx.date)}</span>
                      <span>·</span>
                      <span>{tx.paymentMethod}</span>
                      {tx.recurring && (
                        <>
                          <span>·</span>
                          <Badge variant="info">Recurring</Badge>
                        </>
                      )}
                    </div>
                    {tx.notes && (
                      <div className="text-xs text-slate-400 mt-0.5">{tx.notes}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.type === "income" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "income" ? (
                        <span className="inline-flex items-center">
                          <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />+
                        </span>
                      ) : (
                        <span className="inline-flex items-center">
                          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />-
                        </span>
                      )}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(tx)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <ArrowUpRight className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">No transactions found</p>
            <p className="text-xs text-slate-400 mb-4">
              {searchQuery || filterCategory || filterType || filterPayment
                ? "Try adjusting your filters"
                : "Add your first transaction to get started"}
            </p>
            <Button
              onClick={() => {
                resetForm();
                setEditingTx(null);
                setShowAddModal(true);
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Transaction
            </Button>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingTx(null);
        }}
        title={editingTx ? "Edit Transaction" : "Add Transaction"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "expense" })}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                form.type === "expense"
                  ? "bg-red-600 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "income" })}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                form.type === "income"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Income
            </button>
          </div>

          <Input
            label="Amount *"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
            required
          />

          <Input
            label="Merchant / Description *"
            value={form.merchant}
            onChange={(e) => setForm({ ...form, merchant: e.target.value })}
            placeholder="e.g., Swiggy, Salary, etc."
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
            />
          </div>

          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />

          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="recurring" className="text-sm text-slate-700">
              This is a recurring transaction
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingTx(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingTx ? "Update" : "Add"} Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
