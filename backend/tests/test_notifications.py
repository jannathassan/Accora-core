import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def register_and_get_token(email: str, name: str, ws_name: str = "Notification Business"):
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


def test_list_notifications_creates_alerts():
    token, ws_id = register_and_get_token("notif_create@accora.ai", "Notification Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Create an overdue invoice
    inv_payload = {
        "client_name": "Overdue Client LLC",
        "client_email": "finance@overdue.com",
        "tax_rate": 0.0,
        "status": "pending",
        "issue_date": "2026-08-01",
        "due_date": "2026-09-01",  # Past due
        "items": [
            {"description": "Quarterly Retainer", "quantity": 1, "unit_price": 4200.0}
        ],
    }
    inv_res = client.post("/api/v1/invoices", json=inv_payload, headers=headers)
    assert inv_res.status_code == 201

    # Fetch notifications - should automatically detect the overdue invoice
    res = client.get("/api/v1/notifications", headers=headers)
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 1

    overdue_notif = next((n for n in notifs if n["type"] == "overdue_invoice"), None)
    assert overdue_notif is not None
    assert "Overdue" in overdue_notif["title"]
    assert overdue_notif["severity"] == "high"
    assert overdue_notif["read"] is False
    assert overdue_notif["action_url"] == "/app/invoices"


def test_notification_deduplication():
    token, ws_id = register_and_get_token("notif_dedup@accora.ai", "Dedup Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Create an overdue invoice
    inv_payload = {
        "client_name": "Late Payer Co",
        "status": "pending",
        "issue_date": "2026-07-01",
        "due_date": "2026-08-01",
        "items": [{"description": "Audit", "quantity": 1, "unit_price": 2000.0}],
    }
    client.post("/api/v1/invoices", json=inv_payload, headers=headers)

    # Call GET /notifications multiple times
    res1 = client.get("/api/v1/notifications", headers=headers)
    count1 = len(res1.json())
    assert count1 >= 1

    res2 = client.get("/api/v1/notifications", headers=headers)
    count2 = len(res2.json())

    res3 = client.get("/api/v1/notifications", headers=headers)
    count3 = len(res3.json())

    # Exact count must NOT increase on repeated syncs
    assert count1 == count2 == count3


def test_mark_notification_read():
    token, ws_id = register_and_get_token("notif_read@accora.ai", "Read Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Create an overdue invoice
    client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Test Client",
            "status": "pending",
            "issue_date": "2026-06-01",
            "due_date": "2026-07-01",
            "items": [{"description": "Consulting", "quantity": 1, "unit_price": 1000.0}],
        },
        headers=headers,
    )

    notifs = client.get("/api/v1/notifications", headers=headers).json()
    assert len(notifs) >= 1
    target_id = notifs[0]["id"]
    assert notifs[0]["read"] is False

    # Mark as read
    read_res = client.put(f"/api/v1/notifications/{target_id}/read", headers=headers)
    assert read_res.status_code == 200
    assert read_res.json()["read"] is True

    # Subsequent sync must preserve read status
    updated_notifs = client.get("/api/v1/notifications", headers=headers).json()
    updated_target = next(n for n in updated_notifs if n["id"] == target_id)
    assert updated_target["read"] is True


def test_mark_all_notifications_read():
    token, ws_id = register_and_get_token("notif_all_read@accora.ai", "All Read Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Create two overdue invoices
    for i in range(2):
        client.post(
            "/api/v1/invoices",
            json={
                "client_name": f"Client {i}",
                "status": "pending",
                "issue_date": "2026-05-01",
                "due_date": f"2026-06-0{i+1}",
                "items": [{"description": f"Item {i}", "quantity": 1, "unit_price": 800.0}],
            },
            headers=headers,
        )

    # Sync notifications
    notifs = client.get("/api/v1/notifications", headers=headers).json()
    assert len(notifs) >= 2

    # Mark all read
    res = client.put("/api/v1/notifications/read-all", headers=headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert res.json()["updated_count"] >= 2

    # Verify all are read
    after_notifs = client.get("/api/v1/notifications", headers=headers).json()
    assert all(n["read"] is True for n in after_notifs)


def test_notification_workspace_isolation():
    token_a, ws_a = register_and_get_token("notif_ws_a@accora.ai", "User A", "Workspace A")
    token_b, ws_b = register_and_get_token("notif_ws_b@accora.ai", "User B", "Workspace B")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create overdue invoice in Workspace A
    client.post(
        "/api/v1/invoices",
        json={
            "client_name": "Private Client A",
            "status": "pending",
            "issue_date": "2026-05-01",
            "due_date": "2026-06-01",
            "items": [{"description": "Secret Project", "quantity": 1, "unit_price": 5000.0}],
        },
        headers=headers_a,
    )

    notifs_a = client.get("/api/v1/notifications", headers=headers_a).json()
    assert len(notifs_a) >= 1
    notif_a_id = notifs_a[0]["id"]

    # Workspace B should NOT see Workspace A's notification
    notifs_b = client.get("/api/v1/notifications", headers=headers_b).json()
    assert all(n["id"] != notif_a_id for n in notifs_b)

    # Workspace B attempting to mark Workspace A's notification as read should receive 404
    bad_res = client.put(f"/api/v1/notifications/{notif_a_id}/read", headers=headers_b)
    assert bad_res.status_code == 404
