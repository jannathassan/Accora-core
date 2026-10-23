from datetime import date as Date
from typing import List
from sqlalchemy.orm import Session

from app.models.workspace import Workspace
from app.models.invoice import Invoice
from app.models.transaction import Transaction
from app.models.notification import Notification
from app.analytics.engine import compute_monthly_metrics


def sync_workspace_notifications(db: Session, workspace: Workspace) -> List[Notification]:
    """
    Evaluate actual workspace invoices, ledger movements, and financial metrics
    to deterministically generate and persist actionable financial alerts.
    
    Guarantees:
    - Deduplicated via unique fingerprinting (never duplicates alerts on refresh).
    - Preserves read status across sessions.
    - Strictly scoped to workspace.id.
    """
    today = Date.today()
    created_any = False

    # 1. Check for Overdue Invoices
    invoices = db.query(Invoice).filter(
        Invoice.workspace_id == workspace.id,
        Invoice.status.in_(["sent", "pending", "overdue", "draft"])
    ).all()

    for inv in invoices:
        if inv.due_date < today and inv.status != "paid" and inv.status != "cancelled":
            fp = f"overdue_invoice:{inv.id}:{inv.due_date}"
            existing = db.query(Notification).filter(
                Notification.workspace_id == workspace.id,
                Notification.fingerprint == fp
            ).first()

            if not existing:
                notif = Notification(
                    workspace_id=workspace.id,
                    type="overdue_invoice",
                    title=f"Invoice #{inv.invoice_number} is Overdue",
                    message=f"Payment of {workspace.currency} {inv.total:,.2f} from {inv.client_name} was due on {inv.due_date}.",
                    severity="high",
                    read=False,
                    action_url="/app/invoices",
                    related_id=inv.id,
                    fingerprint=fp,
                )
                db.add(notif)
                created_any = True

    # 2. Check Financial Metrics for Low Cash Runway & Expense Spikes
    txns = db.query(Transaction).filter(
        Transaction.workspace_id == workspace.id
    ).order_by(Transaction.date.asc()).all()

    metrics = compute_monthly_metrics(txns, workspace, invoices)
    if metrics:
        latest = metrics[-1]

        # Low Cash Reserves / Solvency Warning
        if latest.expenses > 0 and latest.cash_balance < (latest.expenses * 1.5):
            fp = f"cashflow_warning:{latest.period}:{round(latest.cash_balance, -2)}"
            existing = db.query(Notification).filter(
                Notification.workspace_id == workspace.id,
                Notification.fingerprint == fp
            ).first()

            if not existing:
                notif = Notification(
                    workspace_id=workspace.id,
                    type="cashflow_warning",
                    title="Critical Cash Runway Warning",
                    message=f"Current cash balance of {workspace.currency} {latest.cash_balance:,.2f} provides less than 1.5 months of operating runway based on current monthly spend ({workspace.currency} {latest.expenses:,.2f}).",
                    severity="high",
                    read=False,
                    action_url="/app/forecast",
                    related_id=latest.period,
                    fingerprint=fp,
                )
                db.add(notif)
                created_any = True

        # Expense Spikes (> 20% growth)
        if latest.expenses_change_pct >= 20.0 and latest.expenses > 500:
            fp = f"expense_spike:{latest.period}:{round(latest.expenses_change_pct, 1)}"
            existing = db.query(Notification).filter(
                Notification.workspace_id == workspace.id,
                Notification.fingerprint == fp
            ).first()

            if not existing:
                notif = Notification(
                    workspace_id=workspace.id,
                    type="expense_spike",
                    title="Operating Expense Spike Detected",
                    message=f"Monthly expenses grew by {latest.expenses_change_pct:.1f}% to {workspace.currency} {latest.expenses:,.2f} this period.",
                    severity="medium",
                    read=False,
                    action_url="/app/analytics",
                    related_id=latest.period,
                    fingerprint=fp,
                )
                db.add(notif)
                created_any = True

        # Revenue Milestone
        if latest.revenue_change_pct >= 15.0 and latest.revenue > 1000:
            fp = f"revenue_milestone:{latest.period}:{round(latest.revenue_change_pct, 1)}"
            existing = db.query(Notification).filter(
                Notification.workspace_id == workspace.id,
                Notification.fingerprint == fp
            ).first()

            if not existing:
                notif = Notification(
                    workspace_id=workspace.id,
                    type="revenue_milestone",
                    title="Positive Revenue Acceleration",
                    message=f"Revenue expanded by {latest.revenue_change_pct:.1f}% to {workspace.currency} {latest.revenue:,.2f}.",
                    severity="low",
                    read=False,
                    action_url="/app/dashboard",
                    related_id=latest.period,
                    fingerprint=fp,
                )
                db.add(notif)
                created_any = True

    if created_any:
        db.commit()

    return db.query(Notification).filter(
        Notification.workspace_id == workspace.id
    ).order_by(Notification.created_at.desc()).all()
