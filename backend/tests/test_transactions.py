import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def register_and_get_token(email: str, name: str, ws_name: str = "Test Business"):
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


def test_create_transaction_success():
    token, ws_id = register_and_get_token("tx_user1@accora.ai", "User One")
    headers = {"Authorization": f"Bearer {token}"}

    tx_data = {
        "date": "2026-10-15",
        "description": "Enterprise Consulting Fee",
        "category": "Consulting",
        "type": "income",
        "amount": 4500.50,
        "status": "completed",
        "notes": "Q4 strategy kickoff",
    }
    res = client.post("/api/v1/transactions", json=tx_data, headers=headers)
    assert res.status_code == 201
    result = res.json()
    assert result["description"] == "Enterprise Consulting Fee"
    assert result["amount"] == 4500.50
    assert result["workspace_id"] == ws_id
    assert result["type"] == "income"
    assert "id" in result


def test_list_transactions_filters():
    token, ws_id = register_and_get_token("filter_user@accora.ai", "Filter Tester")
    headers = {"Authorization": f"Bearer {token}"}

    txns = [
        {"date": "2026-09-10", "description": "Software Subscription", "category": "Software & Tools", "type": "expense", "amount": 120.0},
        {"date": "2026-10-01", "description": "Client Web Design", "category": "Sales Revenue", "type": "income", "amount": 3500.0},
        {"date": "2026-10-12", "description": "Office Supplies", "category": "Operating", "type": "expense", "amount": 85.50},
        {"date": "2026-10-20", "description": "Social Media Marketing", "category": "Advertising & Marketing", "type": "expense", "amount": 450.0},
    ]
    for tx in txns:
        client.post("/api/v1/transactions", json=tx, headers=headers)

    # All
    res = client.get("/api/v1/transactions", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 4

    # Filter by type: expense
    res_exp = client.get("/api/v1/transactions?type=expense", headers=headers)
    assert res_exp.status_code == 200
    assert len(res_exp.json()) == 3

    # Filter by type: income
    res_inc = client.get("/api/v1/transactions?type=income", headers=headers)
    assert res_inc.status_code == 200
    assert len(res_inc.json()) == 1

    # Filter by month: 2026-09
    res_sep = client.get("/api/v1/transactions?month=2026-09", headers=headers)
    assert res_sep.status_code == 200
    assert len(res_sep.json()) == 1
    assert res_sep.json()[0]["description"] == "Software Subscription"

    # Search: 'web'
    res_search = client.get("/api/v1/transactions?search=web", headers=headers)
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["category"] == "Sales Revenue"


def test_batch_import_transactions_with_duplicates():
    token, ws_id = register_and_get_token("batch_user@accora.ai", "Batch Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # First add a baseline transaction
    client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-05", "description": "Stripe Payout", "category": "Sales Revenue", "type": "income", "amount": 1000.0},
        headers=headers,
    )

    batch_payload = {
        "skip_duplicates": True,
        "transactions": [
            {"date": "2026-10-05", "description": "Stripe Payout", "category": "Sales Revenue", "type": "income", "amount": 1000.0}, # duplicate
            {"date": "2026-10-06", "description": "AWS Hosting", "category": "Software & Tools", "type": "expense", "amount": 75.0}, # new
            {"date": "2026-10-07", "description": "Client Retainer", "category": "Services", "type": "income", "amount": 2500.0}, # new
            {"date": "2026-10-07", "description": "Client Retainer", "category": "Services", "type": "income", "amount": 2500.0}, # intra-batch duplicate
        ],
    }

    res = client.post("/api/v1/transactions/batch", json=batch_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] == 4
    assert data["imported_count"] == 2
    assert data["skipped_count"] == 2
    assert len(data["duplicates"]) == 2


def test_update_and_delete_transaction():
    token, ws_id = register_and_get_token("crud_user@accora.ai", "CRUD Tester")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-10", "description": "Team Lunch", "category": "Operating", "type": "expense", "amount": 65.0},
        headers=headers,
    )
    tx_id = create_res.json()["id"]

    # Update
    update_res = client.put(
        f"/api/v1/transactions/{tx_id}",
        json={"amount": 82.50, "description": "Team Dinner"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["amount"] == 82.50
    assert update_res.json()["description"] == "Team Dinner"

    # Delete
    del_res = client.delete(f"/api/v1/transactions/{tx_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["ok"] is True

    # Confirm 404
    get_res = client.get(f"/api/v1/transactions/{tx_id}", headers=headers)
    assert get_res.status_code == 404


def test_transaction_workspace_isolation():
    token1, ws1_id = register_and_get_token("tenant1_tx@accora.ai", "Tenant One", "Tenant 1 Co")
    token2, ws2_id = register_and_get_token("tenant2_tx@accora.ai", "Tenant Two", "Tenant 2 Co")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Tenant 1 creates a transaction
    res1 = client.post(
        "/api/v1/transactions",
        json={"date": "2026-10-10", "description": "Secret Tenant 1 Income", "category": "Sales Revenue", "type": "income", "amount": 9999.0},
        headers=headers1,
    )
    tx1_id = res1.json()["id"]

    # Tenant 2 lists transactions -> must be empty
    list_res = client.get("/api/v1/transactions", headers=headers2)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0

    # Tenant 2 attempts to get Tenant 1's transaction -> 404
    get_res = client.get(f"/api/v1/transactions/{tx1_id}", headers=headers2)
    assert get_res.status_code == 404

    # Tenant 2 attempts to update Tenant 1's transaction -> 404
    put_res = client.put(f"/api/v1/transactions/{tx1_id}", json={"amount": 1.0}, headers=headers2)
    assert put_res.status_code == 404

    # Tenant 2 attempts to delete Tenant 1's transaction -> 404
    del_res = client.delete(f"/api/v1/transactions/{tx1_id}", headers=headers2)
    assert del_res.status_code == 404

    # Tenant 2 attempts to pass Tenant 1's workspace ID in X-Workspace-Id -> 403 Forbidden
    spoof_headers = {"Authorization": f"Bearer {token2}", "X-Workspace-Id": ws1_id}
    spoof_res = client.get("/api/v1/transactions", headers=spoof_headers)
    assert spoof_res.status_code == 403
