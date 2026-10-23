"""Financial analytics engine for Accora Core.

Computes exact monthly financial metrics, business health scores,
cash-flow statuses, multi-metric forecasts, and data-driven next moves.
"""

from collections import defaultdict
from datetime import date as Date, datetime
from typing import List, Optional, Dict

from app.models.workspace import Workspace
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceSummary
from app.schemas.analytics import (
    FinancialMetrics,
    BusinessHealthScore,
    CashFlowStatus,
    Forecast,
    ForecastPoint,
    NextBestMove,
    PLReport,
    ExpenseReport,
    ExpenseCategory,
    CashFlowReport,
)


def compute_invoice_summary(invoices: List[Invoice]) -> InvoiceSummary:
    """Calculate aggregated invoice metrics: total invoiced, paid, pending, and overdue."""
    today = Date.today()
    total_invoiced = 0.0
    total_paid = 0.0
    total_pending = 0.0
    total_overdue = 0.0
    count_invoiced = 0
    count_paid = 0
    count_pending = 0
    count_overdue = 0

    for inv in invoices:
        if inv.status == "cancelled":
            continue

        total_invoiced += inv.total
        count_invoiced += 1

        if inv.status == "paid":
            total_paid += inv.total
            count_paid += 1
        elif inv.status == "overdue" or (inv.status in ["pending", "sent", "draft"] and inv.due_date < today):
            total_overdue += inv.total
            count_overdue += 1
        else:
            total_pending += inv.total
            count_pending += 1

    return InvoiceSummary(
        total_invoiced=round(total_invoiced, 2),
        total_paid=round(total_paid, 2),
        total_pending=round(total_pending, 2),
        total_overdue=round(total_overdue, 2),
        count_invoiced=count_invoiced,
        count_paid=count_paid,
        count_pending=count_pending,
        count_overdue=count_overdue,
    )



