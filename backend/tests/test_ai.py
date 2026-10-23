import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def register_and_get_token(email: str, name: str, ws_name: str = "AI Testing Business"):
    """Helper to register user and obtain bearer token and workspace id."""
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


def test_ai_copilot_chat():
    token, ws_id = register_and_get_token("ai_chat_tester@accora.ai", "AI Chat Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Add realistic transaction context
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-01", "description": "Consulting Retainer", "category": "Services", "type": "income", "amount": 10000.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-05", "description": "Cloud Servers", "category": "Software & Tools", "type": "expense", "amount": 1500.0},
        headers=headers,
    )

    # 1. Ask about profit
    res_profit = client.post(
        "/api/v1/ai/chat",
        json={"message": "What is my current profit margin?"},
        headers=headers,
    )
    assert res_profit.status_code == 200
    data_profit = res_profit.json()
    assert "answer" in data_profit
    assert len(data_profit["evidence"]) > 0
    assert "source" in data_profit
    assert data_profit["source"] == "rule_based_engine"

    # 2. Ask about hiring
    res_hire = client.post(
        "/api/v1/ai/chat",
        json={"message": "Can I afford to hire a full-time engineer?"},
        headers=headers,
    )
    assert res_hire.status_code == 200
    assert "answer" in res_hire.json()
    assert len(res_hire.json()["follow_ups"]) > 0

    # 3. Ask about debt/loans
    res_debt = client.post(
        "/api/v1/ai/chat",
        json={"message": "What is my current loan situation?"},
        headers=headers,
    )
    assert res_debt.status_code == 200
    assert "answer" in res_debt.json()


def test_ai_proactive_insights():
    token, ws_id = register_and_get_token("ai_insights_tester@accora.ai", "AI Insights Tester")
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-01", "description": "Revenue", "category": "Sales Revenue", "type": "income", "amount": 8000.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-15", "description": "Rent", "category": "Office & Rent", "type": "expense", "amount": 1200.0},
        headers=headers,
    )

    res = client.get("/api/v1/ai/insights", headers=headers)
    assert res.status_code == 200
    insights = res.json()
    assert len(insights) > 0
    for ins in insights:
        assert ins["type"] in ("risk", "opportunity", "anomaly", "trend", "positive")
        assert ins["severity"] in ("high", "medium", "low")
        assert "title" in ins
        assert "explanation" in ins
        assert "recommendation" in ins


def test_ai_what_if_simulation():
    token, ws_id = register_and_get_token("ai_whatif_tester@accora.ai", "AI WhatIf Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Baseline: 10,000 revenue, 2,000 expenses -> 8,000 profit
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-01", "description": "Base Sales", "category": "Sales Revenue", "type": "income", "amount": 10000.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-10", "description": "Base OpEx", "category": "Operating", "type": "expense", "amount": 2000.0},
        headers=headers,
    )

    # Simulation: 20% revenue drop, 3000 new monthly salary
    payload = {
        "description": "Lost key client (-20% rev) and hired junior assistant ($3,000)",
        "params": {
            "revenue_change_pct": -20.0,
            "monthly_salary": 3000.0,
        },
    }

    res = client.post("/api/v1/ai/what-if", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    # Expected projected revenue: 10,000 * 0.8 = 8,000
    assert data["projected_revenue"] == 8000.0
    # Expected projected expenses: 2,000 + 3,000 = 5,000
    assert data["projected_expenses"] == 5000.0
    # Expected projected profit: 8,000 - 5,000 = 3,000
    assert data["projected_profit"] == 3000.0
    assert "ai_interpretation" in data
    assert "recommendation" in data
    assert data["projected_health_score"] >= 0.0
