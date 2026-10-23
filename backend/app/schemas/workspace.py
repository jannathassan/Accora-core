from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkspaceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    industry: str = Field(default="Technology", max_length=100)
    business_type: str = Field(default="SaaS / Software", max_length=100)
    country: str = Field(default="United States", max_length=100)
    currency: str = Field(default="USD", min_length=3, max_length=10)

    # Financial baseline fields
    opening_cash_balance: float = 0.0
    avg_monthly_revenue: float = 0.0
    monthly_fixed_expenses: float = 0.0
    monthly_variable_expenses: float = 0.0
    loan_balance: float = 0.0
    monthly_loan_repayment: float = 0.0
    expected_growth_rate: float = 15.0
    financial_goals: str = ""
    onboarding_completed: bool = False


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    industry: Optional[str] = "Technology"
    business_type: Optional[str] = "SaaS / Software"
    country: Optional[str] = "United States"
    currency: Optional[str] = "USD"


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    business_type: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    opening_cash_balance: Optional[float] = None
    avg_monthly_revenue: Optional[float] = None
    monthly_fixed_expenses: Optional[float] = None
    monthly_variable_expenses: Optional[float] = None
    loan_balance: Optional[float] = None
    monthly_loan_repayment: Optional[float] = None
    expected_growth_rate: Optional[float] = None
    financial_goals: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class WorkspaceResponse(WorkspaceBase):
    id: str
    owner_id: str
    role: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceMemberResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: str
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
