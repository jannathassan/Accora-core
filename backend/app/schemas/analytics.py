from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FinancialMetrics(BaseModel):
    period: str
    revenue: float
    expenses: float
    profit: float
    margin: float
    cash_flow: float
    cash_balance: float
    outstanding: float
    revenue_change_pct: float
    expenses_change_pct: float
    profit_change_pct: float
    expense_breakdown: Dict[str, float] = Field(default_factory=dict)
    is_estimated: bool = False
    opening_balance: float = 0.0
    operating_cash_flow: float = 0.0
    financing_cash_flow: float = 0.0


class BusinessHealthScore(BaseModel):
    overall: float
    label: str
    revenue_performance: float
    profitability: float
    expense_control: float
    cash_flow_health: float
    growth_trend: float
    explanation: str
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)


class CashFlowStatus(BaseModel):
    status: str  # "healthy" | "watch" | "at_risk"
    label: str
    explanation: str
    projected_balance_3mo: float
    recommendation: str


class ForecastPoint(BaseModel):
    date: str
    value: float
    is_predicted: bool
    confidence_low: Optional[float] = None
    confidence_high: Optional[float] = None


class Forecast(BaseModel):
    metric: str  # "revenue" | "expenses" | "profit" | "cash_flow"
    points: List[ForecastPoint]
    explanation: str


class SmartAction(BaseModel):
    priority: int
    title: str
    description: str
    impact: str
    action_label: str
    insight_type: str = "opportunity"


class NextBestMove(BaseModel):
    title: str
    description: str
    why_it_matters: str
    action_label: str
    action_url: str
    impact: str
    secondary: List[str] = Field(default_factory=list)


class AIInsight(BaseModel):
    id: str
    type: str  # "risk" | "opportunity" | "anomaly" | "trend" | "positive"
    severity: str  # "high" | "medium" | "low"
    title: str
    explanation: str
    evidence: List[str] = Field(default_factory=list)
    recommendation: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    answer: str
    evidence: List[str] = Field(default_factory=list)
    interpretation: str
    recommendation: str
    follow_ups: List[str] = Field(default_factory=list)
    source: str = "rule_based_engine"


class WhatIfRequest(BaseModel):
    description: str
    params: Dict[str, float] = Field(default_factory=dict)


class WhatIfResult(BaseModel):
    description: str
    projected_revenue: float
    projected_expenses: float
    projected_profit: float
    projected_cash_flow: float
    projected_health_score: float
    ai_interpretation: str
    recommendation: str


class BusinessSummary(BaseModel):
    period: str
    ai_summary: str
    highlights: List[str] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class ExpenseCategory(BaseModel):
    category: str
    amount: float
    pct: float


class PLReport(BaseModel):
    period: str
    revenue: float
    expenses: float
    gross_profit: float
    net_profit: float
    margin: float
    expense_breakdown: Dict[str, float] = Field(default_factory=dict)


class ExpenseReport(BaseModel):
    period: str
    total: float
    breakdown: Dict[str, float] = Field(default_factory=dict)
    top_categories: List[ExpenseCategory] = Field(default_factory=list)
    change_vs_prior: float = 0.0


class CashFlowReport(BaseModel):
    period: str
    inflow: float
    outflow: float
    net: float
    opening_balance: float
    closing_balance: float
