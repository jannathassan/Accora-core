import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Accora Core Caught Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] m-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {this.props.fallbackTitle || 'Workspace View Notice'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mt-1.5 leading-relaxed">
            {this.state.error?.message || 'A transient rendering glitch occurred while processing financial metrics.'}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-md transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload View
            </button>
            <a
              href="/app/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Return to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
