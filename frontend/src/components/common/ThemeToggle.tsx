import React from 'react';
import { Sun, Moon, Eye } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme switcher"
      className="inline-flex items-center gap-1 p-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        aria-label="Switch to Light Theme"
        title="Light Theme"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          theme === 'light'
            ? 'bg-[var(--brand-primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
        {!compact && <span>Light</span>}
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        aria-label="Switch to Dark Theme"
        title="Dark Theme"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          theme === 'dark'
            ? 'bg-[var(--brand-primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
        {!compact && <span>Dark</span>}
      </button>

      <button
        type="button"
        onClick={() => setTheme('contrast')}
        aria-pressed={theme === 'contrast'}
        aria-label="Switch to High Contrast Theme"
        title="High Contrast Theme"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          theme === 'contrast'
            ? 'bg-[var(--brand-primary)] text-[var(--text-inverse)] ring-2 ring-[var(--border-strong)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
        }`}
      >
        <Eye className="w-3.5 h-3.5" />
        {!compact && <span>Contrast</span>}
      </button>
    </div>
  );
};

export default ThemeToggle;
