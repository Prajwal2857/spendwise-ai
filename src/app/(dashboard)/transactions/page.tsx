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
  MessageSquare,
  CheckCircle,
  AlertCircle,
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

  // File import state
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // SMS import state
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [smsImporting, setSmsImporting] = useState(false);
  const [smsPreview, setSmsPreview] = useState<{
    transactions: { merchant: string; amount: number; type: string; date: string; upiRef: string }[];
    summary: { total: number; parsed: number; imported: number; duplicates: number; failed: number };
  } | null>(null);

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
        const res = await fetch(`/api/transactions/${editingTx.id}`, {
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
          updateTransaction(editingTx.id, data.transaction);
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

  const handleFileImport = async (file: File) => {
    if (!file) return;

    setImporting(true);
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Please log in to import files");
      setImporting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/file-import", {
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
        setShowImportModal(false);
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch (err) {
      toast.error("Failed to import file. Please check your connection and try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileImport(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileImport(file);
    e.target.value = "";
  };

  const handleSmsImport = async () => {
    if (!smsText.trim()) {
      toast.error("Please paste your UPI SMS messages first");
      return;
    }

    setSmsImporting(true);
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Please log in to import SMS");
      setSmsImporting(false);
      return;
    }

    try {
      const res = await fetch("/api/sms-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: smsText }),
      });

      const data = await res.json();

      if (res.ok) {
        setSmsPreview(data);
        toast.success(
          `Found ${data.summary.parsed} transactions — ${data.summary.imported} imported, ${data.summary.duplicates} duplicates`
        );
        loadTransactions();
      } else {
        toast.error(data.error || "Failed to parse SMS messages");
      }
    } catch {
      toast.error("Failed to import SMS. Please try again.");
    } finally {
      setSmsImporting(false);
    }
  };

  const handleSmsConfirm = () => {
    setSmsText("");
    setSmsPreview(null);
    setShowSmsModal(false);
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
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import File
          </Button>
          <Button
            variant="outline"
            onClick={() => { setShowSmsModal(true); setSmsPreview(null); }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Import SMS
          </Button>
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
                key={tx.id}
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
                      onClick={() => handleDelete(tx.id)}
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

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); }}
        title="Import Transactions"
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
          }`}
          onClick={() => document.getElementById("import-file-input")?.click()}
        >
          <input
            id="import-file-input"
            type="file"
            accept=".csv,.pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          {importing ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-700">Importing transactions...</p>
              <p className="text-xs text-slate-400 mt-1">This may take a moment for PDFs and images</p>
            </div>
          ) : (
            <div>
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Upload className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                Drag & drop a file here, or click to browse
              </p>
              <p className="text-xs text-slate-400">
                Supports CSV, PDF, JPG, and PNG — bank statements and receipts
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-medium text-slate-600 mb-1">Supported formats:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { ext: ".csv", desc: "Bank CSV exports" },
              { ext: ".pdf", desc: "Bank statement PDFs" },
              { ext: ".jpg/.png", desc: "Screenshot/scan of statements" },
            ].map((f) => (
              <span key={f.ext} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                <span className="font-mono font-medium text-emerald-600">{f.ext}</span>
                {f.desc}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Auto-detects Indian bank formats (SBI, HDFC, ICICI, Axis, etc.)</p>
        </div>
      </Modal>

      {/* SMS Import Modal */}
      <Modal
        isOpen={showSmsModal}
        onClose={() => { setShowSmsModal(false); setSmsPreview(null); }}
        title="Import from UPI SMS"
      >
        {smsPreview ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-emerald-800">Found {smsPreview.summary.parsed} transactions</p>
                <p className="text-emerald-600 text-xs mt-0.5">
                  {smsPreview.summary.imported} imported · {smsPreview.summary.duplicates} duplicates{smsPreview.summary.failed > 0 ? ` · ${smsPreview.summary.failed} skipped` : ""}
                </p>
              </div>
            </div>
            {smsPreview.transactions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 text-xs font-medium text-slate-500">Merchant</th>
                      <th className="text-right py-2 text-xs font-medium text-slate-500">Amount</th>
                      <th className="text-center py-2 text-xs font-medium text-slate-500">Type</th>
                      <th className="text-left py-2 text-xs font-medium text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {smsPreview.transactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 text-slate-900 font-medium">{tx.merchant}</td>
                        <td className="py-2 text-right font-mono">{formatCurrency(tx.amount)}</td>
                        <td className="py-2 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tx.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {tx.type === "income" ? "Income" : "Expense"}
                          </span>
                        </td>
                        <td className="py-2 text-slate-500 text-xs">{tx.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSmsConfirm} className="flex-1">
                Done
              </Button>
              <Button onClick={() => { setSmsPreview(null); setSmsText(""); }} className="flex-1">
                Import More
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">
                Paste your UPI transaction SMS messages below — one per line. We auto-detect formats from GPay, PhonePe, Paytm, BHIM, and all major banks.
              </p>
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="Paste UPI SMS here - one per line. e.g. Rs.500 paid to Swiggy via GPay..."
                className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            <Button
              onClick={handleSmsImport}
              disabled={smsImporting || !smsText.trim()}
              className="w-full"
            >
              {smsImporting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Parsing SMS...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Parse & Import Transactions
                </span>
              )}
            </Button>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-600 mb-1">Supported apps:</p>
              <div className="flex flex-wrap gap-1.5">
                {["Google Pay", "PhonePe", "Paytm", "BHIM", "CRED", "SBI", "HDFC", "ICICI", "Axis"].map((app) => (
                  <span key={app} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-600">
                    {app}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

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
