"""End-to-End User Journey & Comprehensive Security Verification Test Suite for Accora Core.

Tests the full lifecycle:
1. Public endpoints (Health & Root)
2. Demo Login & Session Payload
3. User Registration, Login, Session Restoration, and Baseline Onboarding
4. Transactions CRUD, Search, Filter, and CSV batch import with duplicate detection
5. Invoices lifecycle, tax calculations, and payment tracking (zero double-counting)
6. Financial Analytics, Business Health Score, Cash Flow Forecast, What-If Scenarios
7. Rule-based AI Copilot & Proactive Insights (offline fallback without external API key)
8. Financial Reports reconciliation and date-range filtering
9. Notifications generation, fingerprint deduplication, and read state tracking
10. Settings persistent storage and retrieval
11. Multi-tenant workspace isolation across all resources
"""

from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_complete_e2e_journey_and_isolation():
    # ---------------------------------------------------------
    # 1. Health & Root Endpoints
    # ---------------------------------------------------------
    res = client.get("/")
    assert res.status_code == 200
    assert "Accora Core" in res.json()["message"]

    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    # ---------------------------------------------------------
    # 2. Demo Account Login
    # ---------------------------------------------------------
    demo_res = client.post("/api/v1/auth/demo")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert "access_token" in demo_data
    assert demo_data["user"]["email"] == "demo@accora.ai"
    assert demo_data["active_workspace"]["onboarding_completed"] is True

    # ---------------------------------------------------------
    # 3. User Registration, Authentication, Session Restoration
    # ---------------------------------------------------------
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "sarah.founder@lumina.io",
            "password": "SecurePassword2026!",
            "full_name": "Sarah Connor",
            "business_name": "Lumina Creative Studio",
        },
    )
    assert reg_res.status_code == 201
    auth_data = reg_res.json()
    token = auth_data["access_token"]
    ws_id = auth_data["active_workspace"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Session restoration check: /auth/me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "sarah.founder@lumina.io"
    assert me_res.json()["active_workspace_id"] == ws_id

    # ---------------------------------------------------------
    # 4. Onboarding Baseline Configuration
    # ---------------------------------------------------------
    onboarding_res = client.put(
        f"/api/v1/workspaces/{ws_id}",
        headers=headers,
        json={
            "industry": "Design & Marketing",
            "business_type": "Agency",
            "country": "United States",
            "currency": "USD",
            "opening_cash_balance": 25000.0,
            "avg_monthly_revenue": 15000.0,
            "monthly_fixed_expenses": 4500.0,
            "monthly_variable_expenses": 2000.0,
            "loan_balance": 10000.0,
            "monthly_loan_repayment": 500.0,
            "expected_growth_rate": 20.0,
            "financial_goals": "Achieve $30k MRR by Q4",
            "onboarding_completed": True,
        },
    )
    assert onboarding_res.status_code == 200
    ws_profile = onboarding_res.json()
    assert ws_profile["onboarding_completed"] is True
    assert ws_profile["opening_cash_balance"] == 25000.0

    # ---------------------------------------------------------
    # 5. Transactions CRUD, Search, Filter
    # ---------------------------------------------------------
    today = date.today()
    t1_res = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "date": today.isoformat(),
            "description": "Brand Identity Project - Client A",
            "category": "Design Services",
            "type": "income",
            "amount": 7500.0,
            "status": "completed",
            "notes": "Initial 50% milestone",
        },
    )
    assert t1_res.status_code == 201
    t1_id = t1_res.json()["id"]

    t2_res = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "date": today.isoformat(),
            "description": "Figma Enterprise Subscription",
            "category": "Software",
            "type": "expense",
            "amount": 900.0,
            "status": "completed",
            "notes": "Annual software seat",
        },
    )
    assert t2_res.status_code == 201
    t2_id = t2_res.json()["id"]

    t3_res = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "date": today.isoformat(),
            "description": "Temporary Freelance Assistant",
            "category": "Contractors",
            "type": "expense",
            "amount": 1200.0,
            "status": "completed",
        },
    )
    assert t3_res.status_code == 201
    t3_id = t3_res.json()["id"]

    # Search
    search_res = client.get("/api/v1/transactions?search=Figma", headers=headers)
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1
    assert search_res.json()[0]["id"] == t2_id

    # Filter by type
    filter_res = client.get("/api/v1/transactions?type=expense", headers=headers)
    assert filter_res.status_code == 200
    assert len(filter_res.json()) == 2

    # Update transaction
    update_res = client.put(
        f"/api/v1/transactions/{t2_id}",
        headers=headers,
        json={"amount": 850.0, "notes": "Negotiated discount applied"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["amount"] == 850.0

    # Delete transaction
    del_res = client.delete(f"/api/v1/transactions/{t3_id}", headers=headers)
    assert del_res.status_code == 200
    get_deleted = client.get(f"/api/v1/transactions/{t3_id}", headers=headers)
    assert get_deleted.status_code == 404

    # ---------------------------------------------------------
    # 6. CSV Batch Import with Duplicate Detection
    # ---------------------------------------------------------
    csv_payload = {
        "transactions": [
            # Duplicate item (exact date, description, amount, type)
            {
                "date": today.isoformat(),
                "description": "Brand Identity Project - Client A",
                "category": "Design Services",
                "type": "income",
                "amount": 7500.0,
                "status": "completed",
            },
            # New unique item
            {
                "date": (today - timedelta(days=5)).isoformat(),
                "description": "Website Redesign Milestone",
                "category": "Web Services",
                "type": "income",
                "amount": 4200.0,
                "status": "completed",
            },
        ],
        "skip_duplicates": True,
    }
    import_res = client.post("/api/v1/transactions/batch", headers=headers, json=csv_payload)
    assert import_res.status_code == 200
    import_summary = import_res.json()
    assert import_summary["imported_count"] == 1
    assert import_summary["skipped_count"] == 1
    assert import_summary["total_count"] == 2

    # ---------------------------------------------------------
    # 7. Invoices, Line Items, Tax, Payment (No Double-Counting)
    # ---------------------------------------------------------
    inv_create_res = client.post(
        "/api/v1/invoices",
        headers=headers,
        json={
            "client_name": "Apex Innovations",
            "client_email": "billing@apex.co",
            "issue_date": (today - timedelta(days=10)).isoformat(),
            "due_date": (today + timedelta(days=20)).isoformat(),
            "tax_rate": 0.10,
            "status": "pending",
            "notes": "Net 30 terms",
            "items": [
                {"description": "Design Consultation", "quantity": 10, "unit_price": 150.0},
                {"description": "Asset Library Kit", "quantity": 1, "unit_price": 500.0},
            ],
        },
    )
    assert inv_create_res.status_code == 201
    inv_data = inv_create_res.json()
    assert inv_data["subtotal"] == 2000.0  # 1500 + 500
    assert inv_data["tax_amount"] == 200.0  # 10%
    assert inv_data["total"] == 2200.0
    inv_id = inv_data["id"]

    # Verify transaction count before marking invoice paid
    tx_before = client.get("/api/v1/transactions", headers=headers).json()
    count_before = len(tx_before)

    # Mark invoice as paid
    pay_res = client.put(
        f"/api/v1/invoices/{inv_id}",
        headers=headers,
        json={"status": "paid", "paid_date": today.isoformat()},
    )
    assert pay_res.status_code == 200
    assert pay_res.json()["status"] == "paid"
    assert pay_res.json()["paid_date"] == today.isoformat()

    # CRITICAL CHECK: Invoices remain in invoice domain, avoiding phantom double-counting in transactions
    tx_after = client.get("/api/v1/transactions", headers=headers).json()
    assert len(tx_after) == count_before

    # ---------------------------------------------------------
    # 8. Financial Dashboard, Health Score, AI Intelligence
    # ---------------------------------------------------------
    # Dashboard metrics
    metrics_res = client.get("/api/v1/analytics/metrics", headers=headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert len(metrics) >= 1
    latest = metrics[-1]
    # Total income from transactions: 7500 + 4200 = 11700
    assert latest["revenue"] == 11700.0
    # Total expenses: 850
    assert latest["expenses"] == 850.0
    assert latest["profit"] == 10850.0

    # Business Health Score
    health_res = client.get("/api/v1/analytics/health", headers=headers)
    assert health_res.status_code == 200
    health = health_res.json()
    assert 0 <= health["overall"] <= 100
    assert "label" in health
    assert "explanation" in health

    # Cash Flow Status & Forecast
    cf_res = client.get("/api/v1/analytics/cashflow", headers=headers)
    assert cf_res.status_code == 200
    cf_data = cf_res.json()
    assert cf_data["status"] in ["healthy", "watch", "at_risk"]

    forecast_res = client.get("/api/v1/analytics/forecast", headers=headers)
    assert forecast_res.status_code == 200
    forecast_data = forecast_res.json()
    assert isinstance(forecast_data, list)
    assert len(forecast_data) >= 1

    # Offline-Safe Rules-Based Copilot Chat (zero external API key needed)
    chat_res = client.post(
        "/api/v1/ai/chat",
        headers=headers,
        json={"message": "What is my current net profit and expense ratio?"},
    )
    assert chat_res.status_code == 200
    chat_answer = chat_res.json()
    assert "answer" in chat_answer
    assert len(chat_answer["answer"]) > 10
    assert chat_answer["source"] == "rule_based_engine"

    # What-If Scenario simulation
    whatif_res = client.post(
        "/api/v1/ai/what-if",
        headers=headers,
        json={
            "description": "Increase monthly sales by 20%",
            "params": {"revenue_pct": 20.0},
        },
    )
    assert whatif_res.status_code == 200
    sim = whatif_res.json()
    assert sim["projected_revenue"] > latest["revenue"]

    # ---------------------------------------------------------
    # 9. Reports & Date Filtering Reconciliation
    # ---------------------------------------------------------
    pnl_res = client.get(
        f"/api/v1/analytics/reports/pnl?start_date={(today - timedelta(days=30)).isoformat()}&end_date={today.isoformat()}",
        headers=headers,
    )
    assert pnl_res.status_code == 200
    pnl = pnl_res.json()
    assert pnl["revenue"] == 11700.0
    assert pnl["expenses"] == 850.0
    assert pnl["net_profit"] == 10850.0

    exp_res = client.get("/api/v1/analytics/reports/expenses", headers=headers)
    assert exp_res.status_code == 200
    exp_report = exp_res.json()
    assert exp_report["total"] == 850.0

    summary_res = client.get("/api/v1/analytics/reports/summary", headers=headers)
    assert summary_res.status_code == 200
    assert "ai_summary" in summary_res.json()

    # ---------------------------------------------------------
    # 10. Notifications Center & Fingerprint Deduplication
    # ---------------------------------------------------------
    notifs_res1 = client.get("/api/v1/notifications", headers=headers)
    assert notifs_res1.status_code == 200
    notifs1 = notifs_res1.json()
    initial_count = len(notifs1)

    # Calling again should not duplicate alerts (deduplication check)
    notifs_res2 = client.get("/api/v1/notifications", headers=headers)
    assert notifs_res2.status_code == 200
    assert len(notifs_res2.json()) == initial_count

    if initial_count > 0:
        first_notif_id = notifs1[0]["id"]
        # Mark single notification as read
        read_res = client.put(f"/api/v1/notifications/{first_notif_id}/read", headers=headers)
        assert read_res.status_code == 200
        assert read_res.json()["read"] is True

        # Mark all as read
        all_read_res = client.put("/api/v1/notifications/read-all", headers=headers)
        assert all_read_res.status_code == 200
        assert all_read_res.json()["ok"] is True

    # ---------------------------------------------------------
    # 11. Workspace Settings Persistence
    # ---------------------------------------------------------
    settings_res = client.get("/api/v1/settings", headers=headers)
    assert settings_res.status_code == 200
    current_settings = settings_res.json()

    # Update settings
    current_settings["business"]["currency"] = "EUR"
    current_settings["business"]["tax_rate"] = 0.15
    current_settings["ai_preferences"]["forecast_horizon_months"] = 6
    save_settings_res = client.put("/api/v1/settings", headers=headers, json=current_settings)
    assert save_settings_res.status_code == 200
    assert save_settings_res.json()["business"]["currency"] == "EUR"
    assert save_settings_res.json()["business"]["tax_rate"] == 0.15
    assert save_settings_res.json()["ai_preferences"]["forecast_horizon_months"] == 6

    # Verify settings persisted on subsequent request
    check_settings_res = client.get("/api/v1/settings", headers=headers)
    assert check_settings_res.status_code == 200
    assert check_settings_res.json()["business"]["currency"] == "EUR"

    # ---------------------------------------------------------
    # 12. Strict Multi-Tenant Isolation
    # ---------------------------------------------------------
    # Register second user in an isolated workspace
    reg2_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "intruder@competitor.com",
            "password": "Password123!",
            "full_name": "Bob Intruder",
            "business_name": "Competitor Labs",
        },
    )
    assert reg2_res.status_code == 201
    tenant2_headers = {"Authorization": f"Bearer {reg2_res.json()['access_token']}"}

    # Attempt cross-workspace access to Workspace 1's transaction
    cross_tx = client.get(f"/api/v1/transactions/{t1_id}", headers=tenant2_headers)
    assert cross_tx.status_code == 404

    # Attempt cross-workspace delete of Workspace 1's transaction
    cross_del = client.delete(f"/api/v1/transactions/{t1_id}", headers=tenant2_headers)
    assert cross_del.status_code == 404

    # Attempt cross-workspace access to Workspace 1's invoice
    cross_inv = client.get(f"/api/v1/invoices/{inv_id}", headers=tenant2_headers)
    assert cross_inv.status_code == 404

    # Verify Tenant 2 cannot see Tenant 1's transactions in list
    t2_tx_list = client.get("/api/v1/transactions", headers=tenant2_headers).json()
    assert len(t2_tx_list) == 0

    # Verify Tenant 2 sees their own empty dashboard metrics, not Tenant 1's revenue
    t2_metrics = client.get("/api/v1/analytics/metrics", headers=tenant2_headers).json()
    assert len(t2_metrics) == 0 or t2_metrics[-1]["revenue"] == 0.0
