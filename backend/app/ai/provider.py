"""Financial AI Provider Layer for Accora Core.

Provides rule-based deterministic financial reasoning that is grounded strictly
in the authenticated workspace's actual database records and metrics.
No payment details or external API keys are required.
"""

from collections import defaultdict
from typing import List, Optional, Dict
from datetime import date as Date

from app.models.workspace import Workspace
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.schemas.analytics import (
    FinancialMetrics,
    AIInsight,
    ChatRequest,
    ChatResponse,
    WhatIfRequest,
    WhatIfResult,
    BusinessSummary,
)
from app.analytics.engine import compute_health_score, compute_invoice_summary


def build_financial_context(
    workspace: Optional[Workspace],
    metrics: List[FinancialMetrics],
    invoices: List[Invoice],
) -> str:
    """Build grounded context string from the workspace's real financial state."""
    name = workspace.name if workspace else "Business"
    curr = workspace.currency if workspace else "USD"
    ind = workspace.industry if workspace else "General"

    lines = [
        f"Business: {name} ({ind})",
        f"Currency: {curr}",
    ]

    if workspace:
        lines.extend([
            f"Business Type: {workspace.business_type}",
            f"Country: {workspace.country}",
            f"Opening Cash Balance: {curr} {workspace.opening_cash_balance:,.2f}",
            f"Loan Balance: {curr} {workspace.loan_balance:,.2f}",
            f"Monthly Loan Repayment: {curr} {workspace.monthly_loan_repayment:,.2f}",
            f"Expected Growth Rate: {workspace.expected_growth_rate}%",
            f"Financial Goals: {workspace.financial_goals or 'None specified'}",
        ])

    if not metrics:
        lines.append("Status: No transactions recorded yet. Data reflects onboarding baseline profile.")
        return "\n".join(lines)

    latest = metrics[-1]
    inv_summary = compute_invoice_summary(invoices) if invoices else None

    lines.extend([
        f"Data Mode: {'ESTIMATED BASELINE' if latest.is_estimated else 'ACTUAL TRANSACTIONS'}",
        f"Latest Period: {latest.period}",
        f"Revenue: {curr} {latest.revenue:,.2f}",
        f"Expenses: {curr} {latest.expenses:,.2f}",
        f"Profit: {curr} {latest.profit:,.2f}",
        f"Margin: {latest.margin * 100:.1f}%",
        f"Net Cash Flow: {curr} {latest.cash_flow:,.2f}",
        f"Cash Balance: {curr} {latest.cash_balance:,.2f}",
        f"Outstanding AR: {curr} {latest.outstanding:,.2f}",
    ])

    if inv_summary:
        lines.append(
            f"Invoices: {inv_summary.total_invoiced:,.2f} total, {inv_summary.total_paid:,.2f} paid, "
            f"{inv_summary.total_pending:,.2f} pending, {inv_summary.total_overdue:,.2f} overdue"
        )

    if latest.expense_breakdown:
        lines.append("Expense Breakdown (Latest):")
        for cat, amt in sorted(latest.expense_breakdown.items(), key=lambda x: -x[1]):
            pct = (amt / latest.expenses * 100) if latest.expenses > 0 else 0
            lines.append(f"  {cat}: {curr} {amt:,.2f} ({pct:.0f}%)")

    return "\n".join(lines)


