import React, { useEffect, useState } from 'react';
import { Menu, Activity, User, ShieldCheck, LogOut } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../common/ThemeToggle';
import { fetchHealth, SystemHealth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TopNavProps {
  onToggleSidebar: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/app/dashboard': { title: 'Dashboard', subtitle: 'Financial Command Center' },
  '/app/transactions': { title: 'Transactions', subtitle: 'Ledger Records & Categorization' },
  '/app/invoices': { title: 'Invoices', subtitle: 'Billing, Receivable Tracking & Status' },
  '/app/analytics': { title: 'Analytics', subtitle: 'Performance Trends & Category Spending' },
  '/app/intelligence': { title: 'Financial Intelligence', subtitle: 'AI Insights & Heuristics Copilot' },
  '/app/forecast': { title: 'Cash-Flow Forecast', subtitle: 'Balance Projections & Runway Model' },
  '/app/scenarios': { title: 'What-If Scenarios', subtitle: 'Hypothetical Financial Simulations' },
  '/app/reports': { title: 'Reports', subtitle: 'P&L Statements & Export Center' },
  '/app/notifications': { title: 'Notifications', subtitle: 'Risk Warnings & Activity Alerts' },
  '/app/settings': { title: 'Settings', subtitle: 'Workspace, Currency & Preferences' },
};

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, [location.pathname]);

  const current = pageTitles[location.pathname] || {
    title: 'Command Center',
    subtitle: 'Accora Core Workspace',
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-default)] px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile trigger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open sidebar menu"
          className="p-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight">
            {current.title}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Health badge, Theme Switcher, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend live status indicator */}
        <div
          title={
            health && typeof health.status === 'string'
              ? `Backend Status: ${health.status.toUpperCase()} (DB: ${health.database?.connected ? 'OK' : 'Degraded'})`
              : health && typeof (health as any).overall === 'number'
              ? `Backend Status: Healthy (Score: ${(health as any).overall})`
              : 'Backend connecting or offline'
          }
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-secondary)]"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              health?.status === 'healthy' || (health as any)?.overall !== undefined
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                : 'bg-amber-500'
            }`}
          />
          <Activity className="w-3 h-3 text-[var(--text-muted)]" />
          <span>
            {health?.status === 'healthy' || (health as any)?.overall !== undefined
              ? 'API Online'
              : 'Connecting...'}
          </span>
        </div>

        {/* Theme Switcher */}
        <ThemeToggle compact />

        {/* User / Workspace Account Dropdown Pill & Sign Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-default)]">
          <Link
            to="/app/settings"
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-all"
          >
            <div className="w-6 h-6 rounded-lg bg-[var(--brand-light)] text-[var(--brand-primary)] flex items-center justify-center font-semibold text-xs">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline font-medium truncate max-w-[120px]">
              {user?.full_name || 'Founder'}
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-accora-400 hidden sm:inline" />
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            title="Sign out of Accora Core"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
