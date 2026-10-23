import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatWithAI, getAIInsights } from '../../services/api';
import type { AIInsight, ChatMessage } from '../../types';
import {
  Sparkles,
  Send,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Cpu,
} from 'lucide-react';


const SUGGESTED_QUESTIONS = [
  'What is my current runway and cash health?',
  'Which expense category should I cut first?',
  'Can I afford to hire someone for $4,000/mo?',
  'How much should I reserve for taxes?',
  'Give me a summary of this month\'s financial performance.',
];

export const IntelligencePage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [activeTab, setActiveTab] = useState<'copilot' | 'insights'>('copilot');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I am your Accora Financial Copilot. I analyze your authorized workspace records, bank movements, and invoices deterministically to provide answers without guessing.`,
      recommendation: 'Select a quick query below or type your question about runway, profitability, or hiring.',
      follow_ups: [
        'What is my current runway and cash health?',
        'Give me a summary of this month\'s financial performance.',
      ],
      source: 'Rules-Based Intelligence Engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Insights State
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [insightFilter, setInsightFilter] = useState<string>('all');
  const [loadingInsights, setLoadingInsights] = useState<boolean>(true);
  const [refreshingInsights, setRefreshingInsights] = useState<boolean>(false);

  const loadInsights = useCallback(async () => {
    try {
      const res = await getAIInsights();
      setInsights(res);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoadingInsights(false);
      setRefreshingInsights(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await chatWithAI({ message: text.trim() });
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        evidence: res.evidence,
        interpretation: res.interpretation,
        recommendation: res.recommendation,
        follow_ups: res.follow_ups,
        source: res.source === 'rule_based_engine' ? 'Rules-Based Engine (Offline Safe)' : res.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error retrieving your financial metrics. Please ensure your workspace has active transactions or baseline setup data.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter insights
  const filteredInsights = insights.filter((ins) => {
    if (insightFilter === 'all') return true;
    if (insightFilter === 'risk') return ins.type === 'risk';
    if (insightFilter === 'opportunity') return ins.type === 'opportunity' || ins.type === 'positive';
    if (insightFilter === 'anomaly') return ins.type === 'anomaly';
    if (insightFilter === 'trend') return ins.type === 'trend';
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Financial Intelligence & AI Copilot
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Cpu className="w-3 h-3" /> Offline Safe
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Grounded financial assistant and automated risk detection for {activeWorkspace?.name}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex items-center rounded-lg border border-[var(--border-default)] p-1 bg-[var(--bg-card)]">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'copilot'
                ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Copilot Chat
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'insights'
                ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Proactive Insights ({insights.length})
          </button>
        </div>
      </div>

      {activeTab === 'copilot' ? (
        /* Copilot Chat Interface */
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Engine Banner */}
          <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>
                <strong>Grounded Mode:</strong> All answers calculated directly from your database records.
              </span>
            </div>
            <span className="hidden sm:inline text-[var(--text-muted)]">
              No external API keys • 100% Private
            </span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--brand-primary)] text-white rounded-br-none'
                      : 'bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Grounded Evidence List */}
                  {m.evidence && m.evidence.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Grounded Evidence:
                      </span>
                      <ul className="text-xs space-y-0.5 text-[var(--text-secondary)]">
                        {m.evidence.map((ev, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-secondary)]" />
                            {ev}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Financial Interpretation */}
                  {m.interpretation && (
                    <div className="mt-2.5 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Analysis: </strong>
                      {m.interpretation}
                    </div>
                  )}

                  {/* Strategic Recommendation */}
                  {m.recommendation && (
                    <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                      <strong>💡 Recommended Action: </strong>
                      {m.recommendation}
                    </div>
                  )}

                  {/* Interactive Follow-up Pills */}
                  {m.follow_ups && m.follow_ups.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-muted)] block mb-1.5">
                        Suggested follow-ups:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {m.follow_ups.map((fu, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(fu)}
                            className="text-xs px-2.5 py-1 rounded-full border border-[var(--brand-border)] bg-[var(--brand-light)] text-[var(--brand-primary)] hover:opacity-90 transition-opacity text-left"
                          >
                            {fu}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span>{m.source || ''}</span>
                    <span>{m.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-start">
                <div className="rounded-2xl rounded-bl-none p-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--brand-primary)] animate-spin" />
                  Analyzing financial ledger...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] flex-shrink-0">
              Suggestions:
            </span>
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isSending}
                className="whitespace-nowrap text-xs px-2.5 py-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--brand-border)] text-[var(--text-secondary)] transition-all flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-[var(--border-default)] bg-[var(--bg-card)] flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder="Ask about runway, burn rate, affordability of hires, or tax savings..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isSending}
              className="p-2.5 rounded-xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] disabled:opacity-50 transition-colors shadow-sm"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Proactive Insights Feed */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Alerts' },
                { id: 'risk', label: 'Risks & Warnings' },
                { id: 'opportunity', label: 'Opportunities' },
                { id: 'anomaly', label: 'Anomalies' },
                { id: 'trend', label: 'Trends' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setInsightFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    insightFilter === f.id
                      ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                      : 'border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setRefreshingInsights(true);
                loadInsights();
              }}
              disabled={refreshingInsights}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingInsights ? 'animate-spin' : ''}`} />
              Run Live Audit
            </button>
          </div>

          {loadingInsights ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">Scanning transactions for risks...</p>
            </div>
          ) : filteredInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInsights.map((ins) => {
                const isRisk = ins.type === 'risk';
                const isOpp = ins.type === 'opportunity' || ins.type === 'positive';
                const isAnomaly = ins.type === 'anomaly';

                return (
                  <div
                    key={ins.id}
                    className={`p-5 rounded-2xl border bg-[var(--bg-card)] shadow-sm flex flex-col justify-between ${
                      isRisk
                        ? 'border-rose-500/30'
                        : isOpp
                        ? 'border-emerald-500/30'
                        : isAnomaly
                        ? 'border-amber-500/30'
                        : 'border-[var(--brand-border)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            ins.severity === 'high'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : ins.severity === 'medium'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {ins.severity} severity • {ins.type}
                        </span>
                        {isRisk ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        ) : isOpp ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[var(--text-primary)] mt-2">
                        {ins.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        {ins.explanation}
                      </p>

                      {ins.evidence && ins.evidence.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Evidence:
                          </span>
                          <ul className="text-xs text-[var(--text-secondary)] space-y-0.5">
                            {ins.evidence.map((ev, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-secondary)]" />
                                {ev}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
                      <div className="p-2.5 rounded-xl bg-[var(--brand-light)] border border-[var(--brand-border)] text-xs text-[var(--brand-primary)]">
                        <strong>Action: </strong> {ins.recommendation}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                No active alerts in this category
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Your financial telemetry indicates normal operating bounds.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligencePage;
