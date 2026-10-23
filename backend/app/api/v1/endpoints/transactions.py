from typing import List, Optional
from datetime import date as Date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, extract, desc, asc

from app.core.database import get_db
from app.api.deps import get_active_workspace
from app.models.workspace import Workspace
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionBatchImportRequest,
    TransactionBatchImportResponse,
    CategoriesResponse,
)

router = APIRouter()

STANDARD_INCOME_CATEGORIES = [
    "Sales Revenue",
    "Services",
    "Consulting",
    "Investments",
    "Refunds",
    "Other Income",
]

STANDARD_EXPENSE_CATEGORIES = [
    "Cost of Goods Sold",
    "Advertising & Marketing",
    "Software & Tools",
    "Salaries & Contractors",
    "Office & Rent",
    "Utilities",
    "Travel",
    "Taxes & Licenses",
    "Operating",
    "Miscellaneous",
]


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    category: Optional[str] = Query(None, description="Filter by category"),
    type: Optional[str] = Query(None, pattern="^(income|expense)$", description="Filter by type"),
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$", description="Filter by month (YYYY-MM)"),
    search: Optional[str] = Query(None, description="Search description or category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    sort_by: str = Query("date", pattern="^(date|amount|description)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Retrieve transactions scoped to the active workspace with rich filtering and sorting."""
    query = db.query(Transaction).filter(Transaction.workspace_id == workspace.id)

    if category:
        query = query.filter(Transaction.category == category)
    if type:
        query = query.filter(Transaction.type == type)
    if status_filter:
        query = query.filter(Transaction.status == status_filter)
    if month:
        try:
            year_val, month_val = map(int, month.split("-"))
            query = query.filter(
                extract("year", Transaction.date) == year_val,
                extract("month", Transaction.date) == month_val,
            )
        except ValueError:
            pass

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Transaction.description.ilike(search_pattern),
                Transaction.category.ilike(search_pattern),
                Transaction.notes.ilike(search_pattern),
            )
        )

    # Sorting
    sort_col = getattr(Transaction, sort_by, Transaction.date)
    if sort_dir == "asc":
        query = query.order_by(asc(sort_col), asc(Transaction.id))
    else:
        query = query.order_by(desc(sort_col), desc(Transaction.id))

    return query.all()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Create a new transaction in the active workspace with exact decimal values."""
    new_tx = Transaction(
        workspace_id=workspace.id,
        date=payload.date,
        description=payload.description.strip(),
        category=payload.category.strip(),
        type=payload.type,
        amount=round(float(payload.amount), 2),
        status=payload.status,
        notes=payload.notes.strip(),
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx


@router.post("/batch", response_model=TransactionBatchImportResponse)
def import_transactions_batch(
    payload: TransactionBatchImportRequest,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """
    Batch import transactions with intelligent duplicate detection.
    Duplicate signature: {date}|{lower(description)}|{type}|{amount:.2f}
    """
    # Fetch existing signatures in this workspace
    existing_records = (
        db.query(Transaction.date, Transaction.description, Transaction.type, Transaction.amount)
        .filter(Transaction.workspace_id == workspace.id)
        .all()
    )
    existing_keys = {
        f"{r.date}|{r.description.strip().lower()}|{r.type}|{r.amount:.2f}"
        for r in existing_records
    }

    seen_in_batch = set()
    to_create: List[Transaction] = []
    duplicates_detected: List[str] = []

    for tx in payload.transactions:
        sig = f"{tx.date}|{tx.description.strip().lower()}|{tx.type}|{tx.amount:.2f}"

        if payload.skip_duplicates and (sig in existing_keys or sig in seen_in_batch):
            duplicates_detected.append(f"{tx.date}: {tx.description} ({tx.amount:.2f})")
            continue

        seen_in_batch.add(sig)
        to_create.append(
            Transaction(
                workspace_id=workspace.id,
                date=tx.date,
                description=tx.description.strip(),
                category=tx.category.strip(),
                type=tx.type,
                amount=round(float(tx.amount), 2),
                status=tx.status,
                notes=tx.notes.strip(),
            )
        )

    if to_create:
        db.add_all(to_create)
        db.commit()

    return TransactionBatchImportResponse(
        imported_count=len(to_create),
        skipped_count=len(duplicates_detected),
        total_count=len(payload.transactions),
        duplicates=duplicates_detected,
    )


@router.get("/categories", response_model=CategoriesResponse)
def get_categories(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Retrieve all available transaction categories (standard defaults + workspace custom categories)."""
    income_records = (
        db.query(Transaction.category)
        .filter(Transaction.workspace_id == workspace.id, Transaction.type == "income")
        .distinct()
        .all()
    )
    expense_records = (
        db.query(Transaction.category)
        .filter(Transaction.workspace_id == workspace.id, Transaction.type == "expense")
        .distinct()
        .all()
    )

    income_set = set(STANDARD_INCOME_CATEGORIES)
    for (cat,) in income_records:
        if cat and cat.strip():
            income_set.add(cat.strip())

    expense_set = set(STANDARD_EXPENSE_CATEGORIES)
    for (cat,) in expense_records:
        if cat and cat.strip():
            expense_set.add(cat.strip())

    return CategoriesResponse(
        income=sorted(list(income_set)),
        expense=sorted(list(expense_set)),
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: str,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Retrieve a single transaction, isolated strictly to the active workspace."""
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.workspace_id == workspace.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
    return tx


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Update a transaction, enforcing workspace isolation."""
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.workspace_id == workspace.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    update_data = payload.model_dump(exclude_unset=True)
    if "description" in update_data and update_data["description"] is not None:
        update_data["description"] = update_data["description"].strip()
    if "category" in update_data and update_data["category"] is not None:
        update_data["category"] = update_data["category"].strip()
    if "notes" in update_data and update_data["notes"] is not None:
        update_data["notes"] = update_data["notes"].strip()
    if "amount" in update_data and update_data["amount"] is not None:
        update_data["amount"] = round(float(update_data["amount"]), 2)

    for field, val in update_data.items():
        setattr(tx, field, val)

    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: str,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Delete a transaction, enforcing workspace isolation."""
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.workspace_id == workspace.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    db.delete(tx)
    db.commit()
    return {"ok": True, "message": "Transaction deleted successfully", "id": transaction_id}
