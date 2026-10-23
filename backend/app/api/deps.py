from typing import List, Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember

# Use HTTPBearer for clean Authorization: Bearer <token> extraction
security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT token and return the currently authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not auth or not auth.credentials:
        raise credentials_exception

    payload = decode_access_token(auth.credentials)
    if not payload:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    return user


def get_user_workspaces_list(user: User, db: Session) -> List[Workspace]:
    """Retrieve all workspaces accessible by the user with their role attached."""
    # Owned workspaces
    owned = db.query(Workspace).filter(Workspace.owner_id == user.id).all()
    owned_ids = {w.id for w in owned}
    for w in owned:
        w.role = "owner"

    # Member workspaces
    memberships = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.user_id == user.id)
        .all()
    )
    member_workspaces = []
    for m in memberships:
        if m.workspace_id not in owned_ids:
            ws = db.query(Workspace).filter(Workspace.id == m.workspace_id).first()
            if ws:
                ws.role = m.role
                member_workspaces.append(ws)

    return owned + member_workspaces


def get_current_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Workspace:
    """
    Enforce strict workspace tenancy isolation.
    Returns the workspace ONLY if current_user is the owner or an authorized member.
    Otherwise raises 403 Forbidden.
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found.",
        )

    # Check if user is the direct owner
    if workspace.owner_id == current_user.id:
        workspace.role = "owner"
        return workspace

    # Check if user has an authorized membership
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if membership:
        workspace.role = membership.role
        return workspace

    # If neither, reject with 403 Forbidden
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access to this workspace is denied.",
    )


def get_active_workspace(
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Workspace:
    """
    Enforce workspace tenancy isolation for endpoints without workspace_id in the URL path.
    Uses the X-Workspace-Id header if provided; otherwise defaults to the user's primary/first workspace.
    """
    if x_workspace_id:
        return get_current_workspace(x_workspace_id, current_user, db)

    workspaces = get_user_workspaces_list(current_user, db)
    if not workspaces:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No workspace found for the current user.",
        )
    return workspaces[0]

