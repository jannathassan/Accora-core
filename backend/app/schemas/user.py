from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.schemas.workspace import WorkspaceResponse


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    business_name: Optional[str] = Field(default=None, max_length=255)
    currency: Optional[str] = Field(default="USD", max_length=10)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(UserResponse):
    workspaces: List[WorkspaceResponse] = []
    active_workspace_id: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    active_workspace: WorkspaceResponse
    workspaces: List[WorkspaceResponse]
