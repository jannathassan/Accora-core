from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Workspace(BaseModel):
    __tablename__ = "workspaces"

    name = Column(String(255), nullable=False)
    industry = Column(String(100), default="Technology", nullable=False)
    business_type = Column(String(100), default="SaaS / Software", nullable=False)
    country = Column(String(100), default="United States", nullable=False)
    currency = Column(String(10), default="USD", nullable=False)

    # Financial baseline fields from Onboarding Wizard & Settings
    opening_cash_balance = Column(Float, default=0.0, nullable=False)
    avg_monthly_revenue = Column(Float, default=0.0, nullable=False)
    monthly_fixed_expenses = Column(Float, default=0.0, nullable=False)
    monthly_variable_expenses = Column(Float, default=0.0, nullable=False)
    loan_balance = Column(Float, default=0.0, nullable=False)
    monthly_loan_repayment = Column(Float, default=0.0, nullable=False)
    expected_growth_rate = Column(Float, default=15.0, nullable=False)
    financial_goals = Column(Text, default="", nullable=False)
    onboarding_completed = Column(Boolean, default=False, nullable=False)

    # Extended profile & preferences
    fiscal_year_start = Column(String(50), default="January", nullable=False)
    business_start_date = Column(String(50), default="", nullable=False)
    employee_count = Column(Integer, default=1, nullable=False)
    outstanding_ar = Column(Float, default=0.0, nullable=False)
    outstanding_ap = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=0.0, nullable=False)
    date_format = Column(String(50), default="MMM DD, YYYY", nullable=False)
    default_view = Column(String(50), default="dashboard", nullable=False)
    proactive_insights = Column(Boolean, default=True, nullable=False)
    risk_tolerance = Column(String(50), default="moderate", nullable=False)
    forecast_horizon_months = Column(Integer, default=3, nullable=False)
    email_alerts = Column(Boolean, default=True, nullable=False)

    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)


    # Relationships
    owner = relationship(
        "User",
        back_populates="owned_workspaces",
        foreign_keys=[owner_id]
    )
    members = relationship(
        "WorkspaceMember",
        back_populates="workspace",
        cascade="all, delete-orphan"
    )
