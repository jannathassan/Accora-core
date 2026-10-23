from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.user import UserCreate, UserLogin, AuthResponse, UserProfileResponse, UserResponse
from app.schemas.workspace import WorkspaceResponse
from app.api.deps import get_current_user, get_user_workspaces_list

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account and automatically provision their initial isolated workspace."""
    # 1. Check for existing user with identical email
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # 2. Hash password securely
    hashed_pwd = get_password_hash(user_in.password)

    # 3. Create user entity
    new_user = User(
        email=user_in.email.lower(),
        hashed_password=hashed_pwd,
        full_name=user_in.full_name.strip(),
        is_active=True,
    )
    db.add(new_user)
    db.flush()  # Populates new_user.id

    # 4. Provision initial workspace
    ws_name = user_in.business_name.strip() if user_in.business_name else f"{new_user.full_name}'s Workspace"
    initial_workspace = Workspace(
        name=ws_name,
        currency=user_in.currency or "USD",
        owner_id=new_user.id,
    )
    db.add(initial_workspace)
    db.flush()

    # 5. Add owner membership record
    initial_membership = WorkspaceMember(
        workspace_id=initial_workspace.id,
        user_id=new_user.id,
        role="owner",
    )
    db.add(initial_membership)
    db.commit()
    db.refresh(new_user)
    db.refresh(initial_workspace)

    # 6. Generate signed JWT token
    token = create_access_token(subject=new_user.id)

    ws_response = WorkspaceResponse(
        id=initial_workspace.id,
        name=initial_workspace.name,
        currency=initial_workspace.currency,
        owner_id=initial_workspace.owner_id,
        role="owner",
        created_at=initial_workspace.created_at,
        updated_at=initial_workspace.updated_at,
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
        active_workspace=ws_response,
        workspaces=[ws_response],
    )


def ensure_demo_user(db: Session) -> User:
    demo_email = "demo@accora.ai"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        hashed_pwd = get_password_hash("DemoPass123!")
        user = User(
            email=demo_email,
            hashed_password=hashed_pwd,
            full_name="Ayesha Khan",
            is_active=True,
        )
        db.add(user)
        db.flush()

        demo_workspace = Workspace(
            name="Lumina Fashion",
            industry="Retail & E-commerce",
            business_type="E-commerce / Retail",
            country="United States",
            currency="USD",
            opening_cash_balance=42500.0,
            avg_monthly_revenue=28000.0,
            monthly_fixed_expenses=11500.0,
            monthly_variable_expenses=7800.0,
            loan_balance=15000.0,
            monthly_loan_repayment=1200.0,
            expected_growth_rate=18.0,
            financial_goals="Expand international direct-to-consumer sales and maintain 6 months of cash runway.",
            onboarding_completed=True,
            owner_id=user.id,
        )
        db.add(demo_workspace)
        db.flush()

        db.add(WorkspaceMember(workspace_id=demo_workspace.id, user_id=user.id, role="owner"))
        db.commit()
        db.refresh(user)

    workspaces = get_user_workspaces_list(user, db)
    if workspaces:
        from app.data.demo_seeder import seed_demo_workspace_data
        seed_demo_workspace_data(db, workspaces[0].id)

    return user


@router.post("/login", response_model=AuthResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive a signed JWT token."""
    email_clean = login_data.email.strip().lower()
    if email_clean == "demo@accora.ai" and login_data.password == "DemoPass123!":
        ensure_demo_user(db)

    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    # Fetch accessible workspaces
    workspaces = get_user_workspaces_list(user, db)
    if not workspaces:
        # Auto-heal: If user has no workspace, provision default
        fallback_ws = Workspace(
            name=f"{user.full_name}'s Workspace",
            currency="USD",
            owner_id=user.id,
        )
        db.add(fallback_ws)
        db.flush()
        db.add(WorkspaceMember(workspace_id=fallback_ws.id, user_id=user.id, role="owner"))
        db.commit()
        db.refresh(fallback_ws)
        fallback_ws.role = "owner"
        workspaces = [fallback_ws]

    token = create_access_token(subject=user.id)

    ws_responses = [
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

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        active_workspace=ws_responses[0],
        workspaces=ws_responses,
    )


@router.post("/demo-login", response_model=AuthResponse)
@router.post("/demo", response_model=AuthResponse)
def demo_login(db: Session = Depends(get_db)):
    """Authenticate as the official demo user (Ayesha Khan / Lumina Fashion) with isolated demo workspace."""
    user = ensure_demo_user(db)
    workspaces = get_user_workspaces_list(user, db)
    token = create_access_token(subject=user.id)
    ws_responses = [WorkspaceResponse.model_validate(w) for w in workspaces]

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        active_workspace=ws_responses[0],
        workspaces=ws_responses,
    )


@router.get("/me", response_model=UserProfileResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details and accessible workspaces for the currently authenticated user."""
    workspaces = get_user_workspaces_list(current_user, db)
    ws_responses = [
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

    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        workspaces=ws_responses,
        active_workspace_id=ws_responses[0].id if ws_responses else None,
    )
