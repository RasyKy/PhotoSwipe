SESSION = {
    "id": "sess-1",
    "user_id": "user-1",
    "status": "active",
    "total_reviewed": 0,
    "total_kept": 0,
    "total_deleted": 0,
    "storage_saved_bytes": 0,
    "started_at": "2026-01-01T00:00:00+00:00",
    "ended_at": None,
}
COMPLETED_SESSION = {
    **SESSION,
    "status": "completed",
    "total_reviewed": 2,
    "total_kept": 1,
    "total_deleted": 1,
    "storage_saved_bytes": 2_000_000,
    "ended_at": "2026-01-02T00:00:00+00:00",
}


def test_create_session(client, mock_sb):
    # No active session exists (2-eq chain: user_id + status)
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [SESSION]

    resp = client.post("/api/v1/sessions", json={"user_id": "user-1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["status"] == "active"
    assert body["data"]["user_id"] == "user-1"


def test_create_session_duplicate_active(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "existing-sess"}
    ]

    resp = client.post("/api/v1/sessions", json={"user_id": "user-1"})

    assert resp.status_code == 400
    body = resp.json()
    assert body["success"] is False
    assert "active session" in body["error"]


def test_get_sessions(client, mock_sb):
    # 1-eq + order chain
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        SESSION
    ]

    resp = client.get("/api/v1/sessions?user_id=user-1")

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert len(body["data"]) == 1
    assert body["data"][0]["id"] == "sess-1"


def test_get_sessions_empty(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    resp = client.get("/api/v1/sessions?user_id=user-1")

    assert resp.status_code == 200
    assert resp.json()["data"] == []


def test_update_session_completed(client, mock_sb):
    swipes = [
        {"action": "delete", "file_size_bytes": 2_000_000},
        {"action": "keep", "file_size_bytes": 0},
    ]
    # 1-eq: session existence check
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": "sess-1"}]
    # 2-eq: swipe_actions query
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = swipes
    mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [COMPLETED_SESSION]

    resp = client.patch("/api/v1/sessions/sess-1", json={"status": "completed"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["status"] == "completed"
    assert body["data"]["total_reviewed"] == 2
    assert body["data"]["total_kept"] == 1
    assert body["data"]["total_deleted"] == 1
    assert body["data"]["storage_saved_bytes"] == 2_000_000
    assert body["data"]["ended_at"] is not None


def test_update_session_not_found(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    resp = client.patch("/api/v1/sessions/bad-id", json={"status": "completed"})

    assert resp.status_code == 404
    assert resp.json()["error"] == "Session not found"
