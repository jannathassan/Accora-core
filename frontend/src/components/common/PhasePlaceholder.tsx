import React from 'react';
import { LucideIcon, Layers, ArrowRight, ShieldCheck, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PhasePlaceholderProps {
  title: string;
  tagline: string;
  targetPhase: string;
  icon: LucideIcon;
  description: string;
  plannedCapabilities: string[];
  backendEndpoints?: string[];
}

export const PhasePlaceholder: React.FC<PhasePlaceholderProps> = ({
  title,
  tagline,
  targetPhase,
  icon: Icon,
  description,
  plannedCapabilities,
  backendEndpoints = [],
}) => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-default)]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-light)] text-[var(--brand-primary)] border border-[var(--brand-border)] mb-2">
            <Layers className="w-3.5 h-3.5" />
            {targetPhase}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--brand-light)] text-[var(--brand-primary)] border border-[var(--brand-border)]">
              <Icon className="w-6 h-6" />
            </div>
            {title}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">{tagline}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app/dashboard"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] transition-all"
          >
            Command Center
          </Link>
          <Link
            to="/"
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition-all flex items-center gap-1"
          >
            Landing Page
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Architecture Spec Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
            Module Architecture & Scope
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Planned Core Capabilities
            </h3>
            <ul className="space-y-2">
              {plannedCapabilities.map((cap, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-[var(--text-primary)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] mt-2 flex-shrink-0" />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Integration Status Card */}
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-[var(--brand-primary)]" />
              Backend Integration Target
            </h2>
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Database Scope:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">SQLite / WAL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Isolation:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">Tenant Workspace</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Engine:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">FastAPI + SQLAlchemy</span>
              </div>
            </div>

            {backendEndpoints.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Designated REST Endpoints
                </div>
                <div className="space-y-1">
                  {backendEndpoints.map((ep, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 rounded bg-[var(--bg-secondary)] text-[11px] font-mono text-[var(--brand-primary)] border border-[var(--border-subtle)]"
                    >
                      {ep}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Navigation verified in Phase 2
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhasePlaceholder;
