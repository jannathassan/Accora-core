import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  X,
  KeyRound,
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, demoLogin, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('expired=1')) {
      return 'Your session has expired. Please sign in again.';
    }
    return null;
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Compute clean destination (handling string or location object, avoiding self-redirect loops)
  const targetFrom = typeof location.state?.from === 'string'
    ? location.state.from
    : location.state?.from?.pathname;
  const destination = targetFrom && targetFrom !== '/login' && targetFrom !== '/'
    ? targetFrom
    : '/app/dashboard';

  // Automatically navigate into the app if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, destination, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await login(email, password);
      setSuccess('Authentication successful! Opening workspace...');
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError('Backend server is unreachable. Please verify the FastAPI backend is running on port 8000.');
        } else {
          setError(err.response.data?.detail || 'Invalid email or password.');
        }
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setDemoLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await demoLogin();
      setSuccess('Signing in as Demo User (Ayesha Khan / Lumina Fashion)...');
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && !err.response) {
        setError('Backend server is unreachable. Please ensure the backend is running.');
      } else {
        setError('Failed to authenticate as demo user.');
      }
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col justify-between p-4 sm:p-8 galaxy-mesh-bg transition-colors duration-300">
      {/* Top Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pb-8">
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
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Welcome back</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Sign in to your business workspace command center
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Demo Login Button (Instant 1-Click Access) */}
        <button
          type="button"
          onClick={handleDemoSignIn}
          disabled={demoLoading || loading}
          className="w-full py-2.5 px-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-light)] hover:bg-[var(--brand-border)] text-xs font-semibold text-[var(--brand-primary)] transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <UserCheck className="w-4 h-4" />
          {demoLoading ? 'Signing into Demo...' : 'Sign in as Demo User (Ayesha Khan)'}
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[var(--border-subtle)] w-full" />
          <span className="bg-[var(--bg-card)] px-3 text-[11px] font-medium text-[var(--text-muted)] absolute">
            or continue with email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5" htmlFor="email">
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
                placeholder="founder@example.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[var(--text-primary)]" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="text-[11px] text-[var(--brand-primary)] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] hover:opacity-90 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-secondary)]">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[var(--brand-primary)] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                <KeyRound className="w-4 h-4 text-[var(--brand-primary)]" />
                Reset Password
              </div>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              In this local development deployment, passphrases are secured with salted bcrypt hashes. To test with an instant pre-configured account, use the <strong>Sign in as Demo User</strong> button.
            </p>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(false)}
              className="w-full py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold"
            >
              Understood
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

export default LoginPage;
