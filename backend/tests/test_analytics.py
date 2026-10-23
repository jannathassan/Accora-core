import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def register_and_get_token(email: str, name: str, ws_name: str = "Analytics Business"):
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


def test_monthly_metrics_aggregation():
    token, ws_id = register_and_get_token("metrics_tester@accora.ai", "Metrics Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Seed 2 months of transactions
    txns = [
        # Sept 2026
        {"date": "2026-09-05", "description": "Consulting Revenue", "category": "Consulting", "type": "income", "amount": 10000.0},
        {"date": "2026-09-15", "description": "Office Rent", "category": "Office & Rent", "type": "expense", "amount": 2000.0},
        {"date": "2026-09-25", "description": "Software Tools", "category": "Software & Tools", "type": "expense", "amount": 500.0},
        # Oct 2026
        {"date": "2026-10-05", "description": "Product Sales", "category": "Sales Revenue", "type": "income", "amount": 15000.0},
        {"date": "2026-10-15", "description": "Office Rent", "category": "Office & Rent", "type": "expense", "amount": 2000.0},
        {"date": "2026-10-20", "description": "Marketing Ads", "category": "Advertising & Marketing", "type": "expense", "amount": 1500.0},
    ]
    for t in txns:
        res = client.post("/api/v1/transactions", json=t, headers=headers)
        assert res.status_code == 201

    # Fetch metrics
    res = client.get("/api/v1/metrics", headers=headers)
    assert res.status_code == 200
    metrics = res.json()
    assert len(metrics) == 2

    # Sept metrics
    m1 = metrics[0]
    assert m1["period"] == "2026-09"
    assert m1["revenue"] == 10000.0
    assert m1["expenses"] == 2500.0
    assert m1["profit"] == 7500.0
    assert m1["margin"] == 0.75

    # Oct metrics
    m2 = metrics[1]
    assert m2["period"] == "2026-10"
    assert m2["revenue"] == 15000.0
    assert m2["expenses"] == 3500.0
    assert m2["profit"] == 11500.0
    assert m2["revenue_change_pct"] == 50.0  # (15000 - 10000) / 10000 * 100
    assert m2["expenses_change_pct"] == 40.0  # (3500 - 2500) / 2500 * 100


def test_business_health_score():
    token, ws_id = register_and_get_token("health_tester@accora.ai", "Health Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Add a transaction
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-10", "description": "Sales", "category": "Sales Revenue", "type": "income", "amount": 12000.0},
        headers=headers,
    )

    res = client.get("/api/v1/health", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "overall" in data
    assert "label" in data
    assert "revenue_performance" in data
    assert "profitability" in data
    assert "expense_control" in data
    assert "cash_flow_health" in data
    assert "growth_trend" in data
    assert "explanation" in data
    assert isinstance(data["strengths"], list)


def test_cash_flow_status_and_forecast():
    token, ws_id = register_and_get_token("cf_tester@accora.ai", "CF Tester")
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-01", "description": "Client Project", "category": "Sales Revenue", "type": "income", "amount": 8000.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-15", "description": "Salaries", "category": "Salaries & Contractors", "type": "expense", "amount": 3000.0},
        headers=headers,
    )

    # Cash flow status
    cf_res = client.get("/api/v1/cashflow", headers=headers)
    assert cf_res.status_code == 200
    cf_data = cf_res.json()
    assert cf_data["status"] in ("healthy", "watch", "at_risk")
    assert "projected_balance_3mo" in cf_data
    assert "explanation" in cf_data

    # Forecast
    fc_res = client.get("/api/v1/forecast", headers=headers)
    assert fc_res.status_code == 200
    forecasts = fc_res.json()
    assert len(forecasts) == 4  # revenue, expenses, profit, cash_flow
    for fc in forecasts:
        assert fc["metric"] in ("revenue", "expenses", "profit", "cash_flow")
        assert len(fc["points"]) >= 4  # historical + 3 future
        future_points = [p for p in fc["points"] if p["is_predicted"]]
        assert len(future_points) == 3
        for fp in future_points:
            assert fp["confidence_low"] is not None
            assert fp["confidence_high"] is not None
            assert fp["confidence_low"] <= fp["value"] <= fp["confidence_high"]


