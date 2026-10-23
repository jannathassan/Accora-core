export interface FinancialMetrics {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  cash_flow: number;
  cash_balance: number;
  outstanding: number;
  revenue_change_pct: number;
  expenses_change_pct: number;
  profit_change_pct: number;
  expense_breakdown: Record<string, number>;
  is_estimated: boolean;
  opening_balance: number;
  operating_cash_flow: number;
  financing_cash_flow: number;
}

export interface BusinessHealthScore {
  overall: number;
  label: string;
  revenue_performance: number;
  profitability: number;
  expense_control: number;
  cash_flow_health: number;
  growth_trend: number;
  explanation: string;
  strengths: string[];
  improvements: string[];
}

export interface CashFlowStatus {
  status: 'healthy' | 'watch' | 'at_risk';
  label: string;
  explanation: string;
  projected_balance_3mo: number;
  recommendation: string;
}

export interface ForecastPoint {
  date: string;
  value: number;
  is_predicted: boolean;
  confidence_low?: number | null;
  confidence_high?: number | null;
}

export interface Forecast {
  metric: 'revenue' | 'expenses' | 'profit' | 'cash_flow' | string;
  points: ForecastPoint[];
  explanation: string;
}

export interface SmartAction {
  priority: number;
  title: string;
  description: string;
  impact: string;
  action_label: string;
  insight_type: string;
}

export interface NextBestMove {
  title: string;
  description: string;
  why_it_matters: string;
  action_label: string;
  action_url: string;
  impact: string;
  secondary: string[];
}

export interface AIInsight {
  id: string;
  type: 'risk' | 'opportunity' | 'anomaly' | 'trend' | 'positive';
  severity: 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  evidence: string[];
  recommendation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  evidence?: string[];
  interpretation?: string;
  recommendation?: string;
  follow_ups?: string[];
  source?: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  answer: string;
  evidence: string[];
  interpretation: string;
  recommendation: string;
  follow_ups: string[];
  source: string;
}

export interface WhatIfRequest {
  description: string;
  params: Record<string, number>;
}

export interface WhatIfResult {
  description: string;
  projected_revenue: number;
  projected_expenses: number;
  projected_profit: number;
  projected_cash_flow: number;
  projected_health_score: number;
  ai_interpretation: string;
  recommendation: string;
}

export interface BusinessSummary {
  period: string;
  ai_summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  pct: number;
}

export interface PLReport {
  period: string;
  revenue: number;
  expenses: number;
  gross_profit: number;
  net_profit: number;
  margin: number;
  expense_breakdown: Record<string, number>;
}

export interface ExpenseReport {
  period: string;
  total: number;
  breakdown: Record<string, number>;
  top_categories: ExpenseCategory[];
  change_vs_prior: number;
}

export interface CashFlowReport {
  period: string;
  inflow: number;
  outflow: number;
  net: number;
  opening_balance: number;
  closing_balance: number;
}
