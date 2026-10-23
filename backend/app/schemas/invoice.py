from datetime import date as Date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
import uuid


class InvoiceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str = Field(..., min_length=1, max_length=255)
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(default=0.0, ge=0)
    amount: float = Field(default=0.0, ge=0)


class InvoiceBase(BaseModel):
    invoice_number: Optional[str] = Field(None, max_length=50)
    client_name: str = Field(..., min_length=1, max_length=255)
    client_email: str = Field(default="", max_length=255)
    items: List[InvoiceItem] = Field(default_factory=list)
    tax_rate: float = Field(default=0.0, ge=0, le=1.0)
    status: str = Field(default="draft", pattern="^(draft|sent|pending|paid|overdue|cancelled)$")
    issue_date: Date
    due_date: Date
    paid_date: Optional[Date] = None
    notes: str = Field(default="", max_length=2000)


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = Field(None, max_length=50)
    client_name: Optional[str] = Field(None, min_length=1, max_length=255)
    client_email: Optional[str] = Field(None, max_length=255)
    items: Optional[List[InvoiceItem]] = None
    tax_rate: Optional[float] = Field(None, ge=0, le=1.0)
    status: Optional[str] = Field(None, pattern="^(draft|sent|pending|paid|overdue|cancelled)$")
    issue_date: Optional[Date] = None
    due_date: Optional[Date] = None
    paid_date: Optional[Date] = None
    notes: Optional[str] = Field(None, max_length=2000)


class InvoiceResponse(InvoiceBase):
    id: str
    workspace_id: str
    invoice_number: str
    subtotal: float
    tax_amount: float
    total: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceSummary(BaseModel):
    total_invoiced: float
    total_paid: float
    total_pending: float
    total_overdue: float
    count_invoiced: int
    count_paid: int
    count_pending: int
    count_overdue: int
