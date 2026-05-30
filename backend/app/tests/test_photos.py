from unittest.mock import MagicMock

SESSION = {
    "user_id": "user-1",
    "total_reviewed": 0,
    "total_kept": 0,
    "total_deleted": 0,
    "storage_saved_bytes": 0,
}
SWIPE_KEEP = {"id": "sw-1", "action": "keep", "swiped_at": "2026-01-01T00:00:00+00:00"}
SWIPE_DELETE = {"id": "sw-2", "action": "delete", "swiped_at": "2026-01-01T00:00:00+00:00"}

SWIPE_PAYLOAD = {
    "session_id": "sess-1",
    "photo_uri": "file://photo.jpg",
    "photo_name": "photo.jpg",
    "file_size_bytes": 1_000_000,
}


def _setup_swipe(mock_sb, swipe_result):
    # 1-eq: _get_session
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [SESSION]
    # insert: swipe_actions (return value used)
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [swipe_result]
    # 2-eq: daily_stats select (no existing row)
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []


def test_swipe_batch(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [SESSION]
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/swipe/batch", json={
        "session_id": "sess-1",
        "swipes": [
            {"photo_uri": "file://a.jpg", "photo_name": "a.jpg", "file_size_bytes": 500_000, "action": "keep"},
            {"photo_uri": "file://b.jpg", "photo_name": "b.jpg", "file_size_bytes": 1_000_000, "action": "delete"},
        ],
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["processed"] == 2


def test_swipe_batch_session_not_found(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/swipe/batch", json={
        "session_id": "bad-session",
        "swipes": [
            {"photo_uri": "file://a.jpg", "photo_name": "a.jpg", "file_size_bytes": 500_000, "action": "keep"},
        ],
    })

    assert resp.status_code == 404
    assert resp.json()["error"] == "Session not found"


def test_swipe_keep(client, mock_sb):
    _setup_swipe(mock_sb, SWIPE_KEEP)

    resp = client.post("/api/v1/photos/swipe", json={**SWIPE_PAYLOAD, "action": "keep"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["id"] == "sw-1"
    assert body["data"]["action"] == "keep"
    mock_sb.table.return_value.insert.assert_called()


def test_swipe_delete(client, mock_sb):
    _setup_swipe(mock_sb, SWIPE_DELETE)

    resp = client.post("/api/v1/photos/swipe", json={**SWIPE_PAYLOAD, "action": "delete"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["action"] == "delete"


def test_swipe_session_not_found(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/swipe", json={**SWIPE_PAYLOAD, "action": "keep"})

    assert resp.status_code == 404
    assert resp.json()["error"] == "Session not found"


def test_undo_last_keep(client, mock_sb):
    # 2-eq + order + limit: most recent non-undone swipe
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
        {**SWIPE_KEEP, "photo_uri": "file://photo.jpg", "file_size_bytes": 1_000_000, "undone": False}
    ]
    # 1-eq: _get_session
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [SESSION]
    # 2-eq direct: daily_stats select
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/undo", json={"session_id": "sess-1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["undone_swipe_id"] == "sw-1"
    assert body["data"]["action"] == "keep"


def test_undo_last_delete(client, mock_sb):
    swipe = {**SWIPE_DELETE, "photo_uri": "file://photo.jpg", "file_size_bytes": 1_000_000, "undone": False}
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
        swipe
    ]
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [SESSION]
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/undo", json={"session_id": "sess-1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["action"] == "delete"
    mock_sb.table.return_value.update.assert_called()


def test_undo_no_swipes(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/undo", json={"session_id": "sess-1"})

    assert resp.status_code == 400
    assert resp.json()["error"] == "No swipe to undo"


def test_confirm_delete(client, mock_sb):
    # _get_session (1-eq select)
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [SESSION]
    # daily_stats select (2-eq, no existing row)
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/confirm-delete", json={
        "session_id": "sess-1",
        "deleted_count": 2,
        "storage_freed_bytes": 1_500_000,
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["deleted_count"] == 2
    assert body["data"]["storage_freed_bytes"] == 1_500_000


def test_confirm_delete_session_not_found(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/confirm-delete", json={
        "session_id": "bad-session",
        "deleted_count": 1,
        "storage_freed_bytes": 500_000,
    })

    assert resp.status_code == 404
    assert resp.json()["error"] == "Session not found"
