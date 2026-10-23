import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getLatestMetrics,
  getMetrics,
  getHealthScore,
  getCashFlowStatus,
  getNextBestMove,
  getTransactions,
  getInvoiceSummary,
} from '../../services/api';
import type {
  FinancialMetrics,
  BusinessHealthScore,
  CashFlowStatus,
  NextBestMove,
  Transaction,
  InvoiceSummary,
} from '../../types';
import { fmtCurrency, fmtPct, fmtDate, periodLabel } from '../../utils/format';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowRight,
  Plus,
  FileText,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Info,
  Sliders,
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user, activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const currency = activeWorkspace?.currency || 'USD';

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [metricsHistory, setMetricsHistory] = useState<FinancialMetrics[]>([]);
  const [latestMetric, setLatestMetric] = useState<FinancialMetrics | null>(null);
  const [healthScore, setHealthScore] = useState<BusinessHealthScore | null>(null);
  const [cashFlowStatus, setCashFlowStatus] = useState<CashFlowStatus | null>(null);
  const [nextBestMove, setNextBestMove] = useState<NextBestMove | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [
        metricsRes,
        latestRes,
        healthRes,
        cfRes,
        moveRes,
        txnsRes,
        invRes,
      ] = await Promise.allSettled([
        getMetrics(6),
        getLatestMetrics(),
        getHealthScore(),
        getCashFlowStatus(),
        getNextBestMove(),
        getTransactions({ sort_by: 'date', sort_dir: 'desc' }),
        getInvoiceSummary(),
      ]);

      if (metricsRes.status === 'fulfilled') setMetricsHistory(metricsRes.value);
      if (latestRes.status === 'fulfilled') setLatestMetric(latestRes.value);
      if (healthRes.status === 'fulfilled') setHealthScore(healthRes.value);
      if (cfRes.status === 'fulfilled') setCashFlowStatus(cfRes.value);
      if (moveRes.status === 'fulfilled') setNextBestMove(moveRes.value);
      if (txnsRes.status === 'fulfilled') setRecentTransactions(txnsRes.value.slice(0, 5));
      if (invRes.status === 'fulfilled') setInvoiceSummary(invRes.value);

      // Only display global error if all core telemetry endpoints failed
      if (metricsRes.status === 'rejected' && latestRes.status === 'rejected' && healthRes.status === 'rejected') {
        const primaryErr: any = metricsRes.reason || latestRes.reason || healthRes.reason;
        setError(primaryErr?.response?.data?.detail || 'Failed to load financial dashboard. Please retry.');
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.response?.data?.detail || 'Failed to load financial dashboard. Please retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Prepare chart data
  const chartData = metricsHistory.map((m) => ({
    period: periodLabel(m.period),
    revenue: m.revenue,
    expenses: m.expenses,
    profit: m.profit,
  }));

  // Health Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Financial Command Center
            </h1>
            {latestMetric?.is_estimated && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Info className="w-3 h-3" /> Baseline Estimates
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Welcome, {user?.full_name || 'Founder'} • {activeWorkspace?.name || 'Active Workspace'} • Real-time financial telemetry & AI guidance
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            title="Refresh Financial Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/app/intelligence')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--brand-light)] border border-[var(--brand-border)] text-[var(--brand-primary)] hover:opacity-90 text-sm font-medium transition-all"
          >
            <Sparkles className="w-4 h-4" />
            AI Copilot
          </button>

          <button
            onClick={() => navigate('/app/invoices')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            New Invoice
          </button>

          <button
            onClick={() => navigate('/app/transactions')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Computing financial metrics...</p>
        </div>
      ) : (
        <>
          {/* Key Strategic Row: Health Score, Runway Status & Next Best Move */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Health Score Card */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Business Health Score
                  </span>
                  <Activity className="w-4 h-4 text-[var(--brand-primary)]" />
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-[var(--text-primary)]">
                    {typeof healthScore?.overall === 'number' ? healthScore.overall.toFixed(0) : '--'}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">/ 100</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getScoreColor(
                      typeof healthScore?.overall === 'number' ? healthScore.overall : 0
                    )}`}
                  >
                    {healthScore?.label || 'Calculating'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {healthScore?.explanation}
                </p>
              </div>

              {healthScore && (
                <div className="mt-4 pt-3 border-t border-[var(--border-default)] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Revenue Performance</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {healthScore.revenue_performance}/25
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Profitability</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {healthScore.profitability}/25
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Expense Control</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {healthScore.expense_control}/25
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Cash Solvency</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {healthScore.cash_flow_health}/25
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cash Flow Status & Runway */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Cash Flow & Runway
                  </span>
                  <Wallet className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {cashFlowStatus?.label || 'Solvent'}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      cashFlowStatus?.status === 'healthy'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : cashFlowStatus?.status === 'watch'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {cashFlowStatus?.status ? cashFlowStatus.status.toUpperCase() : 'UNKNOWN'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {cashFlowStatus?.explanation}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Projected 3-Mo Cash</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {fmtCurrency(cashFlowStatus?.projected_balance_3mo || 0, currency)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[var(--brand-primary)] bg-[var(--brand-light)] p-2 rounded-lg border border-[var(--brand-border)]">
                  💡 {cashFlowStatus?.recommendation}
                </div>
              </div>
            </div>

            {/* Next Best Move Card */}
            <div className="p-5 rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-card)] shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent pointer-events-none rounded-tr-2xl" />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                  <Sparkles className="w-3.5 h-3.5" /> Next Best Move
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mt-2">
                  {nextBestMove?.title || 'Review Monthly Financials'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {nextBestMove?.description}
                </p>
                {nextBestMove?.why_it_matters && (
                  <p className="text-xs text-[var(--text-muted)] mt-2 italic">
                    Why it matters: {nextBestMove.why_it_matters}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-default)] flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {nextBestMove?.impact}
                </span>
                <button
                  onClick={() => navigate(nextBestMove?.action_url || '/app/intelligence')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] transition-colors shadow-sm"
                >
                  {nextBestMove?.action_label || 'Take Action'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Primary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium">
                <span>Total Monthly Revenue</span>
                <DollarSign className="w-4 h-4 text-[var(--brand-primary)]" />
              </div>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                {fmtCurrency(latestMetric?.revenue || 0, currency)}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                {(latestMetric?.revenue_change_pct || 0) >= 0 ? (
                  <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    {fmtPct(latestMetric?.revenue_change_pct || 0)}
                  </span>
                ) : (
                  <span className="flex items-center font-semibold text-rose-600 dark:text-rose-400">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    {fmtPct(latestMetric?.revenue_change_pct || 0)}
                  </span>
                )}
                <span className="text-[var(--text-muted)]">vs last month</span>
              </div>
            </div>

            {/* Expenses */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium">
                <span>Total Monthly Expenses</span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                {fmtCurrency(latestMetric?.expenses || 0, currency)}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                {(latestMetric?.expenses_change_pct || 0) <= 0 ? (
                  <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    {fmtPct(latestMetric?.expenses_change_pct || 0)}
                  </span>
                ) : (
                  <span className="flex items-center font-semibold text-rose-600 dark:text-rose-400">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    {fmtPct(latestMetric?.expenses_change_pct || 0)}
                  </span>
                )}
                <span className="text-[var(--text-muted)]">vs last month</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium">
                <span>Net Profit</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                {fmtCurrency(latestMetric?.profit || 0, currency)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-[var(--text-primary)]">
                  {((latestMetric?.margin || 0) * 100).toFixed(1)}%
                </span>
                <span className="text-[var(--text-muted)]">operating margin</span>
              </div>
            </div>

            {/* Cash Balance / Outstanding AR */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-medium">
                <span>Cash on Hand</span>
                <Wallet className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                {fmtCurrency(latestMetric?.cash_balance || 0, currency)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span>Outstanding AR:</span>
                <span className="font-semibold text-[var(--text-secondary)]">
                  {fmtCurrency(latestMetric?.outstanding || 0, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Revenue vs Expenses Chart & Quick Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Revenue vs. Expenses Trend
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Monthly income and outgoing cash flow comparison
                  </p>
                </div>
                <button
                  onClick={() => navigate('/app/analytics')}
                  className="text-xs font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                >
                  Deep Analytics <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {chartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="period"
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-default)',
                          borderRadius: '0.75rem',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                        }}
                        formatter={(val: number) => [fmtCurrency(val, currency)]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Bar dataKey="revenue" name="Revenue" fill="var(--chart-revenue)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="var(--chart-expense)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-xs text-[var(--text-muted)]">
                  <Calendar className="w-8 h-8 mb-2 opacity-50" />
                  No historical records available to render trend.
                </div>
              )}
            </div>

            {/* Quick Financial Scenarios & Forecast Launcher */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Intelligence Tools
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Simulate decisions or predict upcoming quarter
                </p>

                <div className="mt-4 space-y-3">
                  <div
                    onClick={() => navigate('/app/scenarios')}
                    className="p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand-border)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                            What-If Simulator
                          </h4>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Model hires, expense cuts, or revenue shifts
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]" />
                    </div>
                  </div>

                  <div
                    onClick={() => navigate('/app/forecast')}
                    className="p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand-border)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                            Cash Flow Forecast
                          </h4>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            3-month predictive linear extrapolation
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]" />
                    </div>
                  </div>

                  <div
                    onClick={() => navigate('/app/intelligence')}
                    className="p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand-border)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                            Financial Copilot
                          </h4>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Ask questions & audit anomalies offline
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-default)] text-center">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Engine: Deterministic Offline AI • No paid APIs
                </span>
              </div>
            </div>
          </div>

          {/* Activity Section: Recent Ledger & Invoicing Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Recent Transactions
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Latest authorized ledger operations
                  </p>
                </div>
                <button
                  onClick={() => navigate('/app/transactions')}
                  className="text-xs font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentTransactions.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            t.type === 'income'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {t.type === 'income' ? '+' : '-'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                            {t.description}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {t.category} • {fmtDate(t.date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs font-bold ${
                            t.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {t.type === 'income' ? '+' : '-'}
                          {fmtCurrency(t.amount, currency)}
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                            t.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                  No transactions found.
                  <button
                    onClick={() => navigate('/app/transactions')}
                    className="block mx-auto mt-2 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                  >
                    Add your first transaction
                  </button>
                </div>
              )}
            </div>

            {/* Invoicing Health & Overdue Tracker */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Accounts Receivable Status
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Invoicing pipeline and pending collections
                  </p>
                </div>
                <button
                  onClick={() => navigate('/app/invoices')}
                  className="text-xs font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                >
                  Manage Invoices <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {invoiceSummary ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Paid Collected
                      </span>
                      <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                        {fmtCurrency(invoiceSummary.total_paid, currency)}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {invoiceSummary.count_paid} invoices
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        Pending / Due
                      </span>
                      <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                        {fmtCurrency(invoiceSummary.total_pending, currency)}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {invoiceSummary.count_pending} invoices
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        Overdue AR
                      </span>
                      <div className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                        {fmtCurrency(invoiceSummary.total_overdue, currency)}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {invoiceSummary.count_overdue} invoices
                      </span>
                    </div>
                  </div>

                  {invoiceSummary.count_overdue > 0 ? (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {invoiceSummary.count_overdue} invoice(s) totaling{' '}
                          {fmtCurrency(invoiceSummary.total_overdue, currency)} are overdue.
                        </span>
                      </div>
                      <button
                        onClick={() => navigate('/app/invoices')}
                        className="font-bold underline hover:no-underline"
                      >
                        Follow up
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>All invoices are in good standing with zero overdue accounts.</span>
                    </div>
                  )}

                  <div className="text-xs text-[var(--text-secondary)] pt-2 flex items-center justify-between">
                    <span>Lifetime Invoiced Total:</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {fmtCurrency(invoiceSummary.total_invoiced, currency)} ({invoiceSummary.count_invoiced} total)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                  No invoices created yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
