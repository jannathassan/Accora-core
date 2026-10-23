from sqlalchemy import Column, String, Date, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Transaction(BaseModel):
    __tablename__ = "transactions"

    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    type = Column(String(20), nullable=False, index=True)  # "income" | "expense"
    amount = Column(Float, nullable=False)
    status = Column(String(30), default="completed", nullable=False)  # "completed" | "pending" | "cancelled"
    notes = Column(Text, default="", nullable=False)

    # Relationships
    workspace = relationship("Workspace", backref="transactions")
