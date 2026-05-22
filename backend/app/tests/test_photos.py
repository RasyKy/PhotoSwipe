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
QUEUE_ITEM = {
    "id": "qi-1",
    "session_id": "sess-1",
    "photo_uri": "file://photo.jpg",
    "photo_name": "photo.jpg",
    "file_size_bytes": 1_000_000,
    "added_at": "2026-01-01T00:00:00+00:00",
}

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


def test_swipe_keep(client, mock_sb):
    _setup_swipe(mock_sb, SWIPE_KEEP)

    resp = client.post("/api/v1/photos/swipe", json={**SWIPE_PAYLOAD, "action": "keep"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["id"] == "sw-1"
    assert body["data"]["action"] == "keep"
    mock_sb.table.return_value.insert.assert_called()


def test_swipe_delete_adds_to_queue(client, mock_sb):
    _setup_swipe(mock_sb, SWIPE_DELETE)

    resp = client.post("/api/v1/photos/swipe", json={**SWIPE_PAYLOAD, "action": "delete"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["action"] == "delete"
    # delete_queue insert is the second insert call
    assert mock_sb.table.return_value.insert.call_count >= 2


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
    # delete_queue.delete() should have been called
    mock_sb.table.return_value.delete.assert_called()


def test_undo_no_swipes(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/undo", json={"session_id": "sess-1"})

    assert resp.status_code == 400
    assert resp.json()["error"] == "No swipe to undo"


def test_get_delete_queue(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        QUEUE_ITEM
    ]

    resp = client.get("/api/v1/photos/delete-queue?session_id=sess-1")

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert len(body["data"]) == 1
    assert body["data"][0]["id"] == "qi-1"


def test_remove_delete_queue_item(client, mock_sb):
    # delete_queue and sessions both use 1-eq selects so they need per-table mocks
    queue_mock = MagicMock()
    queue_mock.select.return_value.eq.return_value.execute.return_value.data = [QUEUE_ITEM]

    session_mock = MagicMock()
    session_mock.select.return_value.eq.return_value.execute.return_value.data = [SESSION]

    stats_mock = MagicMock()
    stats_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    table_map = {"delete_queue": queue_mock, "sessions": session_mock, "daily_stats": stats_mock}
    mock_sb.table.side_effect = lambda name: table_map.get(name, MagicMock())

    resp = client.delete("/api/v1/photos/delete-queue/qi-1")

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["removed"] is True


def test_remove_delete_queue_item_not_found(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    resp = client.delete("/api/v1/photos/delete-queue/bad-id")

    assert resp.status_code == 404
    assert resp.json()["error"] == "Delete queue item not found"


def test_confirm_delete(client, mock_sb):
    items = [
        {"id": "qi-1", "file_size_bytes": 1_000_000},
        {"id": "qi-2", "file_size_bytes": 500_000},
    ]
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = items

    resp = client.post("/api/v1/photos/confirm-delete", json={"session_id": "sess-1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["deleted_count"] == 2
    assert body["data"]["storage_freed_bytes"] == 1_500_000


def test_confirm_delete_empty_queue(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    resp = client.post("/api/v1/photos/confirm-delete", json={"session_id": "sess-1"})

    assert resp.status_code == 400
    assert resp.json()["error"] == "No items in delete queue to confirm"