class RuleBasedFinancialAI:
    """Grounded, deterministic rule-based AI Financial Copilot."""

    async def chat(self, request: ChatRequest, context: str) -> ChatResponse:
        q = request.message.lower().strip()

        ctx_map: Dict[str, str] = {}
        for line in context.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                ctx_map[k.strip().lower()] = v.strip()

        curr = ctx_map.get("currency", "USD")
        biz_name = ctx_map.get("business", "Your Business").split("(")[0].strip()
        rev_str = ctx_map.get("revenue", f"{curr} 0.00")
        exp_str = ctx_map.get("expenses", f"{curr} 0.00")
        prof_str = ctx_map.get("profit", f"{curr} 0.00")
        margin_str = ctx_map.get("margin", "0.0%")
        cf_str = ctx_map.get("net cash flow", f"{curr} 0.00")
        cash_str = ctx_map.get("cash balance", f"{curr} 0.00")
        loan_bal_str = ctx_map.get("loan balance", f"{curr} 0.00")
        loan_rep_str = ctx_map.get("monthly loan repayment", f"{curr} 0.00")
        ar_str = ctx_map.get("outstanding ar", f"{curr} 0.00")

        # 1. Loan & Debt
        if any(w in q for w in ("loan", "debt", "repayment", "borrow")):
            return ChatResponse(
                answer=(
                    f"Your outstanding loan balance is {loan_bal_str} with required monthly debt payments of "
                    f"{loan_rep_str}. Debt repayments reduce your monthly net cash flow directly."
                ),
                evidence=[
                    f"Outstanding Loan Balance: {loan_bal_str}",
                    f"Monthly Debt Service: {loan_rep_str}",
                    f"Current Cash Balance: {cash_str}",
                    f"Net Cash Flow: {cf_str}",
                ],
                interpretation="Loan repayments are financing cash outflows that reduce your cash position without reducing operating accounting profit.",
                recommendation="Maintain monthly operating cash inflows at least 2.5x higher than debt service obligations to protect liquidity.",
                follow_ups=[
                    "What is my current cash balance?",
                    "How does debt affect my cash flow?",
                    "What is my next best move?",
                ],
            )

        # 2. Profit & Margins
        if any(w in q for w in ("profit", "margin", "earnings", "bottom line")):
            return ChatResponse(
                answer=(
                    f"For {biz_name}, monthly revenue is {rev_str} against expenses of {exp_str}, "
                    f"yielding net profit of {prof_str} and an operating margin of {margin_str}."
                ),
                evidence=[
                    f"Monthly Revenue: {rev_str}",
                    f"Monthly Expenses: {exp_str}",
                    f"Net Profit: {prof_str}",
                    f"Operating Margin: {margin_str}",
                ],
                interpretation="Your business is generating positive operating profit. Keeping expenses in check ensures healthy bottom-line conversion.",
                recommendation="Audit your top recurring expense categories and aim to preserve at least a 20% operating margin.",
                follow_ups=[
                    "What are my biggest expense categories?",
                    "How can I improve my profit margin?",
                    "What is my revenue forecast?",
                ],
            )

        # 3. Expenses & Spending
        if any(w in q for w in ("expense", "spend", "cost", "burn", "outflow")):
            return ChatResponse(
                answer=(
                    f"Your recorded monthly expenses are {exp_str}. To protect profitability, "
                    f"ensure operational expense growth remains proportional to revenue gains."
                ),
                evidence=[
                    f"Total Monthly Expenses: {exp_str}",
                    f"Total Monthly Revenue: {rev_str}",
                    f"Operating Margin: {margin_str}",
                ],
                interpretation="Operating expenses represent your monthly burn rate. Monitoring vendor contracts prevents stealth budget creep.",
                recommendation="Review software subscriptions, contractor fees, and advertising return-on-ad-spend (ROAS).",
                follow_ups=[
                    "What are my biggest expense categories?",
                    "What is my cash runway?",
                    "What should I focus on next month?",
                ],
            )

        # 4. Cash Flow & Runway
        if any(w in q for w in ("cash", "flow", "runway", "balance", "reserve", "liquidity")):
            return ChatResponse(
                answer=(
                    f"Your current cash balance is {cash_str} with monthly net cash flow of {cf_str}. "
                    f"Uncollected client invoices total {ar_str}."
                ),
                evidence=[
                    f"Available Cash Balance: {cash_str}",
                    f"Net Monthly Cash Flow: {cf_str}",
                    f"Outstanding Receivables (AR): {ar_str}",
                    f"Monthly Debt Repayment: {loan_rep_str}",
                ],
                interpretation="Your cash balance reflects reconciled opening working capital adjusted for recorded ledger cash movements.",
                recommendation="Maintain an emergency cash cushion of at least 3 months operating expenses to absorb demand volatility.",
                follow_ups=[
                    "Can I afford to hire someone?",
                    "Show me my overdue invoices",
                    "What is my next best move?",
                ],
            )

        # 5. Hiring & Affordability
        if any(w in q for w in ("hire", "salary", "employee", "contractor", "afford")):
            return ChatResponse(
                answer=(
                    f"With a cash balance of {cash_str} and monthly net flow of {cf_str}, "
                    f"adding new payroll commitments should be evaluated against your 6-month cash buffer."
                ),
                evidence=[
                    f"Cash Reserves: {cash_str}",
                    f"Monthly Net Flow: {cf_str}",
                    f"Current Monthly Burn: {exp_str}",
                ],
                interpretation="A new hire represents a fixed monthly burn commitment that raises your breakeven revenue threshold.",
                recommendation="Proceed with hiring only if the role directly unlocks revenue capacity or saves measurable founder operational hours.",
                follow_ups=[
                    "Simulate hiring in What-If scenarios",
                    "What is my revenue forecast?",
                    "What is my profit margin?",
                ],
            )

        # 6. Priorities & Next Month
        if any(w in q for w in ("priority", "focus", "should i", "next month", "recommend")):
            return ChatResponse(
                answer=(
                    f"Based on your ledger for {biz_name}, your top 3 priorities are: "
                    f"(1) Collect {ar_str} in outstanding customer invoices, "
                    f"(2) Audit top expense categories, and (3) Expand high-margin offerings."
                ),
                evidence=[
                    f"Outstanding Invoices (AR): {ar_str}",
                    f"Current Operating Margin: {margin_str}",
                    f"Monthly Burn Rate: {exp_str}",
                ],
                interpretation="Focusing on accounts receivable collection delivers the quickest non-dilutive liquidity boost.",
                recommendation="Send automated payment reminders for any invoices approaching or past their due dates.",
                follow_ups=[
                    "Show me overdue invoices",
                    "What are my biggest risks?",
                    "How is my business health score?",
                ],
            )

        # 7. Invoices & Receivables
        if any(w in q for w in ("invoice", "overdue", "billing", "receivable", "client")):
            return ChatResponse(
                answer=(
                    f"You have {ar_str} in uncollected client receivables. "
                    f"Collecting these will directly increase your cash balance of {cash_str}."
                ),
                evidence=[
                    f"Total Outstanding Receivables: {ar_str}",
                    f"Current Bank Cash Balance: {cash_str}",
                    f"Monthly Net Cash Flow: {cf_str}",
                ],
                interpretation="Uncollected invoices tie up working capital and elevate credit risk the longer they stay past due.",
                recommendation="Follow up immediately on overdue invoices with a phone call or direct payment link.",
                follow_ups=[
                    "View Invoices page",
                    "What is my cash balance?",
                    "What is my next best move?",
                ],
            )

        # Default fallback
        return ChatResponse(
            answer=(
                f"I've analyzed the financial ledger for {biz_name}. Your monthly revenue is {rev_str}, "
                f"expenses are {exp_str}, profit is {prof_str} ({margin_str} margin), and cash balance is {cash_str}."
            ),
            evidence=[
                f"Revenue: {rev_str}",
                f"Expenses: {exp_str}",
                f"Net Profit: {prof_str}",
                f"Cash Balance: {cash_str}",
            ],
            interpretation="Your business records are actively tracked in your private workspace ledger.",
            recommendation="Ask me about specific areas like expenses, cash flow, debt repayments, or hiring scenarios.",
            follow_ups=[
                "How is my business health score?",
                "What are my biggest expenses?",
                "Can I afford to hire someone?",
                "What should I focus on next month?",
            ],
        )

    async def generate_insights(
        self,
        metrics: List[FinancialMetrics],
        transactions: List[Transaction],
        invoices: Optional[List[Invoice]] = None,
    ) -> List[AIInsight]:
        """Proactively detect actionable financial risks, anomalies, trends, and opportunities."""
        if not metrics:
            return []

        latest = metrics[-1]
        insights: List[AIInsight] = []

        # 1. Risk: Expense growth outpaces revenue
        if latest.expenses_change_pct > latest.revenue_change_pct + 3:
            gap = round(latest.expenses_change_pct - latest.revenue_change_pct, 1)
            insights.append(
                AIInsight(
                    id="ins-risk-exp-growth",
                    type="risk",
                    severity="high",
                    title="Operating Expenses Outpacing Revenue",
                    explanation=(
                        f"Expenses grew {gap}% faster than revenue this period. "
                        f"If this pattern persists, your operating margin ({latest.margin * 100:.1f}%) will erode."
                    ),
                    evidence=[
                        f"Expense MoM change: +{latest.expenses_change_pct:.1f}%",
                        f"Revenue MoM change: +{latest.revenue_change_pct:.1f}%",
                        f"Current margin: {latest.margin * 100:.1f}%",
                    ],
                    recommendation="Audit your top expense categories and freeze non-essential discretionary spending.",
                )
            )

        # 2. Trend: Top expense category identification
        if latest.expense_breakdown:
            top_cat, top_amt = max(latest.expense_breakdown.items(), key=lambda x: x[1])
            top_pct = (top_amt / latest.expenses * 100.0) if latest.expenses > 0 else 0
            if top_pct >= 30:
                insights.append(
                    AIInsight(
                        id="ins-trend-top-expense",
                        type="trend",
                        severity="medium",
                        title=f"High Expense Concentration in {top_cat}",
                        explanation=(
                            f"{top_cat} accounts for {top_pct:.0f}% of total monthly operating expenses ({top_amt:,.2f})."
                        ),
                        evidence=[
                            f"Category: {top_cat}",
                            f"Monthly Amount: {top_amt:,.2f}",
                            f"Share of Expenses: {top_pct:.1f}%",
                        ],
                        recommendation="Evaluate whether volume discounts or annual vendor commitments can reduce unit costs.",
                    )
                )

        # 3. Anomaly: Transaction outliers > 3x average in category
        if transactions:
            cat_totals: Dict[str, List[float]] = defaultdict(list)
            for t in transactions:
                if t.type == "expense" and t.status == "completed":
                    cat_totals[t.category].append(t.amount)

            for t in transactions[-20:]:  # Check recent transactions
                if t.type == "expense" and t.status == "completed":
                    amounts = cat_totals.get(t.category, [])
                    if len(amounts) >= 3:
                        avg_amt = sum(amounts) / len(amounts)
                        if t.amount > avg_amt * 2.8 and t.amount > 1000:
                            insights.append(
                                AIInsight(
                                    id=f"ins-anomaly-{t.id[:8]}",
                                    type="anomaly",
                                    severity="medium",
                                    title=f"Unusual Large Expense: {t.description}",
                                    explanation=(
                                        f"Transaction of {t.amount:,.2f} on {t.date} is significantly above "
                                        f"the typical {t.category} average of {avg_amt:,.2f}."
                                    ),
                                    evidence=[
                                        f"Transaction Date: {t.date}",
                                        f"Amount: {t.amount:,.2f}",
                                        f"Category Average: {avg_amt:,.2f}",
                                    ],
                                    recommendation="Verify this was a one-time capital purchase rather than a recurring cost increase.",
                                )
                            )
                            break  # report the most significant anomaly

        # 4. Opportunity: Retainer & recurring expansion
        insights.append(
            AIInsight(
                id="ins-opp-recurring",
                type="opportunity",
                severity="medium",
                title="Expand Predictable Retainer Billing",
                explanation=(
                    "Converting project-based accounts into recurring monthly retainers provides dependable "
                    "operating cash flow and shields the business from seasonal dips."
                ),
                evidence=[
                    f"Current Monthly Revenue: {latest.revenue:,.2f}",
                    "Contract Mix: Predominantly project milestones",
                ],
                recommendation="Identify your top 3 recurring clients and propose quarterly retainer agreements with tiered support.",
            )
        )

        # 5. Positive: Consistent positive cash flow
        positive_cf_count = sum(1 for m in metrics if m.cash_flow > 0)
        if positive_cf_count >= len(metrics) * 0.75 and len(metrics) >= 2:
            insights.append(
                AIInsight(
                    id="ins-pos-cashflow",
                    type="positive",
                    severity="low",
                    title="Consistent Operating Cash Reserves",
                    explanation=(
                        f"Your business maintained positive net cash flow in {positive_cf_count} of the last "
                        f"{len(metrics)} months, building a solid working capital cushion."
                    ),
                    evidence=[
                        f"Positive Cash Flow Months: {positive_cf_count}/{len(metrics)}",
                        f"Current Cash Balance: {latest.cash_balance:,.2f}",
                    ],
                    recommendation="Allocate surplus cash toward growth initiatives or reserve buffers.",
                )
            )

        return insights

    async def what_if_analysis(
        self,
        request: WhatIfRequest,
        metrics: List[FinancialMetrics],
        workspace: Optional[Workspace] = None,
    ) -> WhatIfResult:
        """Simulate revenue shifts, expense increases, new hires, delayed receivables, and churn."""
        if not metrics:
            return WhatIfResult(
                description=request.description,
                projected_revenue=0.0,
                projected_expenses=0.0,
                projected_profit=0.0,
                projected_cash_flow=0.0,
                projected_health_score=0.0,
                ai_interpretation="Insufficient historical data to model simulation scenario.",
                recommendation="Record transactions to establish baseline metrics.",
            )

        latest = metrics[-1]
        params = request.params

        rev_pct = (params.get("revenue_change_pct") or params.get("revenue_pct") or 0.0) / 100.0
        exp_pct = (params.get("expense_change_pct") or params.get("expense_pct") or 0.0) / 100.0
        hire_cost = params.get("monthly_salary", 0.0)
        churn_pct = (params.get("churn_pct") or 0.0) / 100.0
        delayed_ar_days = params.get("delayed_ar_days", 0.0)

        # Exact simulation arithmetic
        effective_rev_multiplier = max(0.0, 1.0 + rev_pct - churn_pct)
        new_rev = round(latest.revenue * effective_rev_multiplier, 2)
        new_exp = round((latest.expenses * (1.0 + exp_pct)) + hire_cost, 2)
        new_profit = round(new_rev - new_exp, 2)

        # Cash flow adjustment: AR delay reduces immediate cash conversion
        ar_drag = (new_rev * (delayed_ar_days / 90.0)) if delayed_ar_days > 0 else 0.0
        profit_delta = new_profit - latest.profit
        new_cf = round(latest.cash_flow + profit_delta - ar_drag, 2)

        current_health = compute_health_score(metrics)
        health_delta = (profit_delta / max(1.0, abs(latest.profit or 1.0))) * 20.0
        new_health = round(max(0.0, min(100.0, current_health.overall + health_delta)), 1)

        curr = workspace.currency if workspace else "USD"
        risk_label = "manageable" if new_profit > latest.profit * 0.75 else "high risk"

        interpretation = (
            f"Under this scenario, your monthly profit moves from {curr} {latest.profit:,.2f} "
            f"to {curr} {new_profit:,.2f} (a net change of {curr} {profit_delta:+,.2f}). "
            f"Net cash flow is projected at {curr} {new_cf:,.2f}. "
            f"This impact is rated as {risk_label}, shifting your health score from "
            f"{current_health.overall:.1f} to {new_health:.1f}."
        )

        recommendation = (
            "Monitor this simulation against your 3-month cash runway. "
            "Ensure you maintain at least 3 months of operating expenses in cash reserves before committing to fixed recurring costs."
        )

        return WhatIfResult(
            description=request.description,
            projected_revenue=new_rev,
            projected_expenses=new_exp,
            projected_profit=new_profit,
            projected_cash_flow=new_cf,
            projected_health_score=new_health,
            ai_interpretation=interpretation,
            recommendation=recommendation,
        )

    async def generate_business_summary(
        self,
        metrics: List[FinancialMetrics],
        invoices: List[Invoice],
        workspace: Optional[Workspace] = None,
    ) -> BusinessSummary:
        """Synthesize overall executive financial summary from ledger and invoices."""
        if not metrics:
            return BusinessSummary(
                period="No data",
                ai_summary="Insufficient transaction records to compile executive summary.",
                highlights=[],
                concerns=[],
                recommendations=["Record transactions or import a CSV file to generate financial insights."],
            )

        latest = metrics[-1]
        curr = workspace.currency if workspace else "USD"
        biz_name = workspace.name if workspace else "Your Business"

        total_rev = sum(m.revenue for m in metrics)
        total_exp = sum(m.expenses for m in metrics)
        total_profit = total_rev - total_exp

        overdue_invoices = [inv for inv in invoices if inv.status == "overdue"]
        overdue_sum = sum(inv.total for inv in overdue_invoices)

        highlights: List[str] = []
        concerns: List[str] = []
        recs: List[str] = []

        if latest.margin >= 0.20:
            highlights.append(f"Healthy operating profit margin of {latest.margin * 100:.1f}%.")
        if latest.cash_flow > 0:
            highlights.append(f"Positive monthly net cash flow of {curr} {latest.cash_flow:,.2f}.")
        if latest.revenue_change_pct > 0:
            highlights.append(f"Revenue expanded {latest.revenue_change_pct:.1f}% period-over-period.")

        if latest.expenses_change_pct > latest.revenue_change_pct + 3:
            concerns.append(f"Expense growth (+{latest.expenses_change_pct:.1f}%) is outpacing revenue expansion.")
        if overdue_invoices:
            concerns.append(f"{len(overdue_invoices)} overdue client invoices totaling {curr} {overdue_sum:,.2f}.")
        if latest.margin < 0.15:
            concerns.append(f"Operating margin ({latest.margin * 100:.1f}%) is compressed below 15%.")

        recs.append("Establish monthly budget caps for top operating expense categories.")
        if overdue_invoices:
            recs.append(f"Follow up promptly to collect {curr} {overdue_sum:,.2f} in overdue receivables.")
        recs.append("Consider migrating repeat customers to quarterly retainer contracts.")

        period_str = f"{metrics[0].period} to {latest.period}" if len(metrics) > 1 else latest.period
        summary_text = (
            f"Across {period_str}, {biz_name} generated {curr} {total_rev:,.2f} in revenue "
            f"against {curr} {total_exp:,.2f} in operating costs, producing {curr} {total_profit:,.2f} "
            f"in cumulative profit. Current cash balance stands at {curr} {latest.cash_balance:,.2f}."
        )

        return BusinessSummary(
            period=period_str,
            ai_summary=summary_text,
            highlights=highlights,
            concerns=concerns,
            recommendations=recs,
        )


def get_ai_provider() -> RuleBasedFinancialAI:
    """Return the active rule-based financial AI provider."""
    return RuleBasedFinancialAI()
