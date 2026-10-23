import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getLatestMetrics, getHealthScore, simulateWhatIf } from '../../services/api';
import type { FinancialMetrics, BusinessHealthScore, WhatIfResult } from '../../types';
import { fmtCurrency } from '../../utils/format';
import {
  Sliders,
  Sparkles,
  RotateCcw,
  RefreshCw,
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

export const ScenariosPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const currency = activeWorkspace?.currency || 'USD';

  // Baseline state
  const [baselineMetrics, setBaselineMetrics] = useState<FinancialMetrics | null>(null);
  const [baselineHealth, setBaselineHealth] = useState<BusinessHealthScore | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Simulation controls state
  const [scenarioName, setScenarioName] = useState<string>('Custom Scenario');
  const [revenueChangePct, setRevenueChangePct] = useState<number>(0);
  const [expenseChangePct, setExpenseChangePct] = useState<number>(0);
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [churnPct, setChurnPct] = useState<number>(0);
  const [delayedArDays, setDelayedArDays] = useState<number>(0);

  // Simulation results
  const [simulationResult, setSimulationResult] = useState<WhatIfResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Load baseline on mount
  useEffect(() => {
    const fetchBaseline = async () => {
      try {
        const [mRes, hRes] = await Promise.all([
          getLatestMetrics(),
          getHealthScore(),
        ]);
        setBaselineMetrics(mRes);
        setBaselineHealth(hRes);
      } catch (err) {
        console.error('Failed to load baseline metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBaseline();
  }, []);

  // Run simulation whenever controls change
  const runSimulation = useCallback(async () => {
    setIsSimulating(true);
    try {
      const res = await simulateWhatIf({
        description: scenarioName,
        params: {
          revenue_change_pct: revenueChangePct,
          expense_change_pct: expenseChangePct,
          monthly_salary: monthlySalary,
          churn_pct: churnPct,
          delayed_ar_days: delayedArDays,
        },
      });
      setSimulationResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [scenarioName, revenueChangePct, expenseChangePct, monthlySalary, churnPct, delayedArDays]);

  useEffect(() => {
    if (baselineMetrics) {
      const debounceTimer = setTimeout(() => {
        runSimulation();
      }, 250);
      return () => clearTimeout(debounceTimer);
    }
  }, [baselineMetrics, runSimulation]);

  // Presets
  const applyPreset = (preset: {
    name: string;
    rev: number;
    exp: number;
    salary: number;
    churn: number;
    delay: number;
  }) => {
    setScenarioName(preset.name);
    setRevenueChangePct(preset.rev);
    setExpenseChangePct(preset.exp);
    setMonthlySalary(preset.salary);
    setChurnPct(preset.churn);
    setDelayedArDays(preset.delay);
  };

  const handleReset = () => {
    setScenarioName('Baseline (Reset)');
    setRevenueChangePct(0);
    setExpenseChangePct(0);
    setMonthlySalary(0);
    setChurnPct(0);
    setDelayedArDays(0);
  };

  // Chart comparison data
  const comparisonData = [
    {
      metric: 'Revenue',
      Baseline: baselineMetrics?.revenue || 0,
      Projected: simulationResult?.projected_revenue || 0,
    },
    {
      metric: 'Expenses',
      Baseline: baselineMetrics?.expenses || 0,
      Projected: simulationResult?.projected_expenses || 0,
    },
    {
      metric: 'Net Profit',
      Baseline: baselineMetrics?.profit || 0,
      Projected: simulationResult?.projected_profit || 0,
    },
    {
      metric: 'Cash Flow',
      Baseline: baselineMetrics?.cash_flow || 0,
      Projected: simulationResult?.projected_cash_flow || 0,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              What-If Financial Simulator
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand-light)] text-[var(--brand-primary)] border border-[var(--brand-border)]">
              Deterministic Sandbox
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Model the cash and health score impact of hiring, revenue shocks, delayed collections, or expense cuts
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Baseline
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Initializing simulation baseline...</p>
        </div>
      ) : (
        <>
          {/* Quick Presets Bar */}
          <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2.5">
              Quick Scenario Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  applyPreset({
                    name: 'New Hire ($4,500/mo)',
                    rev: 0,
                    exp: 0,
                    salary: 4500,
                    churn: 0,
                    delay: 0,
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--brand-border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all"
              >
                💼 New Hire ($4,500/mo)
              </button>

              <button
                onClick={() =>
                  applyPreset({
                    name: '15% Revenue Drop (Downturn)',
                    rev: -15,
                    exp: 0,
                    salary: 0,
                    churn: 0,
                    delay: 0,
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--brand-border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all"
              >
                📉 15% Revenue Drop
              </button>

              <button
                onClick={() =>
                  applyPreset({
                    name: '60-Day Invoice Delay',
                    rev: 0,
                    exp: 0,
                    salary: 0,
                    churn: 0,
                    delay: 60,
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--brand-border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all"
              >
                ⏳ 60-Day Invoice Delay
              </button>

              <button
                onClick={() =>
                  applyPreset({
                    name: '25% Growth Surge',
                    rev: 25,
                    exp: 5,
                    salary: 0,
                    churn: 0,
                    delay: 0,
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--brand-border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all"
              >
                🚀 25% Growth Surge
              </button>

              <button
                onClick={() =>
                  applyPreset({
                    name: 'Cost Optimization (-10% Spend)',
                    rev: 0,
                    exp: -10,
                    salary: 0,
                    churn: 0,
                    delay: 0,
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--brand-border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all"
              >
                ✂️ Cost Optimization (-10%)
              </button>
            </div>
          </div>

          {/* Interactive Simulation Controls & AI Output */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Simulation Controls (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[var(--brand-primary)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Simulation Levers
                  </h3>
                </div>
                {isSimulating && (
                  <span className="text-xs text-[var(--brand-primary)] flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> recalculating...
                  </span>
                )}
              </div>

              {/* Revenue Change Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Revenue Shift (%):
                  </span>
                  <span
                    className={`font-bold ${
                      revenueChangePct >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {revenueChangePct >= 0 ? `+${revenueChangePct}%` : `${revenueChangePct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={revenueChangePct}
                  onChange={(e) => setRevenueChangePct(Number(e.target.value))}
                  className="w-full accent-[var(--brand-primary)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>

              {/* Monthly New Hire / Fixed Commitment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    New Monthly Fixed Cost / Hire:
                  </span>
                  <span className="font-bold text-[var(--brand-primary)]">
                    +{fmtCurrency(monthlySalary, currency)}/mo
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15000"
                  step="500"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(Number(e.target.value))}
                  className="w-full accent-[var(--brand-primary)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>{fmtCurrency(0, currency)}</span>
                  <span>{fmtCurrency(7500, currency)}</span>
                  <span>{fmtCurrency(15000, currency)}</span>
                </div>
              </div>

              {/* Operating Expense Change Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Operating Expense Change (%):
                  </span>
                  <span
                    className={`font-bold ${
                      expenseChangePct <= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {expenseChangePct >= 0 ? `+${expenseChangePct}%` : `${expenseChangePct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  step="5"
                  value={expenseChangePct}
                  onChange={(e) => setExpenseChangePct(Number(e.target.value))}
                  className="w-full accent-[var(--brand-primary)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>-30%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>

              {/* Customer Churn Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Client Churn / Revenue Loss (%):
                  </span>
                  <span className="font-bold text-rose-500">
                    {churnPct > 0 ? `-${churnPct}%` : '0%'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="5"
                  value={churnPct}
                  onChange={(e) => setChurnPct(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>0%</span>
                  <span>20%</span>
                  <span>40%</span>
                </div>
              </div>

              {/* Delayed AR Collection Days */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Receivable Payment Delay:
                  </span>
                  <span className="font-bold text-amber-500">
                    {delayedArDays} Days
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="15"
                  value={delayedArDays}
                  onChange={(e) => setDelayedArDays(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>0 Days</span>
                  <span>45 Days</span>
                  <span>90 Days</span>
                </div>
              </div>
            </div>

            {/* Simulation Results & AI Evaluation (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Projected KPI Comparison Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Revenue */}
                <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">Projected Revenue</span>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-1">
                    {fmtCurrency(simulationResult?.projected_revenue || 0, currency)}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                    Base: {fmtCurrency(baselineMetrics?.revenue || 0, currency)}
                  </span>
                </div>

                {/* Expenses */}
                <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">Projected Expenses</span>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-1">
                    {fmtCurrency(simulationResult?.projected_expenses || 0, currency)}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                    Base: {fmtCurrency(baselineMetrics?.expenses || 0, currency)}
                  </span>
                </div>

                {/* Profit */}
                <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">Projected Net Profit</span>
                  <div
                    className={`text-base font-bold mt-1 ${
                      (simulationResult?.projected_profit || 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {fmtCurrency(simulationResult?.projected_profit || 0, currency)}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                    Base: {fmtCurrency(baselineMetrics?.profit || 0, currency)}
                  </span>
                </div>

                {/* Health Score */}
                <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">Simulated Health</span>
                  <div className="text-base font-bold text-[var(--brand-primary)] mt-1">
                    {simulationResult?.projected_health_score.toFixed(0) || '--'} / 100
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                    Base: {baselineHealth?.overall.toFixed(0) || '--'}
                  </span>
                </div>
              </div>

              {/* Side-by-side Visual Comparison Chart */}
              <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Baseline vs. Simulated Projections
                </h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="metric" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
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
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Baseline" fill="var(--text-muted)" opacity={0.6} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Projected" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Strategic Assessment Box */}
              {simulationResult && (
                <div className="p-5 rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-card)] shadow-sm space-y-3 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                    <Sparkles className="w-4 h-4" /> AI Strategic Interpretation
                  </div>

                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    {simulationResult.ai_interpretation}
                  </p>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                    <strong>Mitigation Guidance: </strong>
                    {simulationResult.recommendation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ScenariosPage;
