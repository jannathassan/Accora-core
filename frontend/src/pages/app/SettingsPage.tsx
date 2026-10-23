import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, Theme } from '../../context/ThemeContext';
import { getSettings, updateSettings } from '../../services/api';
import type { AppSettings } from '../../types';
import { fmtCurrency } from '../../utils/format';
import {
  Building2,
  Sliders,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
  Contrast,
} from 'lucide-react';


const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PKR', 'AED', 'SAR', 'INR'];

const BUSINESS_TYPES = [
  'SaaS / Software',
  'E-commerce / Retail',
  'Consulting / Professional Services',
  'Agency / Marketing',
  'Healthcare / Biotech',
  'Manufacturing / Logistics',
  'Financial Services',
  'Sole Proprietorship',
  'Freelance / Creative',
  'Other',
];

const FISCAL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const RISK_LEVELS = [
  { id: 'conservative', label: 'Conservative', desc: 'Prioritize high cash reserves and minimize expenditure risks' },
  { id: 'moderate', label: 'Moderate', desc: 'Balanced growth posture with standard 3-month operating buffers' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Maximize revenue acceleration and reinvest operating surplus' },
];

export const SettingsPage: React.FC = () => {
  const { activeWorkspace, updateActiveWorkspace } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'business' | 'preferences' | 'ai'>('business');
  const [form, setForm] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadSettingsData = useCallback(async () => {
    try {
      setError(null);
      const res = await getSettings();
      setForm(res);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError(err?.response?.data?.detail || 'Failed to load workspace settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await updateSettings(form);
      setForm(updated);

      // Keep AuthContext active workspace in sync
      if (activeWorkspace) {
        await updateActiveWorkspace({
          name: updated.business.business_name,
          currency: updated.business.currency,
        });
      }

      setSuccessToast('Workspace settings saved persistently.');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err?.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Loading workspace configuration...</p>
      </div>
    );
  }

  const b = form.business;
  const p = form.preferences;
  const ai = form.ai_preferences;

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border-default)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Workspace Settings & Configuration
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand-light)] text-[var(--brand-primary)] border border-[var(--brand-border)]">
              {activeWorkspace?.name}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Configure business identity, financial baseline targets, interface theme, and AI telemetry parameters
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'business'
              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Business Profile & Baseline
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Theme & Preferences
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI & Risk Alerting
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: BUSINESS PROFILE & FINANCIAL BASELINE */}
        {activeTab === 'business' && (
          <div className="space-y-6">
            {/* Identity Card */}
            <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                General Business Identity
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Business / Organization Name
                  </label>
                  <input
                    type="text"
                    value={b.business_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, business_name: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Operating Currency
                  </label>
                  <select
                    value={b.currency}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, currency: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c} ({fmtCurrency(100, c)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Industry Sector
                  </label>
                  <input
                    type="text"
                    value={b.industry}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, industry: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Business Model / Type
                  </label>
                  <select
                    value={b.business_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, business_type: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  >
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Country of Operation
                  </label>
                  <input
                    type="text"
                    value={b.country}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, country: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Fiscal Year Start Month
                  </label>
                  <select
                    value={b.fiscal_year_start}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, fiscal_year_start: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  >
                    {FISCAL_MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Employee / Team Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={b.employee_count}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, employee_count: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Default Tax Rate (0 to 1.0)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={b.tax_rate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, tax_rate: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Baseline Financial Figures */}
            <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Baseline Financial Parameters & Safety Buffers
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                These numbers anchor your cash flow forecasting and health scoring when transaction volume is early.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Opening Cash Reserve ({b.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={b.opening_cash_balance}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, opening_cash_balance: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Target Average Monthly Revenue ({b.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={b.avg_monthly_revenue}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, avg_monthly_revenue: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Monthly Fixed Operating Expenses ({b.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={b.monthly_fixed_expenses}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, monthly_fixed_expenses: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Monthly Variable Expenses ({b.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={b.monthly_variable_expenses}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, monthly_variable_expenses: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Outstanding Business Loans / Debt ({b.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={b.loan_balance}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, loan_balance: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Monthly Loan Repayment ({b.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={b.monthly_loan_repayment}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        business: { ...b, monthly_loan_repayment: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] text-xs mb-1">
                  Financial Goals & Strategic Focus
                </label>
                <textarea
                  rows={3}
                  value={b.financial_goals}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      business: { ...b, financial_goals: e.target.value },
                    })
                  }
                  placeholder="e.g. Build 6 months of cash runway, keep gross margin above 30%, hire 2 developers in Q3"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: APPEARANCE & PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            {/* Theme Selector */}
            <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Interface Color Scheme
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Accora Core provides three tuned themes with full WCAG AAA/AA contrast accessibility.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'dark' as Theme, label: 'Dark Galaxy', icon: Moon, desc: 'Deep violet command-center look (Default)' },
                  { id: 'light' as Theme, label: 'Light Lavender', icon: Sun, desc: 'Clean white surfaces with lilac accents' },
                  { id: 'contrast' as Theme, label: 'High Contrast', icon: Contrast, desc: 'Sharp borders with pure monochrome surfaces' },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-light)] ring-1 ring-[var(--brand-primary)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--brand-border)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'}`} />
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{t.label}</h4>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{t.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Display & Formatting Preferences */}
            <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Display & Formatting Preferences
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Date Format
                  </label>
                  <select
                    value={p.date_format}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        preferences: { ...p, date_format: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  >
                    <option value="MMM DD, YYYY">MMM DD, YYYY (Oct 23, 2026)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (23/10/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-10-23)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Default Landing View
                  </label>
                  <select
                    value={p.default_view}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        preferences: { ...p, default_view: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                  >
                    <option value="dashboard">Dashboard (Command Center)</option>
                    <option value="analytics">Analytics & Trajectories</option>
                    <option value="transactions">Transactions Ledger</option>
                    <option value="invoices">Invoices & Receivables</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI & RISK ALERTING */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Deterministic Financial Intelligence Settings
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Configure risk sensitivity thresholds and predictive extrapolation behavior
                </p>
              </div>

              {/* Proactive Insights Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Proactive Financial Insights Audit
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Continuously scan recorded transactions for expense growth spikes and low runway
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={ai.proactive_insights}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ai_preferences: { ...ai, proactive_insights: e.target.checked },
                    })
                  }
                  className="w-5 h-5 accent-[var(--brand-primary)] rounded cursor-pointer"
                />
              </div>

              {/* Risk Tolerance */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Operating Risk Posture
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RISK_LEVELS.map((rl) => {
                    const isSelected = ai.risk_tolerance === rl.id;
                    return (
                      <div
                        key={rl.id}
                        onClick={() =>
                          setForm({
                            ...form,
                            ai_preferences: { ...ai, risk_tolerance: rl.id },
                          })
                        }
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-light)] ring-1 ring-[var(--brand-primary)]'
                            : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--brand-border)]'
                        }`}
                      >
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{rl.label}</h4>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1">{rl.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Forecast Horizon */}
              <div className="text-xs">
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Default Forecast Projection Window
                </label>
                <select
                  value={ai.forecast_horizon_months}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ai_preferences: {
                        ...ai,
                        forecast_horizon_months: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full sm:w-64 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                >
                  <option value={3}>3 Months (Quarterly Projection)</option>
                  <option value={6}>6 Months (Semi-Annual)</option>
                  <option value={12}>12 Months (Full Fiscal Year)</option>
                </select>
              </div>

              {/* Email Alerts Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    In-App & Email Critical Risk Alerts
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Receive high-priority notifications when invoices exceed due dates or runway drops under 60 days
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={ai.email_alerts}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ai_preferences: { ...ai, email_alerts: e.target.checked },
                    })
                  }
                  className="w-5 h-5 accent-[var(--brand-primary)] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
          <button
            type="button"
            onClick={loadSettingsData}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-colors"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
