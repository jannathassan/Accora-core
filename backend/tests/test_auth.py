from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token, verify_password, get_password_hash

client = TestClient(app)


def test_password_hashing_utilities():
    password = "SuperSecretPassword123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_register_success():
    payload = {
        "email": "sarah.founder@example.com",
        "password": "StrongPassword123!",
        "full_name": "Sarah Founder",
        "business_name": "Apex Design Studio",
        "currency": "USD"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "sarah.founder@example.com"
    assert data["user"]["full_name"] == "Sarah Founder"
    assert data["active_workspace"]["name"] == "Apex Design Studio"
    assert data["active_workspace"]["role"] == "owner"


def test_register_duplicate_email():
    payload = {
        "email": "duplicate.user@example.com",
        "password": "Password123!",
        "full_name": "First Instance",
        "business_name": "First Studio"
    }
    # First registration
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Second registration with identical email
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_login_success():
    # Register first
    client.post("/api/v1/auth/register", json={
        "email": "login.test@example.com",
        "password": "MyLoginPassword456!",
        "full_name": "Login Tester",
        "business_name": "Test Co"
    })

    # Login
    response = client.post("/api/v1/auth/login", json={
        "email": "login.test@example.com",
        "password": "MyLoginPassword456!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login.test@example.com"
    assert len(data["workspaces"]) >= 1


def test_login_invalid_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "login.test@example.com",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user():
    response = client.post("/api/v1/auth/login", json={
        "email": "nonexistent.ghost@example.com",
        "password": "SomePassword123!"
    })
    assert response.status_code == 401


def test_get_current_user_profile():
    # Register
    reg = client.post("/api/v1/auth/register", json={
        "email": "profile.check@example.com",
        "password": "ValidPassword123!",
        "full_name": "Profile Owner",
        "business_name": "Owner Ops"
    }).json()
    token = reg["access_token"]

    # Access /me
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "profile.check@example.com"
    assert data["full_name"] == "Profile Owner"
    assert len(data["workspaces"]) >= 1


def test_invalid_token_rejection():
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.payload"}
    )
    assert response.status_code == 401


def test_expired_token_rejection():
    # Generate an explicitly expired token (-10 minutes)
    expired_token = create_access_token(
        subject="dummy-user-id",
        expires_delta=timedelta(minutes=-10)
    )
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401


def test_workspace_tenancy_isolation():
    # 1. Create User Alpha
    alpha_res = client.post("/api/v1/auth/register", json={
        "email": "alpha@example.com",
        "password": "PasswordAlpha123!",
        "full_name": "User Alpha",
        "business_name": "Alpha Corp"
    }).json()
    alpha_token = alpha_res["access_token"]
    alpha_workspace_id = alpha_res["active_workspace"]["id"]

    # 2. Create User Beta
    beta_res = client.post("/api/v1/auth/register", json={
        "email": "beta@example.com",
        "password": "PasswordBeta123!",
        "full_name": "User Beta",
        "business_name": "Beta Enterprises"
    }).json()
    beta_token = beta_res["access_token"]
    beta_workspace_id = beta_res["active_workspace"]["id"]

    # 3. User Alpha can access Workspace Alpha
    res_alpha_own = client.get(
        f"/api/v1/workspaces/{alpha_workspace_id}",
        headers={"Authorization": f"Bearer {alpha_token}"}
    )
    assert res_alpha_own.status_code == 200
    assert res_alpha_own.json()["name"] == "Alpha Corp"

    # 4. User Beta can access Workspace Beta
    res_beta_own = client.get(
        f"/api/v1/workspaces/{beta_workspace_id}",
        headers={"Authorization": f"Bearer {beta_token}"}
    )
    assert res_beta_own.status_code == 200
    assert res_beta_own.json()["name"] == "Beta Enterprises"

    # 5. User Alpha attempts to access User Beta's workspace -> MUST BE DENIED 403!
    res_alpha_breach = client.get(
        f"/api/v1/workspaces/{beta_workspace_id}",
        headers={"Authorization": f"Bearer {alpha_token}"}
    )
    assert res_alpha_breach.status_code == 403
    assert "Access to this workspace is denied" in res_alpha_breach.json()["detail"]

    # 6. User Beta attempts to access User Alpha's workspace -> MUST BE DENIED 403!
    res_beta_breach = client.get(
        f"/api/v1/workspaces/{alpha_workspace_id}",
        headers={"Authorization": f"Bearer {beta_token}"}
    )
    assert res_beta_breach.status_code == 403
    assert "Access to this workspace is denied" in res_beta_breach.json()["detail"]


def test_demo_login():
    response = client.post("/api/v1/auth/demo-login")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["full_name"] == "Ayesha Khan"
    assert data["user"]["email"] == "demo@accora.ai"
    assert data["active_workspace"]["name"] == "Lumina Fashion"
    assert data["active_workspace"]["business_type"] == "E-commerce / Retail"
    assert data["active_workspace"]["opening_cash_balance"] == 42500.0


def test_update_workspace_baseline():
    reg = client.post("/api/v1/auth/register", json={
        "email": "baseline.user@example.com",
        "password": "Password123!",
        "full_name": "Baseline Tester",
        "business_name": "Initial Studio"
    }).json()
    token = reg["access_token"]
    ws_id = reg["active_workspace"]["id"]

    update_payload = {
        "industry": "SaaS",
        "business_type": "SaaS / Software",
        "opening_cash_balance": 50000.0,
        "avg_monthly_revenue": 15000.0,
        "monthly_fixed_expenses": 8000.0,
        "expected_growth_rate": 20.0,
        "financial_goals": "Reach profitability within 6 months.",
        "onboarding_completed": True
    }
    update_res = client.put(
        f"/api/v1/workspaces/{ws_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["opening_cash_balance"] == 50000.0
    assert updated_data["onboarding_completed"] is True
    assert updated_data["expected_growth_rate"] == 20.0

