import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def register_and_get_token(email: str, name: str, ws_name: str = "Reports Filter Business"):
    """Helper to register a user and return the auth token and primary workspace ID."""
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "full_name": name,
            "workspace_name": ws_name,
        },
    )
    assert res.status_code == 201
    data = res.json()
    return data["access_token"], data["active_workspace"]["id"]


def test_pnl_report_date_filtering():
    token, ws_id = register_and_get_token("reports_filter@accora.ai", "Filter Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # August transactions
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-08-15", "description": "Aug Client Fee", "category": "Consulting", "type": "income", "amount": 3000.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-08-20", "description": "Aug Software", "category": "Software", "type": "expense", "amount": 500.0},
        headers=headers,
    )

    # September transactions
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-09-10", "description": "Sep Client Fee", "category": "Consulting", "type": "income", "amount": 7000.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-09-18", "description": "Sep Office Rent", "category": "Office", "type": "expense", "amount": 1200.0},
        headers=headers,
    )

    # October transactions
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-05", "description": "Oct Retainer", "category": "Consulting", "type": "income", "amount": 10000.0},
        headers=headers,
    )

    # 1. Unfiltered (or all 12 months)
    all_res = client.get("/api/v1/analytics/reports/pnl?months=12", headers=headers)
    assert all_res.status_code == 200
    all_data = all_res.json()
    assert all_data["revenue"] == 20000.0
    assert all_data["expenses"] == 1700.0
    assert all_data["net_profit"] == 18300.0

    # 2. Date-filtered: Only September (2026-09-01 to 2026-09-30)
    filtered_res = client.get(
        "/api/v1/analytics/reports/pnl?start_date=2026-09-01&end_date=2026-09-30",
        headers=headers,
    )
    assert filtered_res.status_code == 200
    sep_data = filtered_res.json()

    assert sep_data["revenue"] == 7000.0
    assert sep_data["expenses"] == 1200.0
    assert sep_data["net_profit"] == 5800.0
    assert "Office" in sep_data["expense_breakdown"]


def test_expense_report_date_filtering():
    token, ws_id = register_and_get_token("exp_filter@accora.ai", "Expense Filter Tester")
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/transactions",
        json={"date": "2026-08-01", "description": "Old Ad", "category": "Marketing", "type": "expense", "amount": 800.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-10", "description": "New Hardware", "category": "Equipment", "type": "expense", "amount": 2500.0},
        headers=headers,
    )

    # Filter to only October
    res = client.get(
        "/api/v1/analytics/reports/expenses?start_date=2026-10-01&end_date=2026-10-31",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2500.0
    top_cats = [c["category"] for c in data["top_categories"]]
    assert "Equipment" in top_cats
    assert "Marketing" not in top_cats


def test_cashflow_report_date_filtering():
    token, ws_id = register_and_get_token("cf_filter@accora.ai", "Cashflow Filter Tester")
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/transactions",
        json={"date": "2026-09-05", "description": "Customer Payment", "category": "Sales", "type": "income", "amount": 5000.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-09-12", "description": "Server Bill", "category": "Hosting", "type": "expense", "amount": 600.0},
        headers=headers,
    )

    res = client.get(
        "/api/v1/analytics/reports/cashflow?start_date=2026-09-01&end_date=2026-09-30",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["inflow"] == 5000.0
    assert data["outflow"] == 600.0
    assert data["net"] == 4400.0