def test_smart_actions_and_next_best_move():
    token, ws_id = register_and_get_token("actions_tester@accora.ai", "Actions Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Add overdue invoice
    client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Overdue Corp",
            "tax_rate": 0.0,
            "status": "overdue",
            "issue_date": "2026-08-01",
            "due_date": "2026-09-01",
            "items": [{"description": "Deliverable", "quantity": 1, "unit_price": 5000.0}],
        },
        headers=headers,
    )

    # Smart actions
    act_res = client.get("/api/v1/actions", headers=headers)
    assert act_res.status_code == 200
    actions = act_res.json()
    assert len(actions) > 0
    assert any("Overdue" in a["title"] for a in actions)

    # Next best move
    nbm_res = client.get("/api/v1/next-best-move", headers=headers)
    assert nbm_res.status_code == 200
    nbm = nbm_res.json()
    assert "Overdue" in nbm["title"]
    assert "action_url" in nbm


def test_financial_reports_pnl_expenses_cashflow():
    token, ws_id = register_and_get_token("reports_tester@accora.ai", "Reports Tester")
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-01", "description": "Consulting", "category": "Consulting", "type": "income", "amount": 6000.0},
        headers=headers,
    )
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-10", "description": "Hosting", "category": "Software & Tools", "type": "expense", "amount": 500.0},
        headers=headers,
    )

    # PnL
    pnl = client.get("/api/v1/reports/pnl", headers=headers).json()
    assert pnl["revenue"] == 6000.0
    assert pnl["expenses"] == 500.0
    assert pnl["net_profit"] == 5500.0

    # Expenses
    exp = client.get("/api/v1/reports/expenses", headers=headers).json()
    assert exp["total"] == 500.0
    assert len(exp["top_categories"]) > 0

    # Cashflow
    cf = client.get("/api/v1/reports/cashflow", headers=headers).json()
    assert cf["inflow"] == 6000.0
    assert cf["outflow"] == 500.0
    assert cf["net"] == 5500.0

    # Summary
    summary = client.get("/api/v1/reports/summary", headers=headers).json()
    assert "ai_summary" in summary
    assert len(summary["highlights"]) > 0


def test_analytics_workspace_isolation():
    token1, ws1_id = register_and_get_token("isolated_a@accora.ai", "User A", "Workspace A")
    token2, ws2_id = register_and_get_token("isolated_b@accora.ai", "User B", "Workspace B")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-01", "description": "User A Millions", "category": "Sales Revenue", "type": "income", "amount": 250000.0},
        headers=headers1,
    )

    # User 2 checks metrics -> must not see User A's 250,000 revenue
    m2 = client.get("/api/v1/metrics", headers=headers2).json()
    assert len(m2) == 0 or m2[0]["revenue"] == 0.0

    # User 2 tries to spoof User A's workspace in X-Workspace-Id -> 403 Forbidden
    spoof_res = client.get("/api/v1/metrics", headers={"Authorization": f"Bearer {token2}", "X-Workspace-Id": ws1_id})
    assert spoof_res.status_code == 403


def test_analytics_endpoint_aliases():
    token, ws_id = register_and_get_token("aliases_tester@accora.ai", "Aliases Tester")
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-01", "description": "Client Work", "category": "Sales Revenue", "type": "income", "amount": 9000.0},
        headers=headers,
    )

    # Test /analytics/health-score alias
    hs_res = client.get("/api/v1/analytics/health-score", headers=headers)
    assert hs_res.status_code == 200
    assert "overall" in hs_res.json()

    # Test /analytics/cash-flow-status alias
    cf_res = client.get("/api/v1/analytics/cash-flow-status", headers=headers)
    assert cf_res.status_code == 200
    assert "status" in cf_res.json()

    # Test /analytics/smart-actions alias
    act_res = client.get("/api/v1/analytics/smart-actions", headers=headers)
    assert act_res.status_code == 200
    assert isinstance(act_res.json(), list)

