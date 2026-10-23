from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_active_workspace

from app.models.workspace import Workspace
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.services.notifications import sync_workspace_notifications

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """List all notifications for the active workspace, syncing new financial risk alerts."""
    return sync_workspace_notifications(db, workspace)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: str,
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Mark a specific notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.workspace_id == workspace.id,
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found in active workspace.",
        )

    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/read-all", response_model=dict)
def mark_all_notifications_read(
    workspace: Workspace = Depends(get_active_workspace),
    db: Session = Depends(get_db),
):
    """Mark all unread notifications in the active workspace as read."""
    updated_count = db.query(Notification).filter(
        Notification.workspace_id == workspace.id,
        Notification.read == False,
    ).update({"read": True})

    db.commit()
    return {"ok": True, "updated_count": updated_count}
