from typing import List, Optional
from datetime import date as Date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session


from app.core.database import get_db
from app.api.deps import get_active_workspace
from app.models.workspace import Workspace
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.schemas.analytics import (
    FinancialMetrics,
    BusinessHealthScore,
    CashFlowStatus,
    Forecast,
    SmartAction,
    NextBestMove,
    PLReport,
    ExpenseReport,
    CashFlowReport,
    BusinessSummary,
)
from app.analytics.engine import (
    compute_monthly_metrics,
    compute_health_score,
    compute_cash_flow_status,
    generate_forecast,
    generate_next_best_move,
    generate_pnl_report,
    generate_expense_report,
    generate_cashflow_report,
)
from app.ai.provider import get_ai_provider

router = APIRouter()


@router.get("/metrics", response_model=List[FinancialMetrics])
def get_metrics(
    months: Optional[int] = Query(None, ge=1, le=60),
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Retrieve monthly financial metrics, scoped strictly to the active workspace."""
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    if months and months > 0:
        metrics = metrics[-months:]
    return metrics


@router.get("/metrics/latest", response_model=FinancialMetrics)
def get_latest_metrics(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Retrieve the most recent monthly financial metrics."""
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    if not metrics:
        from datetime import date as Date
        return FinancialMetrics(
            period=Date.today().strftime("%Y-%m"),
            revenue=0.0,
            expenses=0.0,
            profit=0.0,
            margin=0.0,
            cash_flow=0.0,
            cash_balance=float(workspace.opening_cash_balance or 0.0),
            outstanding=0.0,
            revenue_change_pct=0.0,
            expenses_change_pct=0.0,
            profit_change_pct=0.0,
            expense_breakdown={},
        )
    return metrics[-1]


@router.get("/health", response_model=BusinessHealthScore)
@router.get("/health-score", response_model=BusinessHealthScore)
def get_health_score(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Calculate transparent multi-factor business health score with factor explanations."""
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    return compute_health_score(metrics)


@router.get("/cashflow", response_model=CashFlowStatus)
@router.get("/cash-flow-status", response_model=CashFlowStatus)
def get_cash_flow_status(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Analyze current cash flow buffer and 3-month projected liquidity."""
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    return compute_cash_flow_status(metrics, currency=workspace.currency or "USD")


@router.get("/forecast", response_model=List[Forecast])
def get_forecast(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Generate 3-month predictive cash flow, revenue, expense, and profit forecasts with confidence bounds."""
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    return generate_forecast(metrics)


@router.get("/actions", response_model=List[SmartAction])
@router.get("/smart-actions", response_model=List[SmartAction])
async def get_smart_actions(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Retrieve prioritized, data-driven smart actions."""
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)

    provider = get_ai_provider()
    insights = await provider.generate_insights(metrics, txns, invs)

    actions: List[SmartAction] = []
    priority = 1

    for ins in insights:
        actions.append(
            SmartAction(
                priority=priority,
                title=ins.title,
                description=ins.explanation,
                impact=ins.recommendation,
                action_label="Review" if ins.type in ("risk", "anomaly") else "Explore",
                insight_type=ins.type,
            )
        )
        priority += 1

    # Overdue invoice check
    overdue_invoices = [i for i in invs if i.status == "overdue"]
    if overdue_invoices:
        overdue_total = sum(i.total for i in overdue_invoices)
        actions.insert(
            0,
            SmartAction(
                priority=1,
                title="Collect Overdue Receivables",
                description=f"{len(overdue_invoices)} invoices are past due totaling {workspace.currency} {overdue_total:,.2f}.",
                impact=f"Collecting would immediately improve cash position by {workspace.currency} {overdue_total:,.2f}.",
                action_label="View Invoices",
                insight_type="risk",
            ),
        )

    return actions


@router.get("/next-best-move", response_model=NextBestMove)
def get_next_best_move_endpoint(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Determine the single highest-priority financial decision for the business owner."""
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    cf_status = compute_cash_flow_status(metrics, currency=workspace.currency or "USD")
    return generate_next_best_move(metrics, invs, cf_status, currency=workspace.currency or "USD")


@router.get("/reports/pnl", response_model=PLReport)
def get_pnl_report(
    months: int = Query(12, ge=1, le=60),
    start_date: Optional[Date] = None,
    end_date: Optional[Date] = None,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Generate Profit & Loss statement from verified workspace transactions."""
    query = db.query(Transaction).filter(Transaction.workspace_id == workspace.id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    txns = query.order_by(Transaction.date.asc()).all()

    inv_query = db.query(Invoice).filter(Invoice.workspace_id == workspace.id)
    if start_date:
        inv_query = inv_query.filter(Invoice.issue_date >= start_date)
    if end_date:
        inv_query = inv_query.filter(Invoice.issue_date <= end_date)
    invs = inv_query.all()

    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    return generate_pnl_report(metrics, months=months)


@router.get("/reports/expenses", response_model=ExpenseReport)
def get_expense_report(
    months: int = Query(12, ge=1, le=60),
    start_date: Optional[Date] = None,
    end_date: Optional[Date] = None,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Generate categorized expense report with prior period comparisons."""
    query = db.query(Transaction).filter(Transaction.workspace_id == workspace.id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    txns = query.order_by(Transaction.date.asc()).all()

    inv_query = db.query(Invoice).filter(Invoice.workspace_id == workspace.id)
    if start_date:
        inv_query = inv_query.filter(Invoice.issue_date >= start_date)
    if end_date:
        inv_query = inv_query.filter(Invoice.issue_date <= end_date)
    invs = inv_query.all()

    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    return generate_expense_report(metrics, months=months)


@router.get("/reports/cashflow", response_model=CashFlowReport)
def get_cash_flow_report(
    months: int = Query(12, ge=1, le=60),
    start_date: Optional[Date] = None,
    end_date: Optional[Date] = None,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Generate cash flow report including opening and closing cash positions."""
    query = db.query(Transaction).filter(Transaction.workspace_id == workspace.id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    txns = query.order_by(Transaction.date.asc()).all()

    inv_query = db.query(Invoice).filter(Invoice.workspace_id == workspace.id)
    if start_date:
        inv_query = inv_query.filter(Invoice.issue_date >= start_date)
    if end_date:
        inv_query = inv_query.filter(Invoice.issue_date <= end_date)
    invs = inv_query.all()

    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    return generate_cashflow_report(metrics, months=months)


@router.get("/reports/summary", response_model=BusinessSummary)
async def get_business_summary(
    start_date: Optional[Date] = None,
    end_date: Optional[Date] = None,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Generate comprehensive executive AI financial summary grounded in real data."""
    query = db.query(Transaction).filter(Transaction.workspace_id == workspace.id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    txns = query.order_by(Transaction.date.asc()).all()

    inv_query = db.query(Invoice).filter(Invoice.workspace_id == workspace.id)
    if start_date:
        inv_query = inv_query.filter(Invoice.issue_date >= start_date)
    if end_date:
        inv_query = inv_query.filter(Invoice.issue_date <= end_date)
    invs = inv_query.all()

    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)
    provider = get_ai_provider()
    return await provider.generate_business_summary(metrics, invs, workspace=workspace)

