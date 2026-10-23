import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getInvoices,
  getInvoiceSummary,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  InvoiceQueryParams,
} from '../../services/api';
import type { Invoice, InvoiceCreate, InvoiceItem, InvoiceStatus, InvoiceSummary } from '../../types';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { getCurrentDate } from '../../utils/date';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  X,
  Check,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Eye,
  Printer,
  AlertCircle,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { bg: string; text: string; icon: typeof CheckCircle2; label: string }
> = {
  paid: { bg: 'bg-positive-light border border-positive/30', text: 'text-positive', icon: CheckCircle2, label: 'Paid' },
  pending: { bg: 'bg-warning-light border border-warning/30', text: 'text-warning', icon: Clock, label: 'Pending' },
  overdue: { bg: 'bg-risk-light border border-risk/30', text: 'text-risk', icon: AlertTriangle, label: 'Overdue' },
  sent: { bg: 'bg-brand-500/10 border border-brand-500/30', text: 'text-brand-600 dark:text-brand-400', icon: FileText, label: 'Sent' },
  draft: { bg: 'bg-surface-100 dark:bg-surface-200 border border-surface-200 dark:border-surface-300', text: 'text-surface-500 dark:text-surface-400', icon: FileText, label: 'Draft' },
  cancelled: { bg: 'bg-surface-200/50 border border-surface-300/40', text: 'text-surface-400', icon: X, label: 'Cancelled' },
};