def compute_monthly_metrics(
    transactions: List[Transaction],
    workspace: Optional[Workspace] = None,
    invoices: Optional[List[Invoice]] = None,
) -> List[FinancialMetrics]:
    """
    Aggregate transactions into monthly FinancialMetrics, incorporating
    workspace opening cash balances, debt repayments, and baseline setup estimates.
    """
    # Calculate outstanding receivables from pending/sent/overdue invoices + pending income transactions
    pending_txns_amt = sum(
        t.amount for t in transactions
        if t.type == "income" and t.status == "pending"
    )
    uncollected_invoices_amt = (
        sum(inv.total for inv in invoices if inv.status in ("pending", "sent", "overdue"))
        if invoices else 0.0
    )
    outstanding_total = round(pending_txns_amt + uncollected_invoices_amt, 2)

    if not transactions:
        # If no transactions exist, check if workspace has onboarding baseline figures
        if workspace and (
            (workspace.opening_cash_balance or 0) > 0
            or (workspace.avg_monthly_revenue or 0) > 0
            or (workspace.monthly_fixed_expenses or 0) > 0
            or (workspace.monthly_variable_expenses or 0) > 0
            or (workspace.loan_balance or 0) > 0
        ):
            current_period = Date.today().strftime("%Y-%m")
            rev = float(workspace.avg_monthly_revenue or 0.0)
            fixed_exp = float(workspace.monthly_fixed_expenses or 0.0)
            var_exp = float(workspace.monthly_variable_expenses or 0.0)
            exp = fixed_exp + var_exp
            profit = rev - exp
            margin = profit / rev if rev > 0 else 0.0

            operating_cf = profit
            financing_cf = -float(workspace.monthly_loan_repayment or 0.0)
            net_cf = operating_cf + financing_cf
            opening_bal = float(workspace.opening_cash_balance or 0.0)
            closing_cash = opening_bal + net_cf

            exp_breakdown: Dict[str, float] = {}
            if fixed_exp > 0:
                exp_breakdown["Fixed Expenses"] = round(fixed_exp, 2)
            if var_exp > 0:
                exp_breakdown["Variable Expenses"] = round(var_exp, 2)

            return [
                FinancialMetrics(
                    period=current_period,
                    revenue=round(rev, 2),
                    expenses=round(exp, 2),
                    profit=round(profit, 2),
                    margin=round(margin, 4),
                    cash_flow=round(net_cf, 2),
                    cash_balance=round(closing_cash, 2),
                    outstanding=outstanding_total,
                    revenue_change_pct=0.0,
                    expenses_change_pct=0.0,
                    profit_change_pct=0.0,
                    expense_breakdown=exp_breakdown,
                    is_estimated=True,
                    opening_balance=round(opening_bal, 2),
                    operating_cash_flow=round(operating_cf, 2),
                    financing_cash_flow=round(financing_cf, 2),
                )
            ]
        return []

    # Group completed transactions by YYYY-MM
    monthly: Dict[str, Dict] = defaultdict(
        lambda: {"revenue": 0.0, "expenses": 0.0, "expense_cats": defaultdict(float)}
    )

    for txn in sorted(transactions, key=lambda t: t.date):
        period_key = txn.date.strftime("%Y-%m")
        if txn.type == "income":
            if txn.status == "completed":
                monthly[period_key]["revenue"] += txn.amount
        else:
            if txn.status == "completed":
                monthly[period_key]["expenses"] += txn.amount
                monthly[period_key]["expense_cats"][txn.category] += txn.amount

    result: List[FinancialMetrics] = []
    prev: Optional[FinancialMetrics] = None

    running_cash = float(workspace.opening_cash_balance) if workspace and workspace.opening_cash_balance else 0.0
    loan_repayment = float(workspace.monthly_loan_repayment) if workspace and workspace.monthly_loan_repayment else 0.0

    for period in sorted(monthly.keys()):
        rev = monthly[period]["revenue"]
        exp = monthly[period]["expenses"]
        profit = rev - exp
        margin = profit / rev if rev > 0 else 0.0

        period_opening = running_cash
        operating_cf = profit
        financing_cf = -loan_repayment
        net_cf = operating_cf + financing_cf
        running_cash += net_cf

        def calc_pct_change(curr: float, prior: float) -> float:
            if prior == 0:
                return 0.0
            return round((curr - prior) / prior * 100, 1)

        m = FinancialMetrics(
            period=period,
            revenue=round(rev, 2),
            expenses=round(exp, 2),
            profit=round(profit, 2),
            margin=round(margin, 4),
            cash_flow=round(net_cf, 2),
            cash_balance=round(running_cash, 2),
            outstanding=outstanding_total,
            revenue_change_pct=calc_pct_change(rev, prev.revenue) if prev else 0.0,
            expenses_change_pct=calc_pct_change(exp, prev.expenses) if prev else 0.0,
            profit_change_pct=calc_pct_change(profit, prev.profit) if prev else 0.0,
            expense_breakdown={
                k: round(v, 2) for k, v in monthly[period]["expense_cats"].items()
            },
            is_estimated=False,
            opening_balance=round(period_opening, 2),
            operating_cash_flow=round(operating_cf, 2),
            financing_cash_flow=round(financing_cf, 2),
        )
        result.append(m)
        prev = m

    return result


