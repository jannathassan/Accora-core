from sqlalchemy import Column, String, Date, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Invoice(BaseModel):
    __tablename__ = "invoices"

    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number = Column(String(50), nullable=False, index=True)
    client_name = Column(String(255), nullable=False, index=True)
    client_email = Column(String(255), default="", nullable=False)

    # Line items stored as structured JSON: [{"id": str, "description": str, "quantity": float, "unit_price": float, "amount": float}]
    items = Column(JSON, default=list, nullable=False)

    subtotal = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    total = Column(Float, default=0.0, nullable=False)

    status = Column(String(30), default="draft", nullable=False, index=True)  # draft, sent, pending, paid, overdue, cancelled
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    paid_date = Column(Date, nullable=True)
    notes = Column(Text, default="", nullable=False)

    # Relationships
    workspace = relationship("Workspace", backref="invoices")
