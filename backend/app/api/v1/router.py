from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    workspaces,
    transactions,
    invoices,
    analytics,
    ai,
    notifications,
    settings,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(analytics.router, tags=["Analytics & Financial Intelligence"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics & Financial Intelligence"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Copilot & Scenarios"])

api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])