def compute_health_score(metrics: List[FinancialMetrics]) -> BusinessHealthScore:
    """Derive an explainable, multi-dimensional health score from financial metrics."""
    if not metrics:
        return BusinessHealthScore(
            overall=0,
            label="No Data",
            revenue_performance=0,
            profitability=0,
            expense_control=0,
            cash_flow_health=0,
            growth_trend=0,
            explanation="Insufficient financial data to compute a business health score.",
            strengths=[],
            improvements=["Add transactions or configure your business profile to generate a health score."],
        )

    latest = metrics[-1]

    # 1. Revenue performance (25%): consistency vs 6-month average
    avg_rev = sum(m.revenue for m in metrics) / len(metrics)
    rev_perf = min(100.0, max(0.0, (latest.revenue / avg_rev) * 80.0)) if avg_rev > 0 else 50.0

    # 2. Profitability (25%): margin-based (25% margin = 100)
    avg_margin = sum(m.margin for m in metrics) / len(metrics)
    profitability = min(100.0, max(0.0, avg_margin * 400.0))

    # 3. Expense control (20%): penalty if expenses grow faster than revenue
    avg_exp_growth = (
        sum(m.expenses_change_pct for m in metrics[1:]) / max(1, len(metrics) - 1)
        if len(metrics) > 1 else 0.0
    )
    expense_ctrl = max(0.0, min(100.0, 100.0 - avg_exp_growth * 3.0))

    # 4. Cash flow health (15%): % of positive cash flow months
    positive_cf_months = sum(1 for m in metrics if m.cash_flow > 0)
    cf_health = (positive_cf_months / len(metrics)) * 100.0

    # 5. Growth trend (15%): revenue growth trajectory
    avg_rev_growth = (
        sum(m.revenue_change_pct for m in metrics[1:]) / max(1, len(metrics) - 1)
        if len(metrics) > 1 else 0.0
    )
    growth = max(0.0, min(100.0, 50.0 + avg_rev_growth * 5.0))

    overall = round(
        rev_perf * 0.25
        + profitability * 0.25
        + expense_ctrl * 0.20
        + cf_health * 0.15
        + growth * 0.15,
        1,
    )

    if overall >= 80:
        label = "Excellent"
    elif overall >= 65:
        label = "Healthy"
    elif overall >= 50:
        label = "Needs Attention"
    else:
        label = "At Risk"

    strengths: List[str] = []
    improvements: List[str] = []

    if rev_perf >= 75:
        strengths.append("Strong and reliable revenue generation")
    if cf_health >= 75:
        strengths.append("Consistent positive monthly cash flow")
    if growth >= 70:
        strengths.append("Sustained positive revenue expansion trajectory")
    if profitability >= 75:
        strengths.append("Solid profit margins exceeding 20%")

    if profitability < 65:
        improvements.append("Profit margin is compressed by rising operating costs")
    if expense_ctrl < 65:
        improvements.append("Expense run rate is expanding faster than revenue growth")
    if growth < 50:
        improvements.append("Revenue growth has flattened or declined MoM")
    if cf_health < 50:
        improvements.append("Cash flow exhibits frequent negative dips")

    explanation_parts = [f"Your overall score is {overall:.1f}/100 ({label})."]
    if rev_perf >= 75:
        explanation_parts.append("Revenue volume remains strong.")
    if profitability < 60:
        explanation_parts.append(f"Profitability ({profitability:.0f}/100) is pressured by operating expenditure.")
    if expense_ctrl < 60:
        explanation_parts.append("Expense growth requires active budget caps.")
    if cf_health >= 75:
        explanation_parts.append("Cash flow buffer provides working capital stability.")
    explanation_parts.append(f"Current operating margin is {latest.margin * 100:.1f}%.")

    return BusinessHealthScore(
        overall=overall,
        label=label,
        revenue_performance=round(rev_perf, 1),
        profitability=round(profitability, 1),
        expense_control=round(expense_ctrl, 1),
        cash_flow_health=round(cf_health, 1),
        growth_trend=round(growth, 1),
        explanation=" ".join(explanation_parts),
        strengths=strengths,
        improvements=improvements,
    )


