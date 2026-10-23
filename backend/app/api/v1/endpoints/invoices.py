from typing import List, Optional
from datetime import date as Date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.core.database import get_db
from app.api.deps import get_active_workspace
from app.models.workspace import Workspace
from app.models.invoice import Invoice
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceSummary,
)

router = APIRouter()


def _recalculate_invoice(items_data: list, tax_rate: float) -> tuple[float, float, float]:
    """Calculate subtotal, tax amount, and total with exact 2-decimal arithmetic."""
    subtotal = 0.0
    for item in items_data:
        qty = float(item.get("quantity", 1.0))
        unit = float(item.get("unit_price", 0.0))
        item_amt = round(qty * unit, 2)
        item["amount"] = item_amt
        subtotal += item_amt

    subtotal = round(subtotal, 2)
    tax_amt = round(subtotal * float(tax_rate), 2)
    total = round(subtotal + tax_amt, 2)
    return subtotal, tax_amt, total


def _generate_invoice_number(db: Session, workspace_id: str) -> str:
    """Generate sequential invoice number: INV-YYYYMM-XXXX."""
    now = datetime.now()
    prefix = f"INV-{now.strftime('%Y%m')}-"
    count = (
        db.query(Invoice)
        .filter(Invoice.workspace_id == workspace_id, Invoice.invoice_number.like(f"{prefix}%"))
        .count()
    )
    return f"{prefix}{count + 1:04d}"


@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    client: Optional[str] = Query(None, description="Filter by client name"),
    search: Optional[str] = Query(None, description="Search client or invoice number"),
    sort_by: str = Query("due_date", pattern="^(issue_date|due_date|total|client_name)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Retrieve all invoices belonging to the active workspace with filtering and sorting."""
    query = db.query(Invoice).filter(Invoice.workspace_id == workspace.id)

    today = Date.today()

    if status_filter:
        if status_filter == "overdue":
            query = query.filter(
                or_(
                    Invoice.status == "overdue",
                    (Invoice.status.in_(["pending", "sent", "draft"])) & (Invoice.due_date < today),
                )
            )
        else:
            query = query.filter(Invoice.status == status_filter)

    if client:
        query = query.filter(Invoice.client_name.ilike(f"%{client.strip()}%"))

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(s),
                Invoice.client_name.ilike(s),
                Invoice.client_email.ilike(s),
            )
        )

    sort_col = getattr(Invoice, sort_by, Invoice.due_date)
    if sort_dir == "asc":
        query = query.order_by(asc(sort_col), asc(Invoice.id))
    else:
        query = query.order_by(desc(sort_col), desc(Invoice.id))

    return query.all()


@router.get("/summary", response_model=InvoiceSummary)
def get_invoice_summary(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Calculate aggregated invoice metrics: total invoiced, paid, pending, and overdue."""
    invoices = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
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


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Create a new invoice with automated calculations for line items, taxes, and totals."""
    invoice_number = payload.invoice_number
    if not invoice_number or not invoice_number.strip():
        invoice_number = _generate_invoice_number(db, workspace.id)

    raw_items = [item.model_dump() for item in payload.items]
    subtotal, tax_amount, total = _recalculate_invoice(raw_items, payload.tax_rate)

    paid_date = payload.paid_date
    if payload.status == "paid" and not paid_date:
        paid_date = Date.today()

    new_invoice = Invoice(
        workspace_id=workspace.id,
        invoice_number=invoice_number.strip(),
        client_name=payload.client_name.strip(),
        client_email=payload.client_email.strip(),
        items=raw_items,
        tax_rate=payload.tax_rate,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        status=payload.status,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        paid_date=paid_date,
        notes=payload.notes.strip(),
    )

    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    return new_invoice


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Retrieve an individual invoice scoped to the active workspace."""
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Update invoice attributes and recalculate subtotal/tax/totals if line items or rates change."""
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    update_data = payload.model_dump(exclude_unset=True)

    # Check if items or tax_rate changed
    items_changed = "items" in update_data and update_data["items"] is not None
    tax_rate_changed = "tax_rate" in update_data and update_data["tax_rate"] is not None

    if items_changed or tax_rate_changed:
        current_items = (
            [item.model_dump() if hasattr(item, "model_dump") else item for item in update_data["items"]]
            if items_changed
            else list(invoice.items)
        )
        current_tax_rate = (
            update_data["tax_rate"] if tax_rate_changed else invoice.tax_rate
        )
        subtotal, tax_amount, total = _recalculate_invoice(current_items, current_tax_rate)
        invoice.items = current_items
        invoice.subtotal = subtotal
        invoice.tax_rate = current_tax_rate
        invoice.tax_amount = tax_amount
        invoice.total = total

    # Handle status & paid_date lifecycle
    if "status" in update_data:
        new_status = update_data["status"]
        invoice.status = new_status
        if new_status == "paid":
            invoice.paid_date = update_data.get("paid_date") or invoice.paid_date or Date.today()
        elif new_status != "paid" and "paid_date" not in update_data:
            invoice.paid_date = None

    for field, val in update_data.items():
        if field in ("items", "tax_rate", "status"):
            continue
        if val is not None:
            if isinstance(val, str):
                val = val.strip()
            setattr(invoice, field, val)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Delete an invoice, enforcing strict workspace tenancy."""
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    db.delete(invoice)
    db.commit()
    return {"ok": True, "message": "Invoice deleted successfully", "id": invoice_id}
