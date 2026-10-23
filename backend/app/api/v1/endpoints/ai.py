from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_active_workspace
from app.models.workspace import Workspace
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.schemas.analytics import (
    AIInsight,
    ChatRequest,
    ChatResponse,
    WhatIfRequest,
    WhatIfResult,
)
from app.analytics.engine import compute_monthly_metrics
from app.ai.provider import get_ai_provider, build_financial_context

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    request: ChatRequest,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """
    Process conversational query with financial context derived strictly
    from the current user's authenticated workspace.
    Operates in offline-safe rules-based mode if external API keys are omitted.
    """
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)

    provider = get_ai_provider()
    context = build_financial_context(workspace, metrics, invs)
    return await provider.chat(request, context)


@router.get("/insights", response_model=List[AIInsight])
async def ai_insights(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Proactively analyze ledger and invoicing patterns to identify risks, anomalies, and opportunities."""
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)

    provider = get_ai_provider()
    return await provider.generate_insights(metrics, txns, invs)


@router.post("/what-if", response_model=WhatIfResult)
async def ai_what_if(
    request: WhatIfRequest,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """
    Simulate financial scenarios (revenue shifts, expense changes, new hires, delayed receivables, churn)
    using exact arithmetic and real historical metrics.
    """
    txns = db.query(Transaction).filter(Transaction.workspace_id == workspace.id).all()
    invs = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
    metrics = compute_monthly_metrics(txns, workspace=workspace, invoices=invs)

    provider = get_ai_provider()
    return await provider.what_if_analysis(request, metrics, workspace=workspace)