def compute_cash_flow_status(metrics: List[FinancialMetrics], currency: str = "USD") -> CashFlowStatus:
    """Analyze cash flow runway and projected 3-month balance."""
    if not metrics:
        return CashFlowStatus(
            status="healthy",
            label="Healthy",
            explanation="Insufficient transaction data to model cash flow status.",
            projected_balance_3mo=0.0,
            recommendation="Record transactions or enter your opening balance in Settings.",
        )

    recent = metrics[-3:] if len(metrics) >= 3 else metrics
    avg_cf = sum(m.cash_flow for m in recent) / len(recent)
    latest = metrics[-1]

    projected_3mo = latest.cash_balance + (avg_cf * 3.0)

    if avg_cf > 0 and projected_3mo >= latest.cash_balance:
        return CashFlowStatus(
            status="healthy",
            label="Healthy",
            explanation=(
                f"Your cash flow is solidly positive. Average monthly net flow of "
                f"{currency} {avg_cf:,.0f} maintains strong operational liquidity."
            ),
            projected_balance_3mo=round(projected_3mo, 2),
            recommendation="Consider building a 6-month operating cash cushion or investing surplus in strategic growth.",
        )
    elif avg_cf > 0:
        return CashFlowStatus(
            status="watch",
            label="Watch",
            explanation=(
                f"Cash flow is positive but tightening. Average monthly net flow is "
                f"{currency} {avg_cf:,.0f}. Projected 3-month cash position is {currency} {projected_3mo:,.0f}."
            ),
            projected_balance_3mo=round(projected_3mo, 2),
            recommendation="Audit variable expenses and recurring subscriptions before cash reserves tighten further.",
        )
    else:
        return CashFlowStatus(
            status="at_risk",
            label="At Risk",
            explanation=(
                f"Cash flow is currently negative. Average monthly net outflow of "
                f"{currency} {abs(avg_cf):,.0f} could reduce reserves to "
                f"{currency} {projected_3mo:,.0f} in 3 months."
            ),
            projected_balance_3mo=round(projected_3mo, 2),
            recommendation="Take prompt action: defer non-essential capital purchases and accelerate collection of uncollected client invoices.",
        )


def generate_forecast(metrics: List[FinancialMetrics]) -> List[Forecast]:
    """Generate 3-month predictive linear extrapolation forecasts with confidence intervals."""
    if not metrics:
        return []

    forecasts: List[Forecast] = []
    metric_configs = [
        ("revenue", "revenue", "Projected using linear trend regression across historical periods."),
        ("expenses", "expenses", "Projected based on recent expense trajectory and operating burn."),
        ("profit", "profit", "Derived from projected revenue minus forecasted expenses."),
        ("cash_flow", "cash_flow", "Estimated from projected net operating and financing cash movements."),
    ]

    for metric_attr, metric_label, explanation in metric_configs:
        values = [getattr(m, metric_attr) for m in metrics]
        n = min(6, len(values))
        recent = values[-n:]

        if n >= 2:
            x_mean = (n - 1) / 2.0
            y_mean = sum(recent) / n
            numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(recent))
            denominator = sum((i - x_mean) ** 2 for i in range(n))
            slope = numerator / denominator if denominator != 0 else 0.0
            intercept = y_mean - slope * x_mean
        else:
            slope = 0.0
            intercept = recent[0]

        points: List[ForecastPoint] = []

        # Historical points
        for m in metrics[-n:]:
            points.append(
                ForecastPoint(
                    date=m.period,
                    value=round(getattr(m, metric_attr), 2),
                    is_predicted=False,
                )
            )

        # 3 Future months
        last_period = metrics[-1].period
        try:
            yr, mo = map(int, last_period.split("-"))
        except ValueError:
            yr, mo = Date.today().year, Date.today().month

        for step in range(1, 4):
            mo += 1
            if mo > 12:
                mo = 1
                yr += 1
            future_period = f"{yr:04d}-{mo:02d}"
            predicted = intercept + slope * (n - 1 + step)
            # Confidence interval expands 8% per forecasted step
            band = max(abs(predicted) * 0.08 * step, 150.0)
            points.append(
                ForecastPoint(
                    date=future_period,
                    value=round(predicted, 2),
                    is_predicted=True,
                    confidence_low=round(predicted - band, 2),
                    confidence_high=round(predicted + band, 2),
                )
            )

        forecasts.append(
            Forecast(
                metric=metric_label,
                points=points,
                explanation=explanation,
            )
        )

    return forecasts


