from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, WorkspaceMemberResponse
from app.api.deps import get_current_user, get_current_workspace, get_user_workspaces_list

router = APIRouter()


@router.get("", response_model=List[WorkspaceResponse])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all workspaces accessible to the authenticated user."""
    workspaces = get_user_workspaces_list(current_user, db)
    return [
        WorkspaceResponse(
            id=w.id,
            name=w.name,
            currency=w.currency,
            owner_id=w.owner_id,
            role=getattr(w, "role", "member"),
            created_at=w.created_at,
            updated_at=w.updated_at,
        )
        for w in workspaces
    ]


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    ws_in: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workspace owned by the current user."""
    workspace = Workspace(
        name=ws_in.name.strip(),
        currency=ws_in.currency.upper(),
        owner_id=current_user.id,
    )
    db.add(workspace)
    db.flush()

    # Assign owner membership
    membership = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(membership)
    db.commit()
    db.refresh(workspace)

    workspace.role = "owner"
    return WorkspaceResponse.model_validate(workspace)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace_details(
    workspace: Workspace = Depends(get_current_workspace),
):
    """
    Retrieve workspace details.
    Protected by strict tenant isolation (get_current_workspace).
    Returns 403 if the requesting user does not belong to this workspace.
    """
    return WorkspaceResponse.model_validate(workspace)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    ws_in: WorkspaceUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """
    Update workspace profile and financial baseline (used by Onboarding Wizard & Settings).
    Protected by strict tenant isolation (get_current_workspace).
    """
    update_data = ws_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "currency" and value:
            setattr(workspace, field, value.upper())
        else:
            setattr(workspace, field, value)

    db.commit()
    db.refresh(workspace)
    return WorkspaceResponse.model_validate(workspace)


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
def list_workspace_members(
    workspace: Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    """List all members of an authorized workspace."""
    members = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace.id)
        .all()
    )

    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append(
            WorkspaceMemberResponse(
                id=m.id,
                workspace_id=m.workspace_id,
                user_id=m.user_id,
                role=m.role,
                user_email=user.email if user else None,
                user_full_name=user.full_name if user else None,
                created_at=m.created_at,
            )
        )
    return result