const createEmptyItem = (): InvoiceItem => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random()}`,
  description: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
});

const getInitialInvoiceState = (): InvoiceCreate => ({
  client_name: '',
  client_email: '',
  items: [createEmptyItem()],
  tax_rate: 0.05,
  status: 'draft',
  issue_date: getCurrentDate(),
  due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  notes: 'Thank you for your business. Please remit payment within 30 days.',
});

export const InvoicesPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const currency = activeWorkspace?.currency || 'USD';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceCreate>(getInitialInvoiceState);
  const [formTouched, setFormTouched] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null);

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
      const params: InvoiceQueryParams = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const [invList, sumData] = await Promise.all([
        getInvoices(params),
        getInvoiceSummary(),
      ]);
      setInvoices(invList);
      setSummary(sumData);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, activeWorkspace?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Form helpers
  const handleOpenAdd = () => {
    setForm(getInitialInvoiceState());
    setEditingId(null);
    setFormTouched(false);
    setShowForm(true);
  };

  const handleOpenEdit = (inv: Invoice) => {
    setForm({
      invoice_number: inv.invoice_number,
      client_name: inv.client_name,
      client_email: inv.client_email,
      items: inv.items.map((i) => ({ ...i })),
      tax_rate: inv.tax_rate,
      status: inv.status,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      paid_date: inv.paid_date,
      notes: inv.notes,
    });
    setEditingId(inv.id);
    setFormTouched(false);
    setShowForm(true);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...form.items];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const p = field === 'unit_price' ? Number(value) : item.unit_price;
      item.amount = Math.round(q * p * 100) / 100;
    }
    updated[index] = item;
    setForm({ ...form, items: updated });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, createEmptyItem()] });
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const calculatedSubtotal = useMemo(() => {
    return form.items.reduce((acc, it) => acc + (it.amount || 0), 0);
  }, [form.items]);

  const calculatedTaxAmount = useMemo(() => {
    return Math.round(calculatedSubtotal * (form.tax_rate || 0) * 100) / 100;
  }, [calculatedSubtotal, form.tax_rate]);

  const calculatedTotal = useMemo(() => {
    return Math.round((calculatedSubtotal + calculatedTaxAmount) * 100) / 100;
  }, [calculatedSubtotal, calculatedTaxAmount]);

  const isFormValid =
    form.client_name.trim().length > 0 &&
    form.items.length > 0 &&
    form.items.every((it) => it.description.trim().length > 0 && it.quantity > 0 && it.unit_price >= 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await updateInvoice(editingId, form);
        showToast('Invoice updated successfully');
      } else {
        await createInvoice(form);
        showToast('Invoice created successfully');
      }
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (inv: Invoice) => {
    try {
      await updateInvoice(inv.id, {
        status: 'paid',
        paid_date: getCurrentDate(),
      });
      showToast(`Invoice ${inv.invoice_number} marked as Paid`);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteInvoice(pendingDelete.id);
      showToast('Invoice deleted successfully');
      setPendingDelete(null);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete invoice', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2',
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
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
              Invoices & Billing
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-200 border border-surface-200 dark:border-surface-300 text-surface-600 dark:text-surface-300 text-xs font-medium">
              {invoices.length} invoices
            </span>
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Manage client billing, payment statuses, and accounts receivable with automatic tax and line item calculation.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-1">
              <span>Total Invoiced</span>
              <FileText className="w-4 h-4 text-surface-400" />
            </div>
            <p className="text-lg md:text-xl font-bold font-mono text-surface-900 dark:text-surface-100 tabular-nums">
              {fmtCurrency(summary.total_invoiced, currency)}
            </p>
            <span className="text-[11px] text-surface-400 mt-0.5 block">{summary.count_invoiced} total invoices</span>
          </div>

          <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-1">
              <span>Paid In Full</span>
              <CheckCircle2 className="w-4 h-4 text-positive" />
            </div>
            <p className="text-lg md:text-xl font-bold font-mono text-positive tabular-nums">
              {fmtCurrency(summary.total_paid, currency)}
            </p>
            <span className="text-[11px] text-positive mt-0.5 block">{summary.count_paid} paid invoices</span>
          </div>

          <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-1">
              <span>Pending Collection</span>
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <p className="text-lg md:text-xl font-bold font-mono text-warning tabular-nums">
              {fmtCurrency(summary.total_pending, currency)}
            </p>
            <span className="text-[11px] text-warning mt-0.5 block">{summary.count_pending} pending invoices</span>
          </div>

          <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mb-1">
              <span>Overdue Receivables</span>
              <AlertTriangle className="w-4 h-4 text-risk" />
            </div>
            <p className="text-lg md:text-xl font-bold font-mono text-risk tabular-nums">
              {fmtCurrency(summary.total_overdue, currency)}
            </p>
            <span className="text-[11px] text-risk mt-0.5 block">{summary.count_overdue} overdue invoices</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 p-3.5 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, email, or invoice #..."
              className="w-full pl-9 pr-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-surface-400 hidden sm:block" />
            {(['', 'paid', 'pending', 'overdue', 'sent', 'draft'] as const).map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer',
                  statusFilter === s
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-surface-100 dark:bg-surface-200 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                )}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-surface-card rounded-2xl border border-surface-200 dark:border-surface-300 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-surface-500 dark:text-surface-400">Loading invoices...</p>
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
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-200 text-surface-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                No Invoices Found
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-sm mx-auto">
                {search || statusFilter
                  ? 'No invoices match the selected criteria. Try adjusting your search.'
                  : 'Create your first invoice to streamline billing, track receivables, and record verified revenues.'}
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead className="bg-surface-50/80 dark:bg-surface-200/50 text-surface-600 dark:text-surface-300 font-semibold border-b border-surface-200 dark:border-surface-300">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/60 dark:divide-surface-300/40">
                {invoices.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                  const Icon = cfg.icon;
                  const isOverdue =
                    inv.status === 'overdue' ||
                    (inv.status !== 'paid' && inv.status !== 'cancelled' && inv.due_date < getCurrentDate());

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-surface-50/60 dark:hover:bg-surface-200/30 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-surface-900 dark:text-surface-100">
                          {inv.client_name}
                        </div>
                        {inv.client_email && (
                          <div className="text-[11px] text-surface-500 dark:text-surface-400">
                            {inv.client_email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                            cfg.bg,
                            cfg.text
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {isOverdue && inv.status !== 'overdue' ? 'Overdue' : cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-surface-600 dark:text-surface-400 font-mono text-xs whitespace-nowrap">
                        {fmtDate(inv.issue_date)}
                      </td>
                      <td
                        className={clsx(
                          'py-3 px-4 font-mono text-xs whitespace-nowrap',
                          isOverdue ? 'text-risk font-semibold' : 'text-surface-600 dark:text-surface-400'
                        )}
                      >
                        {fmtDate(inv.due_date)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-surface-900 dark:text-surface-100 tabular-nums">
                        {fmtCurrency(inv.total, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => handleMarkAsPaid(inv)}
                              title="Mark as Paid"
                              className="p-1.5 text-positive hover:bg-positive-light rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewInvoice(inv)}
                            title="View / Print Invoice"
                            className="p-1.5 text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            title="Edit Invoice"
                            className="p-1.5 text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(inv)}
                            title="Delete Invoice"
                            className="p-1.5 text-surface-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-card rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-300 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-300 bg-surface-50/50 dark:bg-surface-200/30">
              <h2 className="text-base font-bold text-surface-900 dark:text-surface-100">
                {editingId ? 'Edit Invoice' : 'Create New Invoice'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Client / Business Name <span className="text-risk">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    required
                    className={clsx(
                      'w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                      formTouched && !form.client_name.trim()
                        ? 'border-risk'
                        : 'border-surface-200 dark:border-surface-300'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={form.client_email || ''}
                    onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                    placeholder="billing@acmecorp.com"
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>

              {/* Dates & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Issue Date <span className="text-risk">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Due Date <span className="text-risk">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as InvoiceStatus })}
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs md:text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-surface-800 dark:text-surface-200 uppercase tracking-wider">
                    Line Items
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line Item
                  </button>
                </div>

                <div className="border border-surface-200 dark:border-surface-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-surface-50 dark:bg-surface-200 text-surface-600 dark:text-surface-300 font-semibold border-b border-surface-200 dark:border-surface-300">
                      <tr>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-2 w-20 text-right">Qty</th>
                        <th className="py-2 px-2 w-28 text-right">Unit Price</th>
                        <th className="py-2 px-3 w-28 text-right">Amount</th>
                        <th className="py-2 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200/60 dark:divide-surface-300/40">
                      {form.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              placeholder="Product or service description"
                              required
                              className="w-full px-2 py-1 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-lg text-xs text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-lg text-xs font-mono text-right text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                              className="w-full px-2 py-1 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-lg text-xs font-mono text-right text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold text-surface-900 dark:text-surface-100 tabular-nums">
                            {fmtCurrency(item.amount, currency)}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            {form.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-1 text-surface-400 hover:text-rose-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax & Totals Breakdown */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-surface-200 dark:border-surface-300">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                    Tax Rate (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={Math.round((form.tax_rate || 0) * 10000) / 100}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm({ ...form, tax_rate: val / 100 });
                    }}
                    className="w-20 px-2 py-1 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-lg text-xs font-mono text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="w-full sm:w-64 space-y-1.5 text-xs text-surface-700 dark:text-surface-300">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{fmtCurrency(calculatedSubtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Amount:</span>
                    <span className="font-mono font-semibold">{fmtCurrency(calculatedTaxAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-surface-200 dark:border-surface-300 text-sm font-bold text-surface-900 dark:text-surface-100">
                    <span>Grand Total:</span>
                    <span className="font-mono text-brand-600 dark:text-brand-400">
                      {fmtCurrency(calculatedTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Payment Terms / Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Remittance details, bank routing, or payment instructions..."
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-200/50 border border-surface-200 dark:border-surface-300 rounded-xl text-xs text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                />
              </div>

              {/* Form Footer */}
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
                  {submitting ? 'Saving...' : editingId ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail / Printable View Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-card rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-300 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header / Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-300 bg-surface-50/50 dark:bg-surface-200/30 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  Invoice Preview — {previewInvoice.invoice_number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 dark:bg-surface-200 hover:bg-surface-200 text-surface-700 dark:text-surface-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white dark:bg-surface-card text-surface-900 dark:text-surface-100">
              <div className="flex justify-between items-start border-b border-surface-200 dark:border-surface-300 pb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
                    {activeWorkspace?.name || 'Accora Core Business'}
                  </h2>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                    {activeWorkspace?.industry || 'Commercial Services'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-bold tracking-tight block">
                    {previewInvoice.invoice_number}
                  </span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-surface-100 dark:bg-surface-200 border border-surface-200 dark:border-surface-300">
                    {previewInvoice.status}
                  </span>
                </div>
              </div>

              {/* Billed To & Dates */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <h4 className="font-bold text-surface-500 uppercase tracking-wider mb-1">Billed To</h4>
                  <p className="text-sm font-bold text-surface-900 dark:text-surface-100">
                    {previewInvoice.client_name}
                  </p>
                  {previewInvoice.client_email && (
                    <p className="text-surface-500 dark:text-surface-400 mt-0.5">
                      {previewInvoice.client_email}
                    </p>
                  )}
                </div>
                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-surface-500">Issue Date: </span>
                    <span className="font-mono font-semibold">{fmtDate(previewInvoice.issue_date)}</span>
                  </div>
                  <div>
                    <span className="text-surface-500">Due Date: </span>
                    <span className="font-mono font-semibold">{fmtDate(previewInvoice.due_date)}</span>
                  </div>
                  {previewInvoice.paid_date && (
                    <div>
                      <span className="text-positive font-semibold">Paid On: </span>
                      <span className="font-mono font-semibold text-positive">
                        {fmtDate(previewInvoice.paid_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-surface-200 dark:border-surface-300 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-surface-50 dark:bg-surface-200 font-semibold border-b border-surface-200 dark:border-surface-300">
                    <tr>
                      <th className="py-2.5 px-4">Item Description</th>
                      <th className="py-2.5 px-3 text-right w-20">Qty</th>
                      <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                      <th className="py-2.5 px-4 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/60 dark:divide-surface-300/40">
                    {previewInvoice.items.map((it, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-4 font-medium">{it.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {fmtCurrency(it.unit_price, currency)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">
                          {fmtCurrency(it.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-surface-500">Subtotal:</span>
                    <span className="font-mono font-semibold">
                      {fmtCurrency(previewInvoice.subtotal, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">
                      Tax ({(previewInvoice.tax_rate * 100).toFixed(1)}%):
                    </span>
                    <span className="font-mono font-semibold">
                      {fmtCurrency(previewInvoice.tax_amount, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-surface-200 dark:border-surface-300 text-sm font-bold">
                    <span>Total Due:</span>
                    <span className="font-mono text-brand-600 dark:text-brand-400">
                      {fmtCurrency(previewInvoice.total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {previewInvoice.notes && (
                <div className="pt-4 border-t border-surface-200 dark:border-surface-300 text-xs">
                  <h5 className="font-bold text-surface-500 uppercase tracking-wider mb-1">Notes & Terms</h5>
                  <p className="text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">
                    {previewInvoice.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-card rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-300 w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">
                Delete Invoice?
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                Are you sure you want to delete invoice{' '}
                <strong>"{pendingDelete.invoice_number}"</strong> for{' '}
                <strong>{pendingDelete.client_name}</strong>?
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
    </div>
  );
};

export default InvoicesPage;
