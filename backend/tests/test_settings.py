import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def register_and_get_token(email: str, name: str, ws_name: str = "Settings Business"):
    """Helper to register a user and return the auth token and primary workspace ID."""
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "full_name": name,
            "business_name": ws_name,
        },

    )
    assert res.status_code == 201
    data = res.json()
    return data["access_token"], data["active_workspace"]["id"]


def test_get_settings_default():
    token, ws_id = register_and_get_token("settings_def@accora.ai", "Settings Default User")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/settings", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "business" in data
    assert "preferences" in data
    assert "ai_preferences" in data

    assert data["business"]["currency"] == "USD"
    assert data["business"]["employee_count"] == 1
    assert data["preferences"]["default_view"] == "dashboard"
    assert data["ai_preferences"]["proactive_insights"] is True


def test_update_settings_persistent():
    token, ws_id = register_and_get_token("settings_upd@accora.ai", "Settings Update User")
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch initial
    initial = client.get("/api/v1/settings", headers=headers).json()

    # Modify
    payload = {
        "business": {
            **initial["business"],
            "business_name": "Apex Global Studio",
            "currency": "EUR",
            "employee_count": 8,
            "opening_cash_balance": 35000.0,
            "avg_monthly_revenue": 18000.0,
            "monthly_fixed_expenses": 6500.0,
            "monthly_variable_expenses": 2500.0,
            "financial_goals": "Scale to 50k MRR by Q4",
            "tax_rate": 0.20,
        },
        "preferences": {
            "date_format": "DD/MM/YYYY",
            "default_view": "analytics",
        },
        "ai_preferences": {
            "proactive_insights": True,
            "risk_tolerance": "aggressive",
            "forecast_horizon_months": 6,
            "email_alerts": False,
        },
    }

    put_res = client.put("/api/v1/settings", json=payload, headers=headers)
    assert put_res.status_code == 200
    saved = put_res.json()

    assert saved["business"]["business_name"] == "Apex Global Studio"
    assert saved["business"]["currency"] == "EUR"
    assert saved["business"]["employee_count"] == 8
    assert saved["business"]["opening_cash_balance"] == 35000.0
    assert saved["business"]["tax_rate"] == 0.20
    assert saved["preferences"]["date_format"] == "DD/MM/YYYY"
    assert saved["preferences"]["default_view"] == "analytics"
    assert saved["ai_preferences"]["risk_tolerance"] == "aggressive"
    assert saved["ai_preferences"]["forecast_horizon_months"] == 6

    # Verify persistent across another request (fresh DB query)
    verify_res = client.get("/api/v1/settings", headers=headers)
    assert verify_res.status_code == 200
    verified = verify_res.json()
    assert verified["business"]["currency"] == "EUR"
    assert verified["business"]["opening_cash_balance"] == 35000.0
    assert verified["preferences"]["default_view"] == "analytics"


def test_settings_workspace_isolation():
    token_a, ws_a = register_and_get_token("sett_ws_a@accora.ai", "User A", "Workspace Alpha")
    token_b, ws_b = register_and_get_token("sett_ws_b@accora.ai", "User B", "Workspace Beta")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Update Workspace Alpha to GBP
    settings_a = client.get("/api/v1/settings", headers=headers_a).json()
    settings_a["business"]["currency"] = "GBP"
    settings_a["business"]["business_name"] = "Alpha Enterprises"
    client.put("/api/v1/settings", json=settings_a, headers=headers_a)

    # Verify Workspace Beta is unaffected
    settings_b = client.get("/api/v1/settings", headers=headers_b).json()
    assert settings_b["business"]["currency"] == "USD"
    assert settings_b["business"]["business_name"] == "Workspace Beta"
