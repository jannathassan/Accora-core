from typing import Optional
from pydantic import BaseModel, Field


class BusinessSettings(BaseModel):
    business_name: str = Field(default="", max_length=255)
    industry: str = Field(default="Technology", max_length=100)
    business_type: str = Field(default="SaaS / Software", max_length=100)
    country: str = Field(default="United States", max_length=100)
    currency: str = Field(default="USD", max_length=10)
    fiscal_year_start: str = Field(default="January", max_length=50)
    business_start_date: str = Field(default="", max_length=50)
    employee_count: int = Field(default=1, ge=1)
    opening_cash_balance: float = Field(default=0.0, ge=0.0)
    avg_monthly_revenue: float = Field(default=0.0, ge=0.0)
    monthly_fixed_expenses: float = Field(default=0.0, ge=0.0)
    monthly_variable_expenses: float = Field(default=0.0, ge=0.0)
    loan_balance: float = Field(default=0.0, ge=0.0)
    monthly_loan_repayment: float = Field(default=0.0, ge=0.0)
    expected_growth_rate: float = Field(default=15.0)
    financial_goals: str = Field(default="", max_length=2000)
    tax_rate: float = Field(default=0.0, ge=0.0, le=1.0)


class UserPreferences(BaseModel):
    date_format: str = Field(default="MMM DD, YYYY", max_length=50)
    default_view: str = Field(default="dashboard", max_length=50)


class AIPreferences(BaseModel):
    proactive_insights: bool = Field(default=True)
    risk_tolerance: str = Field(default="moderate", pattern="^(conservative|moderate|aggressive)$")
    forecast_horizon_months: int = Field(default=3, ge=1, le=12)
    email_alerts: bool = Field(default=True)


class AppSettings(BaseModel):
    business: BusinessSettings = Field(default_factory=BusinessSettings)
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    ai_preferences: AIPreferences = Field(default_factory=AIPreferences)
