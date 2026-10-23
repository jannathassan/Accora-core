import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def register_and_get_token(email: str, name: str, ws_name: str = "Invoice Business"):
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


def test_create_invoice_with_calculations():
    token, ws_id = register_and_get_token("inv_calc@accora.ai", "Invoice Calc Tester")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "client_name": "Acme Global Industries",
        "client_email": "billing@acme.com",
        "tax_rate": 0.10,  # 10% tax
        "status": "pending",
        "issue_date": "2026-10-01",
        "due_date": "2026-11-01",
        "items": [
            {"description": "Design Consultation", "quantity": 10, "unit_price": 150.0},  # 1500.00
            {"description": "Design System Documentation", "quantity": 1, "unit_price": 500.0},  # 500.00
        ],
        "notes": "Payment due in 30 days.",
    }

    res = client.post("/api/v1/invoices", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["subtotal"] == 2000.00
    assert data["tax_amount"] == 200.00
    assert data["total"] == 2200.00
    assert data["client_name"] == "Acme Global Industries"
    assert data["invoice_number"].startswith("INV-")
    assert len(data["items"]) == 2


def test_invoice_summary():
    token, ws_id = register_and_get_token("summary_inv@accora.ai", "Summary Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # 1 Paid ($1000)
    client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Paid Client",
            "tax_rate": 0.0,
            "status": "paid",
            "issue_date": "2026-09-01",
            "due_date": "2026-10-01",
            "items": [{"description": "Services", "quantity": 1, "unit_price": 1000.0}],
        },
        headers=headers,
    )

    # 1 Pending ($2000)
    client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Pending Client",
            "tax_rate": 0.0,
            "status": "pending",
            "issue_date": "2026-10-01",
            "due_date": "2026-12-01",
            "items": [{"description": "Project Milestone 1", "quantity": 2, "unit_price": 1000.0}],
        },
        headers=headers,
    )

    # 1 Overdue ($500)
    client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Overdue Client",
            "tax_rate": 0.0,
            "status": "overdue",
            "issue_date": "2026-08-01",
            "due_date": "2026-09-01",
            "items": [{"description": "Hosting Fee", "quantity": 1, "unit_price": 500.0}],
        },
        headers=headers,
    )

    # Summary
    res = client.get("/api/v1/invoices/summary", headers=headers)
    assert res.status_code == 200
    s = res.json()
    assert s["total_invoiced"] == 3500.00
    assert s["total_paid"] == 1000.00
    assert s["total_pending"] == 2000.00
    assert s["total_overdue"] == 500.00
    assert s["count_invoiced"] == 3
    assert s["count_paid"] == 1
    assert s["count_pending"] == 1
    assert s["count_overdue"] == 1


def test_update_invoice_recalculates():
    token, ws_id = register_and_get_token("update_inv@accora.ai", "Update Tester")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Initial Client",
            "tax_rate": 0.05,
            "status": "draft",
            "issue_date": "2026-10-01",
            "due_date": "2026-10-31",
            "items": [{"description": "Item 1", "quantity": 1, "unit_price": 100.0}],
        },
        headers=headers,
    )
    inv_id = create_res.json()["id"]
    assert create_res.json()["subtotal"] == 100.0
    assert create_res.json()["total"] == 105.0

    # Update line items and tax rate
    update_res = client.put(
        f"/api/v1/invoices/{inv_id}",
        json={
            "tax_rate": 0.10,
            "items": [
                {"description": "Item 1 Updated", "quantity": 2, "unit_price": 100.0},
                {"description": "Item 2 Added", "quantity": 1, "unit_price": 300.0},
            ],
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["subtotal"] == 500.00  # 2*100 + 1*300
    assert data["tax_amount"] == 50.00  # 500 * 0.10
    assert data["total"] == 550.00


def test_mark_as_paid_lifecycle():
    token, ws_id = register_and_get_token("paid_lifecycle@accora.ai", "Paid Lifecycle Tester")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Lifecycle Client",
            "status": "pending",
            "issue_date": "2026-10-01",
            "due_date": "2026-11-01",
            "items": [{"description": "Service Fee", "quantity": 1, "unit_price": 750.0}],
        },
        headers=headers,
    )
    inv_id = create_res.json()["id"]
    assert create_res.json()["paid_date"] is None

    # Mark as paid
    pay_res = client.put(f"/api/v1/invoices/{inv_id}", json={"status": "paid"}, headers=headers)
    assert pay_res.status_code == 200
    assert pay_res.json()["status"] == "paid"
    assert pay_res.json()["paid_date"] == str(date.today())


def test_invoice_workspace_isolation():
    token1, ws1_id = register_and_get_token("tenant1_inv@accora.ai", "Tenant One", "Tenant 1 Co")
    token2, ws2_id = register_and_get_token("tenant2_inv@accora.ai", "Tenant Two", "Tenant 2 Co")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Tenant 1 creates invoice
    res1 = client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Confidential Client 1",
            "status": "pending",
            "issue_date": "2026-10-01",
            "due_date": "2026-11-01",
            "items": [{"description": "Confidential Deal", "quantity": 1, "unit_price": 50000.0}],
        },
        headers=headers1,
    )
    inv1_id = res1.json()["id"]

    # Tenant 2 cannot see it in list
    list_res = client.get("/api/v1/invoices", headers=headers2)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0

    # Tenant 2 summary should be 0
    sum_res = client.get("/api/v1/invoices/summary", headers=headers2)
    assert sum_res.status_code == 200
    assert sum_res.json()["total_invoiced"] == 0.0

    # Tenant 2 cannot get Tenant 1's invoice
    assert client.get(f"/api/v1/invoices/{inv1_id}", headers=headers2).status_code == 404

    # Tenant 2 cannot update Tenant 1's invoice
    assert client.put(f"/api/v1/invoices/{inv1_id}", json={"status": "paid"}, headers=headers2).status_code == 404

    # Tenant 2 cannot delete Tenant 1's invoice
    assert client.delete(f"/api/v1/invoices/{inv1_id}", headers=headers2).status_code == 404

    # Tenant 2 cannot spoof Tenant 1's workspace
    spoof_headers = {"Authorization": f"Bearer {token2}", "X-Workspace-Id": ws1_id}
    assert client.get("/api/v1/invoices", headers=spoof_headers).status_code == 403
