from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import security_bearer, get_user_workspaces_list
from app.core.security import decode_access_token
from app.models.user import User
from app.models.workspace import Workspace
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.analytics.engine import compute_monthly_metrics, compute_health_score

router = APIRouter()


@router.get("/system/health", status_code=status.HTTP_200_OK)
def system_health_check(db: Session = Depends(get_db)):
    """Explicit system status probe verifying database connectivity and configuration."""
    db_healthy = False
    db_error = None
    try:
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception as exc:
        db_error = str(exc)

    ai_mode = "external-llm" if settings.AI_PROVIDER_API_KEY else "rules-based"

    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "connected": db_healthy,
            "error": db_error,
        },
        "ai_engine": {
            "mode": ai_mode,
            "external_provider": settings.AI_PROVIDER if settings.AI_PROVIDER_API_KEY else None,
            "rules_engine_active": True,
        },
    }


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
):
    """
    Dual-purpose health endpoint:
    - If Bearer token provided: Returns BusinessHealthScore for the authenticated workspace.
    - If unauthenticated: Returns SystemHealth status probe.
    """
    if auth and auth.credentials:
        payload = decode_access_token(auth.credentials)
        if payload and payload.get("sub"):
            user = db.query(User).filter(User.id == payload["sub"]).first()
            if user and user.is_active:
                workspaces = get_user_workspaces_list(user, db)
                if workspaces:
                    ws = workspaces[0]
                    txns = db.query(Transaction).filter(Transaction.workspace_id == ws.id).all()
                    invs = db.query(Invoice).filter(Invoice.workspace_id == ws.id).all()
                    metrics = compute_monthly_metrics(txns, workspace=ws, invoices=invs)
                    return compute_health_score(metrics)

    return system_health_check(db)
