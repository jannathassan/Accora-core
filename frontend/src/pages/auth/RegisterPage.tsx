import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Building,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Compute password strength score (0-4)
  const getPasswordScore = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return score;
  };

  const pwScore = getPasswordScore(password);
  const getStrengthLabel = (s: number) => {
    if (!password) return 'Password strength';
    if (s <= 1) return 'Weak';
    if (s === 2) return 'Fair';
    if (s === 3) return 'Good';
    return 'Strong';
  };

  const getStrengthBarColor = (s: number) => {
    if (s <= 1) return 'bg-rose-500';
    if (s === 2) return 'bg-amber-500';
    if (s === 3) return 'bg-purple-400';
    return 'bg-emerald-400';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !businessName || !fullName) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('Please review and accept the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register(fullName, businessName, email, password, currency);
      navigate('/app/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError('Backend server is unreachable. Please verify the FastAPI backend is running on port 8000.');
        } else {
          setError(err.response.data?.detail || 'Registration failed. Please try again.');
        }
      } else {
        setError('Registration failed. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col justify-between p-4 sm:p-8 galaxy-mesh-bg transition-colors duration-300">
      {/* Top Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pb-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accora-700 to-accora-400 flex items-center justify-center text-white shadow-md shadow-purple-900/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">Accora Core</span>
        </Link>
        <ThemeToggle compact />
      </header>

      {/* Main Form Container */}
      <div className="max-w-md mx-auto w-full p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Create your workspace</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Empower your business with deterministic financial clarity and AI
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1" htmlFor="fullName">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1" htmlFor="businessName">
              Business / Workspace Name
            </label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Studio"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1" htmlFor="currency">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all font-mono"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--text-primary)]" htmlFor="password">
                Password
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">
                Strength: <strong className="text-[var(--text-primary)]">{getStrengthLabel(pwScore)}</strong>
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-1.5 flex gap-1 h-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      pwScore >= step ? getStrengthBarColor(pwScore) : 'bg-[var(--border-default)]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[10px] text-red-400 mt-1">Passwords do not match.</p>
            )}
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="pt-1 flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded border-[var(--border-default)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
            />
            <label htmlFor="terms" className="cursor-pointer">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setTermsModalOpen(true)}
                className="text-[var(--brand-primary)] underline font-medium"
              >
                Terms of Service & Privacy Policy
              </button>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] hover:opacity-90 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Workspace...' : 'Register Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--brand-primary)] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Terms Modal */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                Accora Core Terms & Privacy
              </div>
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-[var(--text-secondary)] space-y-2 max-h-60 overflow-y-auto pr-2">
              <p>
                <strong>Workspace Isolation:</strong> Your business records, invoices, and transactions are strictly segregated and accessible only by authenticated users belonging to your workspace.
              </p>
              <p>
                <strong>Security:</strong> All credentials are protected with salted bcrypt hashes. Access tokens are cryptographically signed with JSON Web Tokens.
              </p>
              <p>
                <strong>Financial Accuracy:</strong> Accora Core provides deterministic financial calculations. AI insights are generated to assist business intelligence and do not replace professional certified tax or legal counsel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAgreeTerms(true);
                setTermsModalOpen(false);
              }}
              className="w-full py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold"
            >
              I Accept & Agree
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-[var(--text-muted)] py-4">
        Accora Core © 2026. Your Business, With Intelligence.
      </footer>
    </div>
  );
};

export default RegisterPage;
