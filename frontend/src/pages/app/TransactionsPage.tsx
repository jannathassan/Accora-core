import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCategories,
  TransactionQueryParams,
} from '../../services/api';
import type { Transaction, TransactionCreate, TransactionStatus, CategoriesResponse } from '../../types';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { getCurrentDate } from '../../utils/date';
import CsvImportModal from '../../components/CsvImportModal';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  X,
  Filter,
  ArrowUpDown,
  Upload,
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

type SortKey = 'date' | 'amount' | 'description';
type SortDir = 'asc' | 'desc';

export const TransactionsPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const currency = activeWorkspace?.currency || 'USD';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoriesResponse>({ income: [], expense: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modals & Drawers
  const [showForm, setShowForm] = useState<boolean>(false);
  const [showImport, setShowImport] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  // Form State
  const initialFormState: TransactionCreate = {
    date: getCurrentDate(),
    description: '',
    category: 'Sales Revenue',
    type: 'income',
    amount: 0,
    status: 'completed',
    notes: '',
  };
  const [form, setForm] = useState<TransactionCreate>(initialFormState);
  const [formTouched, setFormTouched] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: TransactionQueryParams = {
        sort_by: sortKey,
        sort_dir: sortDir,
      };
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (monthFilter) params.month = monthFilter;
      if (search) params.search = search;

      const [txns, cats] = await Promise.all([
        getTransactions(params),
        getCategories(),
      ]);
      setTransactions(txns);
      setCategories(cats);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [sortKey, sortDir, typeFilter, categoryFilter, monthFilter, search, activeWorkspace?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleOpenAdd = () => {
    setForm({
      ...initialFormState,
      date: getCurrentDate(),
      type: 'expense',
      category: 'Operating',
    });
    setEditingId(null);
    setFormTouched(false);
    setShowForm(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    setForm({
      date: t.date,
      description: t.description,
      category: t.category,
      type: t.type,
      amount: t.amount,
      status: t.status,
      notes: t.notes || '',
    });
    setEditingId(t.id);
    setFormTouched(false);
    setShowForm(true);
  };

  const isFormValid =
    form.description.trim().length > 0 &&
    form.category.trim().length > 0 &&
    form.amount > 0 &&
    !!form.date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await updateTransaction(editingId, form);
        showToast('Transaction updated successfully');
      } else {
        await createTransaction(form);
        showToast('Transaction added successfully');
      }
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteTransaction(pendingDelete.id);
      showToast('Transaction deleted successfully');
      setPendingDelete(null);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete transaction', 'error');
    }
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.status === 'cancelled') return;
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
    });
    return {
      income,
      expense,
      net: income - expense,
      count: transactions.length,
    };
  }, [transactions]);

  // Unique months available
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      if (t.date) months.add(t.date.slice(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const currentCategoryList = form.type === 'income' ? categories.income : categories.expense;

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2',
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          )}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200 dark:border-surface-300">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
              Transactions Ledger
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-200 border border-surface-200 dark:border-surface-300 text-surface-600 dark:text-surface-300 text-xs font-medium">
              {transactions.length} total
            </span>
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Keep track of your company's income, expenses, and cash movements with exact accounting precision.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-card border border-surface-200 dark:border-surface-300 hover:bg-surface-100 dark:hover:bg-surface-200 text-surface-700 dark:text-surface-200 text-xs md:text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-1">
            <span>Total Inflow (Income)</span>
            <TrendingUp className="w-4 h-4 text-positive" />
          </div>
          <p className="text-lg md:text-xl font-bold font-mono text-positive tabular-nums">
            {fmtCurrency(summaryMetrics.income, currency)}
          </p>
        </div>

        <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-1">
            <span>Total Outflow (Expenses)</span>
            <TrendingDown className="w-4 h-4 text-risk" />
          </div>
          <p className="text-lg md:text-xl font-bold font-mono text-risk tabular-nums">
            {fmtCurrency(summaryMetrics.expense, currency)}
          </p>
        </div>

        <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-1">
            <span>Net Cash Movement</span>
            <DollarSign className="w-4 h-4 text-brand-500" />
          </div>
          <p
            className={clsx(
              'text-lg md:text-xl font-bold font-mono tabular-nums',
              summaryMetrics.net >= 0 ? 'text-positive' : 'text-risk'
            )}
          >
            {summaryMetrics.net >= 0 ? '+' : ''}
            {fmtCurrency(summaryMetrics.net, currency)}
          </p>
        </div>

        <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-1">
            <span>Recorded Volume</span>
            <Receipt className="w-4 h-4 text-surface-400" />
          </div>
          <p className="text-lg md:text-xl font-bold font-mono text-surface-900 dark:text-surface-100 tabular-nums">
            {summaryMetrics.count} records
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-3.5 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, category, or notes..."
              className="w-full pl-9 pr-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            {(['', 'income', 'expense'] as const).map((t) => (
              <button
                key={t || 'all'}
                onClick={() => setTypeFilter(t)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer',
                  typeFilter === t
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-surface-100 dark:bg-surface-200 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                )}
              >
                {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All Types'}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-200/60 dark:border-surface-300/40 text-xs">
          <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter by:</span>
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-lg text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            <optgroup label="Income Categories">
              {categories.income.map((c) => (
                <option key={`inc-${c}`} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
            <optgroup label="Expense Categories">
              {categories.expense.map((c) => (
                <option key={`exp-${c}`} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Month Dropdown */}
          {availableMonths.length > 0 && (
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-2.5 py-1 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-lg text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Periods</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {(search || typeFilter || categoryFilter || monthFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setCategoryFilter('');
                setMonthFilter('');
              }}
              className="px-2 py-1 text-brand-600 dark:text-brand-400 hover:underline font-medium text-xs ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-card rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-300 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-300 bg-surface-50/50 dark:bg-surface-200/30">
              <h2 className="text-base font-bold text-surface-900 dark:text-surface-100">
                {editingId ? 'Edit Transaction' : 'Record Transaction'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        type: 'income',
                        category: categories.income[0] || 'Sales Revenue',
                      })
                    }
                    className={clsx(
                      'py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      form.type === 'income'
                        ? 'bg-positive-light border-positive/50 text-positive shadow-xs'
                        : 'border-surface-200 dark:border-surface-300 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-200'
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        type: 'expense',
                        category: categories.expense[0] || 'Operating',
                      })
                    }
                    className={clsx(
                      'py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      form.type === 'expense'
                        ? 'bg-risk-light border-risk/50 text-risk shadow-xs'
                        : 'border-surface-200 dark:border-surface-300 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-200'
                    )}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    Expense
                  </button>
                </div>
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Date <span className="text-risk">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Amount ({currency}) <span className="text-risk">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                    className={clsx(
                      'w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border rounded-xl text-xs md:text-sm font-mono text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                      formTouched && form.amount <= 0
                        ? 'border-risk'
                        : 'border-surface-200 dark:border-surface-300'
                    )}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Description / Payee <span className="text-risk">*</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Milan Textiles raw silk order"
                  required
                  className={clsx(
                    'w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                    formTouched && !form.description.trim()
                      ? 'border-risk'
                      : 'border-surface-200 dark:border-surface-300'
                  )}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Category <span className="text-risk">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    {currentCategoryList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Or type custom"
                    className="w-1/2 px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as TransactionStatus })}
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="completed">Completed (Cleared)</option>
                  <option value="pending">Pending (Expected / Uncleared)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Notes <span className="text-surface-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional context or invoice memo..."
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-surface-200 dark:border-surface-300">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-surface-200 dark:border-surface-300 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Record' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-card rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-300 w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">
                Delete Transaction?
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                Are you sure you want to delete{' '}
                <strong>"{pendingDelete.description}"</strong> (
                {fmtCurrency(pendingDelete.amount, currency)})? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2 border border-surface-200 dark:border-surface-300 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        existingTransactions={transactions}
        onSuccess={() => {
          showToast('Transactions imported successfully');
          loadData();
        }}
      />

      {/* Transactions Ledger Table */}
      <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-surface-500 dark:text-surface-400">Loading ledger records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-risk space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
            <button
              onClick={loadData}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-200 text-surface-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                No Transactions Found
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-sm mx-auto">
                {search || typeFilter || categoryFilter || monthFilter
                  ? 'No transactions match the selected filters. Try broadening your search.'
                  : 'Start tracking your business numbers by creating your first transaction or importing a CSV file.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Transaction</span>
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-100 dark:bg-surface-200 hover:bg-surface-200 text-surface-700 dark:text-surface-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead className="bg-surface-50/80 dark:bg-surface-200/50 text-surface-600 dark:text-surface-300 font-semibold border-b border-surface-200 dark:border-surface-300">
                <tr>
                  <th
                    onClick={() => toggleSort('date')}
                    className="py-3 px-4 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-surface-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('description')}
                    className="py-3 px-4 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Description</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-surface-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th
                    onClick={() => toggleSort('amount')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-surface-900 dark:hover:text-surface-100 select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Amount</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-surface-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/60 dark:divide-surface-300/40">
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-surface-50/60 dark:hover:bg-surface-200/30 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-surface-600 dark:text-surface-400 whitespace-nowrap">
                      {fmtDate(t.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-surface-900 dark:text-surface-100">
                        {t.description}
                      </div>
                      {t.notes && (
                        <div className="text-[11px] text-surface-500 dark:text-surface-400 truncate max-w-xs md:max-w-md">
                          {t.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-surface-200 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-300">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider',
                          t.type === 'income'
                            ? 'bg-positive-light text-positive border border-positive/30'
                            : 'bg-risk-light text-risk border border-risk/30'
                        )}
                      >
                        {t.type === 'income' ? '+' : '-'} {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          'inline-block px-2 py-0.5 rounded-md text-[11px] font-medium capitalize',
                          t.status === 'completed' && 'bg-positive-light/50 text-positive',
                          t.status === 'pending' && 'bg-warning-light/50 text-warning',
                          t.status === 'cancelled' && 'bg-surface-200 text-surface-500'
                        )}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td
                      className={clsx(
                        'py-3 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums',
                        t.type === 'income' ? 'text-positive' : 'text-risk'
                      )}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {fmtCurrency(t.amount, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          title="Edit transaction"
                          className="p-1.5 text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(t)}
                          title="Delete transaction"
                          className="p-1.5 text-surface-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
