import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getForecast, getCashFlowStatus } from '../../services/api';
import type { Forecast, CashFlowStatus } from '../../types';
import { fmtCurrency, periodLabel } from '../../utils/format';
import {
  AlertCircle,
  RefreshCw,
  Info,
  ShieldCheck,
} from 'lucide-react';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const ForecastPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const currency = activeWorkspace?.currency || 'USD';

  const [metric, setMetric] = useState<string>('cash_flow');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [cashFlowStatus, setCashFlowStatus] = useState<CashFlowStatus | null>(null);

  const loadForecast = useCallback(async () => {
    try {
      setError(null);
      const [fRes, cfRes] = await Promise.all([
        getForecast(metric, 3),
        getCashFlowStatus(),
      ]);
      setForecast(fRes);
      setCashFlowStatus(cfRes);
    } catch (err: any) {
      console.error('Forecast error:', err);
      setError(err?.response?.data?.detail || 'Failed to compute forecast.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [metric]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadForecast();
  };

  // Prepare chart data with actual vs predicted split
  const chartData = (forecast?.points || []).map((p) => ({
    date: periodLabel(p.date),
    actual: p.is_predicted ? undefined : p.value,
    projected: p.is_predicted ? p.value : undefined,
    confidenceLow: p.is_predicted ? p.confidence_low : undefined,
    confidenceHigh: p.is_predicted ? p.confidence_high : undefined,
    isPredicted: p.is_predicted,
  }));

  // Link the last actual point to the projected line for continuous visual rendering
  if (chartData.length > 0) {
    const lastActualIdx = chartData.map((d) => d.actual !== undefined).lastIndexOf(true);
    if (lastActualIdx >= 0 && lastActualIdx < chartData.length - 1) {
      chartData[lastActualIdx].projected = chartData[lastActualIdx].actual;
      chartData[lastActualIdx].confidenceLow = chartData[lastActualIdx].actual;
      chartData[lastActualIdx].confidenceHigh = chartData[lastActualIdx].actual;
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Cash Flow & Financial Forecasting
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand-light)] text-[var(--brand-primary)] border border-[var(--brand-border)]">
              3-Month Horizon
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Predictive modeling based on historical ledger momentum and recurring expense baseline
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Metric Selector */}
          <div className="inline-flex items-center rounded-lg border border-[var(--border-default)] p-1 bg-[var(--bg-card)]">
            {[
              { id: 'cash_flow', label: 'Cash Flow' },
              { id: 'revenue', label: 'Revenue' },
              { id: 'expenses', label: 'Expenses' },
              { id: 'profit', label: 'Net Profit' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  metric === m.id
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            title="Refresh Forecast"
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
          <button onClick={loadForecast} className="text-xs font-bold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Running predictive trend fitting...</p>
        </div>
      ) : (
        <>
          {/* Top Cash Solvency Card */}
          {cashFlowStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Cash Flow Solvency State
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {cashFlowStatus.label}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      cashFlowStatus.status === 'healthy'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : cashFlowStatus.status === 'watch'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {cashFlowStatus.status ? cashFlowStatus.status.toUpperCase() : 'UNKNOWN'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {cashFlowStatus.explanation}
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Projected End-of-Quarter Cash
                </span>
                <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {fmtCurrency(cashFlowStatus.projected_balance_3mo, currency)}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Estimated cash reserve available after 3 projected months of net operational cash flows.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-card)] shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                    Forecast Guidance
                  </span>
                  <p className="text-xs text-[var(--text-primary)] font-medium mt-2 leading-relaxed">
                    {cashFlowStatus.recommendation}
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Deterministic regression bounds
                </div>
              </div>
            </div>
          )}

          {/* Predictive Chart */}
          <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] capitalize">
                  {metric.replace('_', ' ')} Forecast Trajectory
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Solid line = Verified actuals; Dashed line = 3-month predictive extrapolation
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <span className="w-3 h-0.5 bg-[var(--brand-primary)] inline-block" /> Actuals
                </span>
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <span className="w-3 h-0.5 border-t border-dashed border-[var(--brand-secondary)] inline-block" /> Projected
                </span>
                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500/20 inline-block" /> Confidence Band
                </span>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
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
                      formatter={(val: any) => [val !== undefined ? fmtCurrency(val, currency) : '--']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />

                    {/* Confidence Band Area */}
                    <Area
                      type="monotone"
                      dataKey="confidenceHigh"
                      stroke="none"
                      fill="url(#confidenceBand)"
                      name="Confidence Range"
                    />

                    {/* Actuals Line */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Recorded"
                      stroke="var(--brand-primary)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: 'var(--brand-primary)' }}
                      connectNulls={false}
                    />

                    {/* Projected Line */}
                    <Line
                      type="monotone"
                      dataKey="projected"
                      name="Projected"
                      stroke="var(--brand-secondary)"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: 'var(--brand-secondary)' }}
                      connectNulls={true}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-[var(--text-muted)]">
                Not enough historical transactions to extrapolate forecast.
              </div>
            )}
          </div>

          {/* Methodology & Projection Details Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                Projected Months Breakdown
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Detailed forecast points with confidence bounds
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[var(--text-muted)] border-b border-[var(--border-default)]">
                    <tr>
                      <th className="py-2">Period</th>
                      <th className="py-2">Type</th>
                      <th className="py-2 text-right">Projected Value</th>
                      <th className="py-2 text-right">Confidence Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {forecast?.points.map((p, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-secondary)]">
                        <td className="py-2.5 font-medium text-[var(--text-primary)]">
                          {periodLabel(p.date)}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.is_predicted
                                ? 'bg-purple-500/10 text-purple-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}
                          >
                            {p.is_predicted ? 'Projected' : 'Actual'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-[var(--text-primary)]">
                          {fmtCurrency(p.value, currency)}
                        </td>
                        <td className="py-2.5 text-right text-[var(--text-muted)]">
                          {p.confidence_low != null && p.confidence_high != null
                            ? `${fmtCurrency(p.confidence_low, currency)} - ${fmtCurrency(
                                p.confidence_high,
                                currency
                              )}`
                            : 'Actual Recorded'}

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Methodology & Transparent Caveat */}
            <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                  <Info className="w-4 h-4" /> Methodology & Transparency
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mt-2">
                  Linear Extrapolation with Weighted Momentum
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {forecast?.explanation ||
                    'Forecasts utilize historical monthly trend vectors combined with recurring monthly fixed expense commitments from your workspace setup.'}
                </p>
                <div className="mt-4 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] space-y-1.5">
                  <span className="font-bold text-[var(--text-primary)] block">Mathematical Assumptions:</span>
                  <p>• Historical growth slope is blended with rolling 3-month variance.</p>
                  <p>• Confidence range reflects +/- 1 standard error of the monthly deviation.</p>
                  <p>• Uncollected overdue invoices are excluded until cleared into cash receipts.</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-default)] text-[11px] text-[var(--text-muted)] italic">
                Notice: Financial projections are mathematical estimations designed for operational planning. They do not constitute guaranteed investment or financial results.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ForecastPage;
