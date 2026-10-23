import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getPLReport,
  getExpenseReport,
  getCashFlowReport,
  getBusinessSummary,
  ReportFilterParams,
} from '../../services/api';
import type {
  PLReport,
  ExpenseReport,
  CashFlowReport,
  BusinessSummary,
} from '../../types';
import { fmtCurrency, fmtPct } from '../../utils/format';
import {
  DollarSign,
  BarChart3,
  Waves,
  Sparkles,
  Download,
  Printer,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Activity,
} from 'lucide-react';


const TABS = [
  { key: 'pnl', label: 'Profit & Loss', icon: DollarSign },
  { key: 'expenses', label: 'Expense Analysis', icon: BarChart3 },
  { key: 'cashflow', label: 'Cash Flow Statement', icon: Waves },
  { key: 'summary', label: 'Executive AI Summary', icon: Sparkles },
];

const PERIOD_PRESETS = [
  { label: 'Trailing 3 Months', months: 3 },
  { label: 'Trailing 6 Months', months: 6 },
  { label: 'Trailing 12 Months', months: 12 },
];

export const ReportsPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const currency = activeWorkspace?.currency || 'USD';

  const [activeTab, setActiveTab] = useState<string>('pnl');
  const [selectedMonths, setSelectedMonths] = useState<number>(12);
  const [customRange, setCustomRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [pnl, setPnl] = useState<PLReport | null>(null);
  const [expenses, setExpenses] = useState<ExpenseReport | null>(null);
  const [cashflow, setCashflow] = useState<CashFlowReport | null>(null);
  const [summary, setSummary] = useState<BusinessSummary | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const loadReport = useCallback(async () => {
    try {
      setError(null);
      const params: ReportFilterParams = {};
      if (customRange && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        params.months = selectedMonths;
      }

      if (activeTab === 'pnl') {
        const res = await getPLReport(params);
        setPnl(res);
      } else if (activeTab === 'expenses') {
        const res = await getExpenseReport(params);
        setExpenses(res);
      } else if (activeTab === 'cashflow') {
        const res = await getCashFlowReport(params);
        setCashflow(res);
      } else if (activeTab === 'summary') {
        const res = await getBusinessSummary(params);
        setSummary(res);
      }
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err?.response?.data?.detail || 'Failed to generate financial report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedMonths, customRange, startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    loadReport();
  }, [loadReport]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  // CSV Export Generator
  const handleExportCSV = () => {
    const rows: string[][] = [];
    const dateRangeStr = customRange && startDate && endDate ? `${startDate}_to_${endDate}` : `${selectedMonths}mo`;
    const filename = `accora_${activeTab}_report_${dateRangeStr}.csv`;

    if (activeTab === 'pnl' && pnl) {
      rows.push(['Accora Core - Profit & Loss Statement']);
      rows.push(['Workspace', activeWorkspace?.name || 'Workspace']);
      rows.push(['Period', pnl.period]);
      rows.push(['Currency', currency]);
      rows.push([]);
      rows.push(['Financial Metric', 'Amount']);
      rows.push(['Total Revenue', pnl.revenue.toFixed(2)]);
      rows.push(['Operating Expenses', pnl.expenses.toFixed(2)]);
      rows.push(['Gross Operating Profit', pnl.gross_profit.toFixed(2)]);
      rows.push(['Net Profit', pnl.net_profit.toFixed(2)]);
      rows.push(['Operating Margin', `${(pnl.margin * 100).toFixed(1)}%`]);
      rows.push([]);
      rows.push(['Operating Expense Breakdown', 'Amount']);
      Object.entries(pnl.expense_breakdown).forEach(([cat, amt]) => {
        rows.push([cat, amt.toFixed(2)]);
      });
    } else if (activeTab === 'expenses' && expenses) {
      rows.push(['Accora Core - Expense Analysis Report']);
      rows.push(['Workspace', activeWorkspace?.name || 'Workspace']);
      rows.push(['Period', expenses.period]);
      rows.push(['Currency', currency]);
      rows.push(['Total Operating Spend', expenses.total.toFixed(2)]);
      rows.push(['Change vs Prior Period', `${expenses.change_vs_prior.toFixed(1)}%`]);
      rows.push([]);
      rows.push(['Category', 'Nominal Spend', 'Percentage Share']);
      expenses.top_categories.forEach((c) => {
        rows.push([c.category, c.amount.toFixed(2), `${c.pct.toFixed(1)}%`]);
      });
    } else if (activeTab === 'cashflow' && cashflow) {
      rows.push(['Accora Core - Cash Flow Statement']);
      rows.push(['Workspace', activeWorkspace?.name || 'Workspace']);
      rows.push(['Period', cashflow.period]);
      rows.push(['Currency', currency]);
      rows.push([]);
      rows.push(['Cash Movement', 'Amount']);
      rows.push(['Cash Inflow (Receipts)', cashflow.inflow.toFixed(2)]);
      rows.push(['Cash Outflow (Disbursements)', cashflow.outflow.toFixed(2)]);
      rows.push(['Net Operational Cash Flow', cashflow.net.toFixed(2)]);
      rows.push(['Opening Cash Balance', cashflow.opening_balance.toFixed(2)]);
      rows.push(['Closing Cash Reserve', cashflow.closing_balance.toFixed(2)]);
    } else if (activeTab === 'summary' && summary) {
      rows.push(['Accora Core - Executive AI Business Summary']);
      rows.push(['Workspace', activeWorkspace?.name || 'Workspace']);
      rows.push(['Period', summary.period]);
      rows.push([]);
      rows.push(['Executive Narrative', `"${summary.ai_summary.replace(/"/g, '""')}"`]);
      rows.push([]);
      rows.push(['Key Highlights']);
      summary.highlights.forEach((h) => rows.push([`"${h.replace(/"/g, '""')}"`]));
      rows.push([]);
      rows.push(['Watchpoints & Risks']);
      summary.concerns.forEach((c) => rows.push([`"${c.replace(/"/g, '""')}"`]));
      rows.push([]);
      rows.push(['Recommendations']);
      summary.recommendations.forEach((r) => rows.push([`"${r.replace(/"/g, '""')}"`]));
    }

    if (rows.length === 0) return;

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage(`Exported ${filename} successfully.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Browser Print / Save as PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Print-specific style overrides */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          nav, aside, header, .no-print {
            display: none !important;
          }
          .printable-report {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Financial Reports & Statements
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> Reconciled with Ledger
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Audit-ready Profit & Loss, Cash Flow Statements, and Categorized Expense Ledgers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-xs font-semibold transition-colors disabled:opacity-50"
            title="Download CSV file"
          >
            <Download className="w-4 h-4 text-[var(--brand-primary)]" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-xs font-semibold transition-colors disabled:opacity-50"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4 text-[var(--brand-primary)]" />
            Print / PDF
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-1 no-print overflow-x-auto">
        <div className="flex items-center gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filtering Bar */}
      <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5 mr-1">
            <Calendar className="w-3.5 h-3.5" /> Date Range:
          </span>

          {PERIOD_PRESETS.map((p) => (
            <button
              key={p.months}
              onClick={() => {
                setCustomRange(false);
                setSelectedMonths(p.months);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !customRange && selectedMonths === p.months
                  ? 'bg-[var(--brand-light)] border border-[var(--brand-border)] text-[var(--brand-primary)]'
                  : 'border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.label}
            </button>
          ))}

          <button
            onClick={() => setCustomRange(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              customRange
                ? 'bg-[var(--brand-light)] border border-[var(--brand-border)] text-[var(--brand-primary)]'
                : 'border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Custom Range
          </button>
        </div>

        {customRange && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            />
            <button
              onClick={loadReport}
              disabled={!startDate || !endDate}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] disabled:opacity-50 transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadReport} className="text-xs font-bold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Printable Report Container */}
      <div ref={printAreaRef} className="printable-report space-y-6">
        {/* Printable Letterhead (Only visible during print) */}
        <div className="hidden print:block pb-4 mb-4 border-b border-gray-300">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accora Core</h1>
              <p className="text-xs text-gray-600">Your Business, With Intelligence</p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-gray-900 capitalize">
                {activeTab.replace('_', ' ')} Statement
              </h2>
              <p className="text-xs text-gray-600">Workspace: {activeWorkspace?.name}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 no-print">
            <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">Generating audit statement...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: PROFIT & LOSS */}
            {activeTab === 'pnl' && pnl && (
              <div className="space-y-6">
                {/* P&L KPI Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Total Operating Revenue</span>
                    <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
                      {fmtCurrency(pnl.revenue, currency)}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                      Period: {pnl.period}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Operating Expenses</span>
                    <div className="text-xl font-bold text-rose-500 mt-1">
                      {fmtCurrency(pnl.expenses, currency)}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                      Excludes non-operational loans
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Net Operating Profit</span>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        pnl.net_profit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {fmtCurrency(pnl.net_profit, currency)}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                      Bottom line earnings
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Operating Margin</span>
                    <div className="text-xl font-bold text-[var(--brand-primary)] mt-1">
                      {(pnl.margin * 100).toFixed(1)}%
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                      Net profit / Revenue
                    </span>
                  </div>
                </div>

                {/* Formal P&L Statement Table */}
                <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        Statement of Profit and Loss
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Period: {pnl.period} • Currency: {currency}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)] text-sm">
                    {/* Revenue Section */}
                    <div className="py-3 flex items-center justify-between font-bold text-[var(--text-primary)]">
                      <span>Total Operating Income</span>
                      <span>{fmtCurrency(pnl.revenue, currency)}</span>
                    </div>

                    {/* Operating Expenses Section */}
                    <div className="py-3">
                      <div className="flex items-center justify-between font-bold text-[var(--text-primary)] mb-2">
                        <span>Operating Expenses</span>
                        <span className="text-rose-500">({fmtCurrency(pnl.expenses, currency)})</span>
                      </div>

                      <div className="pl-4 space-y-1.5 text-xs text-[var(--text-secondary)]">
                        {Object.entries(pnl.expense_breakdown).length > 0 ? (
                          Object.entries(pnl.expense_breakdown).map(([cat, val]) => (
                            <div key={cat} className="flex items-center justify-between">
                              <span>{cat}</span>
                              <span className="font-medium text-[var(--text-primary)]">
                                {fmtCurrency(val, currency)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[var(--text-muted)] italic">No expenses recorded for this period.</div>
                        )}
                      </div>
                    </div>

                    {/* Gross Profit */}
                    <div className="py-3 flex items-center justify-between font-bold text-[var(--text-primary)] bg-[var(--bg-secondary)] px-3 rounded-lg">
                      <span>Gross Profit</span>
                      <span>{fmtCurrency(pnl.gross_profit, currency)}</span>
                    </div>

                    {/* Net Profit Summary */}
                    <div className="py-4 flex items-center justify-between text-base font-extrabold text-[var(--text-primary)]">
                      <span>Net Operating Income</span>
                      <span
                        className={
                          pnl.net_profit >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {fmtCurrency(pnl.net_profit, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EXPENSE BREAKDOWN */}
            {activeTab === 'expenses' && expenses && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Total Operating Spend</span>
                    <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                      {fmtCurrency(expenses.total, currency)}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                      Period: {expenses.period}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Comparison vs Prior Period</span>
                    <div
                      className={`text-2xl font-bold mt-1 ${
                        expenses.change_vs_prior <= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {fmtPct(expenses.change_vs_prior)}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                      {expenses.change_vs_prior <= 0 ? 'Spend decreased (disciplined)' : 'Spend increased'}
                    </span>
                  </div>
                </div>

                {/* Expense Table */}
                <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">
                    Categorized Operating Expenditures
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[var(--text-muted)] border-b border-[var(--border-default)]">
                        <tr>
                          <th className="py-2.5">Category</th>
                          <th className="py-2.5 text-right">Nominal Spend</th>
                          <th className="py-2.5 text-right">Share of Expenses</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {expenses.top_categories.map((c) => (
                          <tr key={c.category} className="hover:bg-[var(--bg-secondary)]">
                            <td className="py-3 font-semibold text-[var(--text-primary)]">
                              {c.category}
                            </td>
                            <td className="py-3 text-right font-bold text-[var(--text-primary)]">
                              {fmtCurrency(c.amount, currency)}
                            </td>
                            <td className="py-3 text-right font-medium text-[var(--text-secondary)]">
                              {c.pct.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CASH FLOW STATEMENT */}
            {activeTab === 'cashflow' && cashflow && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Opening Cash Balance</span>
                    <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
                      {fmtCurrency(cashflow.opening_balance, currency)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Net Operational Cash Flow</span>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        cashflow.net >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {fmtCurrency(cashflow.net, currency)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Closing Cash Balance</span>
                    <div className="text-xl font-bold text-[var(--brand-primary)] mt-1">
                      {fmtCurrency(cashflow.closing_balance, currency)}
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">
                    Cash Flow Statement of Inflows & Outflows
                  </h3>

                  <div className="divide-y divide-[var(--border-subtle)] text-sm">
                    <div className="py-3 flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Opening Cash Reserve</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {fmtCurrency(cashflow.opening_balance, currency)}
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        + Cash Receipts (Inflow)
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {fmtCurrency(cashflow.inflow, currency)}
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <span className="text-rose-500 font-semibold">
                        - Cash Disbursements (Outflow)
                      </span>
                      <span className="font-bold text-rose-500">
                        ({fmtCurrency(cashflow.outflow, currency)})
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between bg-[var(--bg-secondary)] px-3 rounded-lg font-bold">
                      <span>Net Cash Movement</span>
                      <span
                        className={
                          cashflow.net >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {fmtCurrency(cashflow.net, currency)}
                      </span>
                    </div>

                    <div className="py-4 flex items-center justify-between text-base font-extrabold text-[var(--text-primary)]">
                      <span>Ending Cash Position</span>
                      <span className="text-[var(--brand-primary)]">
                        {fmtCurrency(cashflow.closing_balance, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EXECUTIVE SUMMARY */}
            {activeTab === 'summary' && summary && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-card)] shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                    <Sparkles className="w-4 h-4" /> Grounded Executive Analysis ({summary.period})
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {summary.ai_summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Highlights */}
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-[var(--bg-card)] shadow-sm space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Key Strengths
                    </span>
                    <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                      {summary.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Concerns */}
                  <div className="p-5 rounded-2xl border border-rose-500/20 bg-[var(--bg-card)] shadow-sm space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> Watchpoints
                    </span>
                    <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                      {summary.concerns.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div className="p-5 rounded-2xl border border-indigo-500/20 bg-[var(--bg-card)] shadow-sm space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Activity className="w-4 h-4" /> Action Items
                    </span>
                    <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                      {summary.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
