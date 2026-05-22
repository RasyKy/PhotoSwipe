SESSIONS = [
    {"total_reviewed": 10, "total_kept": 6, "total_deleted": 4, "storage_saved_bytes": 8_000_000},
    {"total_reviewed": 5, "total_kept": 2, "total_deleted": 3, "storage_saved_bytes": 3_000_000},
]
DAILY_ROWS = [
    {"date": "2026-05-20", "reviewed": 5, "kept": 3, "deleted": 2, "storage_saved_bytes": 4_000_000},
    {"date": "2026-05-21", "reviewed": 8, "kept": 4, "deleted": 4, "storage_saved_bytes": 6_000_000},
]


def test_get_summary(client, mock_sb):
    # 1-eq direct execute: sessions query
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = SESSIONS

    resp = client.get("/api/v1/analytics/summary?user_id=user-1")

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["total_reviewed"] == 15
    assert body["data"]["total_kept"] == 8
    assert body["data"]["total_deleted"] == 7
    assert body["data"]["total_storage_saved_bytes"] == 11_000_000
    assert body["data"]["total_sessions"] == 2


def test_get_summary_no_sessions(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    resp = client.get("/api/v1/analytics/summary?user_id=user-1")

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["total_sessions"] == 0
    assert body["data"]["total_reviewed"] == 0


def test_get_history_all(client, mock_sb):
    # period=all: 1-eq + order, no gte filter
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = (
        DAILY_ROWS
    )

    resp = client.get("/api/v1/analytics/history?user_id=user-1&period=all")

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert len(body["data"]) == 2
    assert body["data"][0]["date"] == "2026-05-20"


def test_get_history_week(client, mock_sb):
    # period=week: 1-eq + gte + order
    mock_sb.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value.data = (
        DAILY_ROWS
    )

    resp = client.get("/api/v1/analytics/history?user_id=user-1&period=week")

    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 2


def test_get_history_month(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value.data = (
        DAILY_ROWS
    )

    resp = client.get("/api/v1/analytics/history?user_id=user-1&period=month")

    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_get_history_invalid_period(client, mock_sb):
    resp = client.get("/api/v1/analytics/history?user_id=user-1&period=invalid")

    assert resp.status_code == 422
