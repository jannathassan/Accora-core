from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Notification(BaseModel):
    __tablename__ = "notifications"

    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="medium", nullable=False)
    read = Column(Boolean, default=False, nullable=False, index=True)
    action_url = Column(String(255), default="", nullable=False)
    related_id = Column(String(255), default="", nullable=False)
    fingerprint = Column(String(255), default="", nullable=False, index=True)

    workspace = relationship("Workspace", backref="notifications")