def generate_next_best_move(
    metrics: List[FinancialMetrics],
    invoices: List[Invoice],
    cash_flow_status: CashFlowStatus,
    currency: str = "USD",
) -> NextBestMove:
    """Identify the single highest-priority financial decision for the business owner."""
    latest = metrics[-1] if metrics else None

    # 1. Overdue invoices check
    overdue_invoices = [inv for inv in invoices if inv.status == "overdue"]
    overdue_total = sum(inv.total for inv in overdue_invoices)

    if overdue_invoices:
        return NextBestMove(
            title="Collect Overdue Invoices",
            description=(
                f"{currency} {overdue_total:,.2f} is outstanding across {len(overdue_invoices)} "
                f"overdue invoice{'s' if len(overdue_invoices) > 1 else ''}."
            ),
            why_it_matters=(
                "Collecting overdue payments directly expands your cash balance without taking on debt or incurring new costs."
            ),
            action_label="View Invoices",
            action_url="/app/invoices",
            impact=f"+{currency} {overdue_total:,.2f} immediate cash improvement",
            secondary=[
                "Send immediate payment reminders with direct payment links.",
                "Implement 50% upfront deposits on future client orders.",
            ],
        )

    # 2. Cash flow risk check
    if cash_flow_status.status == "at_risk":
        return NextBestMove(
            title="Stabilize Cash Position",
            description=cash_flow_status.explanation,
            why_it_matters=(
                "Negative cash flow drains reserves and reduces financial resilience against unforeseen expenses."
            ),
            action_label="View Analytics",
            action_url="/app/analytics",
            impact="Prevent potential liquidity pinch over next quarter",
            secondary=[
                "Freeze non-essential SaaS tools and discretionary subscriptions.",
                "Follow up on pending client invoices to accelerate receivables.",
            ],
        )

    # 3. Expense runaway check
    if latest and latest.expenses_change_pct > latest.revenue_change_pct + 5:
        gap = latest.expenses_change_pct - latest.revenue_change_pct
        return NextBestMove(
            title="Cap Operating Expense Growth",
            description=(
                f"Expenses grew {gap:.1f} percentage points faster than revenue this month, "
                f"compressing profit margins."
            ),
            why_it_matters=(
                "When operating costs outpace sales growth, margins decline and burn rates rise."
            ),
            action_label="Review Expenses",
            action_url="/app/analytics",
            impact=f"Protect operating margin against further compression",
            secondary=[
                "Audit top expense categories driving monthly growth.",
                "Renegotiate terms with primary vendors and contractors.",
            ],
        )

    # 4. Low profit margin check
    if latest and latest.margin < 0.20 and latest.margin > 0:
        return NextBestMove(
            title="Improve Gross Profit Margins",
            description=(
                f"Current margin is {latest.margin * 100:.1f}%, below the healthy 20% benchmark."
            ),
            why_it_matters=(
                "Thin margins leave minimal buffer for unexpected costs or seasonal revenue dips."
            ),
            action_label="View Reports",
            action_url="/app/reports",
            impact=f"Target 5% margin increase on core products/services",
            secondary=[
                "Review pricing structure and phase out low-margin offerings.",
                "Focus sales efforts on high-margin product lines.",
            ],
        )

    # Default: Strategic expansion
    return NextBestMove(
        title="Scale Predictable Retainer Revenue",
        description=(
            "Expand recurring client contracts to increase cash flow predictability and reduce revenue volatility."
        ),
        why_it_matters=(
            "Recurring revenues lower customer acquisition costs and build a stable baseline for hiring and investment."
        ),
        action_label="View Insights",
        action_url="/app/intelligence",
        impact="Increase predictable monthly cash baseline",
        secondary=[
            "Pitch retainer packages to your top 3 repeat customers.",
            "Establish recurring quarterly billing for ongoing maintenance.",
        ],
    )


