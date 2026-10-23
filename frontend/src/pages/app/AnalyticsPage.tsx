import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getMetrics,
  getBusinessSummary,
  getExpenseReport,
  getCashFlowReport,
} from '../../services/api';
import type {
  FinancialMetrics,
  BusinessSummary,
  ExpenseReport,
  CashFlowReport,
} from '../../types';
import { fmtCurrency, periodLabel } from '../../utils/format';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';


const CATEGORY_COLORS = [
  '#7c3aed',
  '#ec4899',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#64748b',
];

export const AnalyticsPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const currency = activeWorkspace?.currency || 'USD';

  const [timeRange, setTimeRange] = useState<number>(12); // 3, 6, 12 months
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<FinancialMetrics[]>([]);
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [expenseReport, setExpenseReport] = useState<ExpenseReport | null>(null);
  const [cashFlowReport, setCashFlowReport] = useState<CashFlowReport | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [metricsRes, summaryRes, expRes, cfRes] = await Promise.all([
        getMetrics(timeRange),
        getBusinessSummary(),
        getExpenseReport(timeRange),
        getCashFlowReport(timeRange),
      ]);
      setMetrics(metricsRes);
      setSummary(summaryRes);
      setExpenseReport(expRes);
      setCashFlowReport(cfRes);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.response?.data?.detail || 'Failed to load financial analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Aggregate ratios
  const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = metrics.reduce((sum, m) => sum + m.expenses, 0);
  const netTotalProfit = totalRevenue - totalExpenses;
  const avgMonthlyRev = metrics.length ? totalRevenue / metrics.length : 0;
  const avgMonthlyExp = metrics.length ? totalExpenses / metrics.length : 0;
  const overallMargin = totalRevenue > 0 ? (netTotalProfit / totalRevenue) * 100 : 0;

  // Current cash and runway
  const currentCash = metrics.length ? metrics[metrics.length - 1].cash_balance : 0;
  const runwayMonths = avgMonthlyExp > 0 ? (currentCash / avgMonthlyExp).toFixed(1) : '∞';

  // Area Chart Data
  const trendData = metrics.map((m) => ({
    period: periodLabel(m.period),
    Revenue: m.revenue,
    Expenses: m.expenses,
    Profit: m.profit,
    CashFlow: m.cash_flow,
  }));

  // Expense Pie Data
  const pieData = (expenseReport?.top_categories || []).map((cat) => ({
    name: cat.category,
    value: cat.amount,
    pct: cat.pct,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Financial Analytics & Performance
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Deep multi-period profitability curves, expense decomposition, and cash metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-[var(--border-default)] p-1 bg-[var(--bg-card)]">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setTimeRange(m)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  timeRange === m
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m} Months
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="text-xs font-bold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Analyzing historical trends...</p>
        </div>
      ) : (
        <>
          {/* Executive AI Performance Brief */}
          {summary && (
            <div className="p-5 rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-card)] shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] mb-2">
                <Sparkles className="w-4 h-4" /> Grounded Business Performance Brief ({summary.period})
              </div>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {summary.ai_summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--border-default)]">
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Strengths & Highlights
                  </span>
                  <ul className="space-y-1">
                    {summary.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)]">
                        • {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Watchpoints & Concerns
                  </span>
                  <ul className="space-y-1">
                    {summary.concerns.map((c, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)]">
                        • {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-1.5">
                    <Activity className="w-3.5 h-3.5" /> Strategic Next Steps
                  </span>
                  <ul className="space-y-1">
                    {summary.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)]">
                        • {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Ratios & Benchmarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <span className="text-xs text-[var(--text-muted)] font-medium">Avg Monthly Revenue</span>
              <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
                {fmtCurrency(avgMonthlyRev, currency)}
              </div>
              <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                Total: {fmtCurrency(totalRevenue, currency)}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <span className="text-xs text-[var(--text-muted)] font-medium">Avg Monthly Expenses</span>
              <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
                {fmtCurrency(avgMonthlyExp, currency)}
              </div>
              <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                Total: {fmtCurrency(totalExpenses, currency)}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <span className="text-xs text-[var(--text-muted)] font-medium">Net Operating Margin</span>
              <div className="text-xl font-bold text-[var(--text-primary)] mt-1">
                {overallMargin.toFixed(1)}%
              </div>
              <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                Net Profit: {fmtCurrency(netTotalProfit, currency)}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <span className="text-xs text-[var(--text-muted)] font-medium">Estimated Runway</span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {runwayMonths} Months
              </div>
              <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                Cash: {fmtCurrency(currentCash, currency)}
                {cashFlowReport ? ` • Net CF: ${fmtCurrency(cashFlowReport.net, currency)}` : ''}
              </span>
            </div>

          </div>

          {/* Revenue vs Expenses vs Profit Area Chart */}
          <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Financial Trajectory (Last {timeRange} Months)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Monthly progression of Revenue, Operating Expenses, and Net Profit
                </p>
              </div>
            </div>

            {trendData.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-revenue)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--chart-revenue)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-expense)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-expense)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-profit)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--chart-profit)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="period" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
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
                    <Area
                      type="monotone"
                      dataKey="Revenue"
                      stroke="var(--chart-revenue)"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Expenses"
                      stroke="var(--chart-expense)"
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Profit"
                      stroke="var(--chart-profit)"
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-[var(--text-muted)]">
                No financial records recorded for this time range.
              </div>
            )}
          </div>

          {/* Expense Breakdown & Top Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Expense Category Distribution
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Relative share of operating expenses across categories
                </p>
              </div>

              {pieData.length > 0 ? (
                <div className="h-64 w-full my-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={4}
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Pie>
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
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-xs text-[var(--text-muted)]">
                  No expense categories categorized yet.
                </div>
              )}

              <div className="text-center pt-2 border-t border-[var(--border-default)] text-xs text-[var(--text-muted)]">
                Total Expenses: {fmtCurrency(expenseReport?.total || 0, currency)}
              </div>
            </div>

            {/* Top Categories Table */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Top Cost Centers & Spend
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Ranked by nominal cash expenditure
              </p>

              {expenseReport?.top_categories && expenseReport.top_categories.length > 0 ? (
                <div className="space-y-3">
                  {expenseReport.top_categories.map((cat, idx) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                          />
                          {cat.category}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-[var(--text-primary)]">
                            {fmtCurrency(cat.amount, currency)}
                          </span>
                          <span className="text-[var(--text-muted)] ml-2">({cat.pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(cat.pct, 100)}%`,
                            backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No expense records available.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
