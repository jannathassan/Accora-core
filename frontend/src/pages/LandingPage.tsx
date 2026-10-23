import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Receipt,
  FileText,
  Sliders,
  ShieldCheck,
  ArrowRight,
  Database,
  Cpu,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';
import { fetchHealth, SystemHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleExploreDemo = async () => {
    try {
      setDemoLoading(true);
      await demoLogin();
      navigate('/app/dashboard');
    } catch (err) {
      console.error('Failed to log in as demo user:', err);
      navigate('/login');
    } finally {
      setDemoLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors duration-300 relative overflow-hidden flex flex-col justify-between">
      {/* Dynamic Galaxy Aura Background */}
      <div className="absolute inset-0 pointer-events-none galaxy-mesh-bg" />

      {/* Decorative Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-violet-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 left-1/4 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <header className="py-6 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accora-700 via-accora-500 to-accora-300 flex items-center justify-center shadow-lg shadow-purple-900/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Accora Core</span>
              <span className="hidden sm:block text-[11px] text-[var(--text-secondary)] font-medium">Your Business, With Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />

            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors"
            >
              Sign In
            </Link>

            <button
              type="button"
              onClick={handleExploreDemo}
              disabled={demoLoading}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--brand-border)] bg-[var(--brand-light)] text-[var(--brand-primary)] hover:bg-[var(--brand-border)] transition-all shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {demoLoading ? 'Loading Demo...' : 'Explore Demo'}
            </button>

            <Link
              to="/app/dashboard"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-primary)] text-white hover:opacity-95 shadow-md shadow-purple-900/30 transition-all flex items-center gap-1.5"
            >
              Launch App
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-16 sm:py-24 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--brand-light)] text-[var(--brand-primary)] border border-[var(--brand-border)] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Financial Copilot for Modern Small Business</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.15]">
            Understand your numbers.{' '}
            <span className="bg-gradient-to-r from-accora-400 via-accora-500 to-purple-300 bg-clip-text text-transparent">
              Predict your future.
            </span>{' '}
            Act with confidence.
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Accora Core turns raw transactions and invoices into understandable intelligence, detects cash-flow risks, forecasts future liquidity, and simulates scenario outcomes.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/app/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2"
            >
              Enter Workspace Command Center
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleExploreDemo}
              disabled={demoLoading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold border border-[var(--brand-border)] bg-[var(--brand-light)] text-[var(--brand-primary)] hover:bg-[var(--brand-border)] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {demoLoading ? 'Launching Demo...' : 'Explore Demo'}
            </button>

            <Link
              to="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all flex items-center justify-center"
            >
              Create Account
            </Link>
          </div>

          {/* Real-Time Backend Connection Pill */}
          <div className="pt-6 inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>
              {health
                ? `FastAPI Engine Connected (v${health.version} • SQLite WAL • Rules Engine Active)`
                : 'Verifying backend connection...'}
            </span>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="py-12 border-t border-[var(--border-default)]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Deterministic Math Meets Practical AI
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Every insight is calculated directly from your actual ledger records with zero hallucinations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm hover:border-[var(--brand-primary)] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Strict Decimal Financial Ledger</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Categorized income and expense records with exact decimal math. Eliminate rounding drift across revenue, operating costs, and net margins.
              </p>
              <div className="pt-2 text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                <span>Phase 4 Core</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm hover:border-[var(--brand-primary)] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Invoicing & Receivables Tracking</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Issue customer invoices, track due dates, and record payments directly to ledger balances without double-counting revenue.
              </p>
              <div className="pt-2 text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                <span>Phase 4 Core</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm hover:border-[var(--brand-primary)] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Dual-Engine AI Copilot</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                12+ built-in financial heuristics evaluate burn rates, margin compression, and expense spikes locally. Optional LLM provider bridge without vendor lock-in.
              </p>
              <div className="pt-2 text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                <span>Phase 5 Core</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm hover:border-[var(--brand-primary)] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Cash-Flow & Runway Forecasting</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Project future cash balances based on empirical historical inflows, recurring costs, and pending receivables with transparent confidence boundaries.
              </p>
              <div className="pt-2 text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                <span>Phase 5 Core</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm hover:border-[var(--brand-primary)] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">What-If Financial Scenarios</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Simulate revenue shifts, delayed client payments, and new hires without tampering with actual bookkeeping data.
              </p>
              <div className="pt-2 text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                <span>Phase 5 Core</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm hover:border-[var(--brand-primary)] transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Workspace Isolation & Security</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Tenant isolation guarantees every business workspace is segregated. Password hashing, JWT auth, and scoped database access built-in.
              </p>
              <div className="pt-2 text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                <span>Phase 3 Core</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </section>

        {/* Live Architecture Status Bar */}
        <section className="py-12 border-t border-[var(--border-default)]">
          <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-default)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[var(--brand-primary)]" />
                  Live System Architecture Status
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Connected directly to FastAPI backend on 127.0.0.1:8000
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-[var(--brand-primary)] bg-[var(--brand-light)] px-3 py-1.5 rounded-lg border border-[var(--brand-border)]">
                <Database className="w-3.5 h-3.5" />
                <span>SQLite (WAL)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-muted)] font-medium">Design Tokens & Themes</div>
                <div className="text-sm font-semibold text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Light, Dark & Contrast
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">WCAG Accessible Contrast</div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-muted)] font-medium">Application Shell</div>
                <div className="text-sm font-semibold text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Sidebar & TopNav Verified
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">10 Integrated Navigation Routes</div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-muted)] font-medium">Intelligence Engine</div>
                <div className="text-sm font-semibold text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Rules-Based (Zero-Cost)
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">No External API Key Required</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)] py-8 mt-12 bg-[var(--bg-card)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">Accora Core</span>
            <span>—</span>
            <span>Your Business, With Intelligence</span>
          </div>
          <div>
            Built with React, TypeScript, Tailwind CSS, FastAPI, and SQLite.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