def generate_pnl_report(metrics: List[FinancialMetrics], months: int = 12) -> PLReport:
    """Generate a formal Profit & Loss report from metrics."""
    data = metrics[-months:] if months else metrics
    if not data:
        return PLReport(
            period="No data",
            revenue=0.0,
            expenses=0.0,
            gross_profit=0.0,
            net_profit=0.0,
            margin=0.0,
            expense_breakdown={},
        )

    total_rev = sum(m.revenue for m in data)
    total_exp = sum(m.expenses for m in data)
    profit = total_rev - total_exp
    margin = profit / total_rev if total_rev > 0 else 0.0

    exp_breakdown: Dict[str, float] = defaultdict(float)
    for m in data:
        for cat, val in m.expense_breakdown.items():
            exp_breakdown[cat] += val

    period_str = f"{data[0].period} to {data[-1].period}" if len(data) > 1 else data[0].period

    return PLReport(
        period=period_str,
        revenue=round(total_rev, 2),
        expenses=round(total_exp, 2),
        gross_profit=round(profit, 2),
        net_profit=round(profit, 2),
        margin=round(margin, 4),
        expense_breakdown={k: round(v, 2) for k, v in sorted(exp_breakdown.items(), key=lambda x: -x[1])},
    )


def generate_expense_report(metrics: List[FinancialMetrics], months: int = 12) -> ExpenseReport:
    """Generate an expense breakdown report across categories with prior period comparison."""
    data = metrics[-months:] if months else metrics
    if not data:
        return ExpenseReport(period="No data", total=0.0, breakdown={}, top_categories=[], change_vs_prior=0.0)

    total = sum(m.expenses for m in data)
    breakdown: Dict[str, float] = defaultdict(float)
    for m in data:
        for cat, val in m.expense_breakdown.items():
            breakdown[cat] += val

    top = sorted(breakdown.items(), key=lambda x: -x[1])[:5]
    top_categories = [
        ExpenseCategory(
            category=k,
            amount=round(v, 2),
            pct=round((v / total * 100.0) if total > 0 else 0.0, 1),
        )
        for k, v in top
    ]

    prior = metrics[-(months * 2):-months] if len(metrics) >= months * 2 else []
    prior_total = sum(m.expenses for m in prior) if prior else total
    change = round(((total - prior_total) / prior_total * 100.0) if prior_total > 0 else 0.0, 1)

    period_str = f"{data[0].period} to {data[-1].period}" if len(data) > 1 else data[0].period

    return ExpenseReport(
        period=period_str,
        total=round(total, 2),
        breakdown={k: round(v, 2) for k, v in sorted(breakdown.items(), key=lambda x: -x[1])},
        top_categories=top_categories,
        change_vs_prior=change,
    )


def generate_cashflow_report(metrics: List[FinancialMetrics], months: int = 12) -> CashFlowReport:
    """Generate a comprehensive Cash Flow report."""
    data = metrics[-months:] if months else metrics
    if not data:
        return CashFlowReport(
            period="No data",
            inflow=0.0,
            outflow=0.0,
            net=0.0,
            opening_balance=0.0,
            closing_balance=0.0,
        )

    inflow = sum(m.revenue for m in data)
    outflow = sum(m.expenses for m in data)
    net = inflow - outflow
    opening = data[0].opening_balance
    closing = data[-1].cash_balance

    period_str = f"{data[0].period} to {data[-1].period}" if len(data) > 1 else data[0].period

    return CashFlowReport(
        period=period_str,
        inflow=round(inflow, 2),
        outflow=round(outflow, 2),
        net=round(net, 2),
        opening_balance=round(opening, 2),
        closing_balance=round(closing, 2),
    )
