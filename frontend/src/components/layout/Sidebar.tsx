import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  BarChart3,
  Sparkles,
  TrendingUp,
  Sliders,
  FileSpreadsheet,
  Bell,
  Settings,
  X,
  Building2,
  ExternalLink,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', path: '/app/transactions', icon: Receipt },
  { name: 'Invoices', path: '/app/invoices', icon: FileText },
  { name: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  { name: 'Intelligence', path: '/app/intelligence', icon: Sparkles, badge: 'AI' },
  { name: 'Cash Forecast', path: '/app/forecast', icon: TrendingUp },
  { name: 'What-If Scenarios', path: '/app/scenarios', icon: Sliders },
  { name: 'Reports', path: '/app/reports', icon: FileSpreadsheet },
  { name: 'Notifications', path: '/app/notifications', icon: Bell, badge: '2' },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeWorkspace, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar backdrop"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') onClose();
          }}
          className="fixed inset-0 z-40 bg-[var(--bg-overlay)] backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Workspace Header */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accora-700 via-accora-500 to-accora-300 flex items-center justify-center shadow-md shadow-accora-900/30 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">Accora Core</span>
                <span className="block text-[10px] text-[var(--text-secondary)] font-medium">AI Financial Copilot</span>
              </div>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] lg:hidden"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Workspace Pill */}
          <div className="mt-4 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[var(--brand-light)] text-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {activeWorkspace?.name || 'Active Workspace'}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate capitalize">
                  {activeWorkspace?.role ? `${activeWorkspace.role} Workspace` : 'Workspace'}
                </div>
              </div>
            </div>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--brand-light)] text-[var(--brand-primary)] border border-[var(--brand-border)] font-mono">
              {activeWorkspace?.currency || 'USD'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white shadow-sm font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badge === 'AI'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-[var(--brand-light)] text-[var(--brand-primary)]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Public Link & Sign Out */}
        <div className="p-3 border-t border-[var(--border-subtle)] space-y-1.5">
          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Public Landing Page
            </span>
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all font-medium text-left"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </span>
          </button>

          <div className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
            <span>Accora Core</span>
            <span className="font-mono text-[10px] text-[var(--brand-primary)]">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
