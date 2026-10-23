from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_active_workspace

from app.models.workspace import Workspace
from app.schemas.settings import AppSettings, BusinessSettings, UserPreferences, AIPreferences

router = APIRouter()


def _workspace_to_settings(workspace: Workspace) -> AppSettings:
    """Helper to convert Workspace model to structured AppSettings schema."""
    return AppSettings(
        business=BusinessSettings(
            business_name=workspace.name,
            industry=workspace.industry or "Technology",
            business_type=workspace.business_type or "SaaS / Software",
            country=workspace.country or "United States",
            currency=workspace.currency or "USD",
            fiscal_year_start=workspace.fiscal_year_start or "January",
            business_start_date=workspace.business_start_date or "",
            employee_count=workspace.employee_count or 1,
            opening_cash_balance=float(workspace.opening_cash_balance or 0.0),
            avg_monthly_revenue=float(workspace.avg_monthly_revenue or 0.0),
            monthly_fixed_expenses=float(workspace.monthly_fixed_expenses or 0.0),
            monthly_variable_expenses=float(workspace.monthly_variable_expenses or 0.0),
            loan_balance=float(workspace.loan_balance or 0.0),
            monthly_loan_repayment=float(workspace.monthly_loan_repayment or 0.0),
            expected_growth_rate=float(workspace.expected_growth_rate or 15.0),
            financial_goals=workspace.financial_goals or "",
            tax_rate=float(workspace.tax_rate or 0.0),
        ),
        preferences=UserPreferences(
            date_format=workspace.date_format or "MMM DD, YYYY",
            default_view=workspace.default_view or "dashboard",
        ),
        ai_preferences=AIPreferences(
            proactive_insights=bool(workspace.proactive_insights if workspace.proactive_insights is not None else True),
            risk_tolerance=workspace.risk_tolerance or "moderate",
            forecast_horizon_months=workspace.forecast_horizon_months or 3,
            email_alerts=bool(workspace.email_alerts if workspace.email_alerts is not None else True),
        ),
    )


@router.get("", response_model=AppSettings)
def get_settings(
    workspace: Workspace = Depends(get_active_workspace),
):
    """Retrieve full business settings, baseline financial setup, and preferences."""
    return _workspace_to_settings(workspace)


@router.put("", response_model=AppSettings)
def update_settings(
    body: AppSettings,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Persistently update business settings, baseline profile, and user preferences."""
    b = body.business
    p = body.preferences
    ai = body.ai_preferences

    if b.business_name and b.business_name.strip():
        workspace.name = b.business_name.strip()
    if b.industry:
        workspace.industry = b.industry.strip()
    if b.business_type:
        workspace.business_type = b.business_type.strip()
    if b.country:
        workspace.country = b.country.strip()
    if b.currency:
        workspace.currency = b.currency.strip().upper()
    if b.fiscal_year_start:
        workspace.fiscal_year_start = b.fiscal_year_start
    workspace.business_start_date = b.business_start_date or ""
    workspace.employee_count = max(1, b.employee_count)
    workspace.opening_cash_balance = max(0.0, b.opening_cash_balance)
    workspace.avg_monthly_revenue = max(0.0, b.avg_monthly_revenue)
    workspace.monthly_fixed_expenses = max(0.0, b.monthly_fixed_expenses)
    workspace.monthly_variable_expenses = max(0.0, b.monthly_variable_expenses)
    workspace.loan_balance = max(0.0, b.loan_balance)
    workspace.monthly_loan_repayment = max(0.0, b.monthly_loan_repayment)
    workspace.expected_growth_rate = b.expected_growth_rate
    workspace.financial_goals = b.financial_goals or ""
    workspace.tax_rate = max(0.0, min(1.0, b.tax_rate))

    workspace.date_format = p.date_format
    workspace.default_view = p.default_view

    workspace.proactive_insights = ai.proactive_insights
    workspace.risk_tolerance = ai.risk_tolerance
    workspace.forecast_horizon_months = ai.forecast_horizon_months
    workspace.email_alerts = ai.email_alerts

    db.commit()
    db.refresh(workspace)
    return _workspace_to_settings(workspace)
