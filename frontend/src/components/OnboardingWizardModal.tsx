import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Wallet,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED', 'SAR', 'PKR', 'INR'];
const BUSINESS_TYPES = [
  'SaaS / Software',
  'E-commerce / Retail',
  'Consulting / Agency',
  'Healthcare / Biotech',
  'Manufacturing',
  'Sole Proprietorship',
  'Other',
];
const INDUSTRIES = [
  'Technology',
  'Retail & E-commerce',
  'Professional Services',
  'Healthcare',
  'Manufacturing',
  'Media & Marketing',
  'Construction',
  'Other',
];

export const OnboardingWizardModal: React.FC = () => {
  const { activeWorkspace, updateActiveWorkspace } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: activeWorkspace?.name || '',
    industry: activeWorkspace?.industry || 'Technology',
    business_type: activeWorkspace?.business_type || 'SaaS / Software',
    country: activeWorkspace?.country || 'United States',
    currency: activeWorkspace?.currency || 'USD',
    opening_cash_balance: activeWorkspace?.opening_cash_balance || 0,
    avg_monthly_revenue: activeWorkspace?.avg_monthly_revenue || 0,
    monthly_fixed_expenses: activeWorkspace?.monthly_fixed_expenses || 0,
    monthly_variable_expenses: activeWorkspace?.monthly_variable_expenses || 0,
    loan_balance: activeWorkspace?.loan_balance || 0,
    monthly_loan_repayment: activeWorkspace?.monthly_loan_repayment || 0,
    expected_growth_rate: activeWorkspace?.expected_growth_rate || 15,
    financial_goals: activeWorkspace?.financial_goals || '',
  });

  // Only show if active workspace exists, onboarding is false, and modal was not dismissed
  if (!activeWorkspace || activeWorkspace.onboarding_completed || dismissed) {
    return null;
  }

  const numVal = (val: string | number) => {
    const n = parseFloat(String(val));
    return isNaN(n) ? 0 : n;
  };

  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await updateActiveWorkspace({ onboarding_completed: true });
    } catch {
      setDismissed(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await updateActiveWorkspace({
        name: form.name.trim() || activeWorkspace.name,
        industry: form.industry,
        business_type: form.business_type,
        country: form.country,
        currency: form.currency,
        opening_cash_balance: numVal(form.opening_cash_balance),
        avg_monthly_revenue: numVal(form.avg_monthly_revenue),
        monthly_fixed_expenses: numVal(form.monthly_fixed_expenses),
        monthly_variable_expenses: numVal(form.monthly_variable_expenses),
        loan_balance: numVal(form.loan_balance),
        monthly_loan_repayment: numVal(form.monthly_loan_repayment),
        expected_growth_rate: numVal(form.expected_growth_rate),
        financial_goals: form.financial_goals.trim(),
        onboarding_completed: true,
      });
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-default)] w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Wizard Header */}
        <div className="px-6 py-5 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--brand-primary)] rounded-xl text-white shadow-sm shadow-purple-900/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Welcome to Accora Core</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Set up your business profile and baseline financial metrics in 3 quick steps.
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-6 pt-4 pb-3 bg-[var(--bg-card)] border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Step 1 Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === 1
                    ? 'bg-[var(--brand-primary)] text-white ring-4 ring-purple-500/20'
                    : step > 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}
              >
                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)] hidden sm:inline">Identity</span>
            </div>

            <div className={`h-0.5 flex-1 mx-3 ${step > 1 ? 'bg-emerald-500' : 'bg-[var(--border-default)]'}`} />

            {/* Step 2 Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === 2
                    ? 'bg-[var(--brand-primary)] text-white ring-4 ring-purple-500/20'
                    : step > 2
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}
              >
                {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)] hidden sm:inline">Baseline Cash</span>
            </div>

            <div className={`h-0.5 flex-1 mx-3 ${step > 2 ? 'bg-emerald-500' : 'bg-[var(--border-default)]'}`} />

            {/* Step 3 Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === 3
                    ? 'bg-[var(--brand-primary)] text-white ring-4 ring-purple-500/20'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}
              >
                3
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)] hidden sm:inline">Goals & Debt</span>
            </div>
          </div>
        </div>

        {/* Modal Body / Steps */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                <span>Step 1: Business Profile & Currency</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Business / Workspace Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Acme Studio"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">Industry</label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">Business Model</label>
                  <select
                    value={form.business_type}
                    onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  >
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="United States"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">Base Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] font-mono"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FINANCIAL BASELINE */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wider">
                <Wallet className="w-4 h-4" />
                <span>Step 2: Financial Baseline & Operating Costs</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Provide estimates to establish your initial cash reserves, expected monthly revenue, and monthly overhead.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Opening Cash in Bank ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.opening_cash_balance}
                    onChange={(e) => setForm({ ...form, opening_cash_balance: numVal(e.target.value) })}
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Average Monthly Revenue ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.avg_monthly_revenue}
                    onChange={(e) => setForm({ ...form, avg_monthly_revenue: numVal(e.target.value) })}
                    placeholder="12000"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Monthly Fixed Expenses ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.monthly_fixed_expenses}
                    onChange={(e) => setForm({ ...form, monthly_fixed_expenses: numVal(e.target.value) })}
                    placeholder="6500"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] font-mono"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Rent, payroll, software subscriptions</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Monthly Variable Expenses ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.monthly_variable_expenses}
                    onChange={(e) => setForm({ ...form, monthly_variable_expenses: numVal(e.target.value) })}
                    placeholder="3000"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] font-mono"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Ad spend, inventory, contractor fees</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: GOALS & DEBT */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wider">
                <Target className="w-4 h-4" />
                <span>Step 3: Liabilities & Strategic Goals</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Accora Core uses your debt obligations and growth targets to calculate accurate runway projections.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Outstanding Debt / Loans ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={form.loan_balance}
                    onChange={(e) => setForm({ ...form, loan_balance: numVal(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Monthly Debt Repayment ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={form.monthly_loan_repayment}
                    onChange={(e) => setForm({ ...form, monthly_loan_repayment: numVal(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Expected Annual Growth Rate: <span className="font-mono text-[var(--brand-primary)]">{form.expected_growth_rate}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={form.expected_growth_rate}
                    onChange={(e) => setForm({ ...form, expected_growth_rate: numVal(e.target.value) })}
                    className="w-full accent-[var(--brand-primary)] cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Key Financial Milestones / Goals
                  </label>
                  <textarea
                    rows={2}
                    value={form.financial_goals}
                    onChange={(e) => setForm({ ...form, financial_goals: e.target.value })}
                    placeholder="e.g. Achieve 6 months of cash runway and hire our first full-time marketer."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-3.5 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:opacity-90 text-xs font-semibold text-white shadow-md shadow-purple-900/30 flex items-center gap-1.5 transition-all"
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[var(--brand-primary)] hover:opacity-90 text-xs font-semibold text-white shadow-lg shadow-purple-900/40 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving Baseline...' : 'Complete & Open Workspace'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizardModal;
