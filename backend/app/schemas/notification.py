from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationBase(BaseModel):
    type: str = Field(..., description="Notification type: overdue_invoice, cashflow_warning, expense_spike, revenue_milestone, insight, general")
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    severity: str = Field(default="medium", pattern="^(low|medium|high)$")
    read: bool = Field(default=False)
    action_url: str = Field(default="")
    related_id: str = Field(default="")


class NotificationResponse(NotificationBase):
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationSummary(BaseModel):
    total: int
    unread: int
    notifications: list[NotificationResponse]
