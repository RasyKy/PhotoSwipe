USER = {
    "id": "user-1",
    "device_id": "device-abc",
    "created_at": "2026-01-01T00:00:00+00:00",
}


def test_register_new_user(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [USER]

    resp = client.post("/api/v1/users/register", json={"device_id": "device-abc"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["id"] == "user-1"
    assert body["data"]["device_id"] == "device-abc"
    assert body["error"] is None


def test_register_returns_existing_user(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [USER]

    resp = client.post("/api/v1/users/register", json={"device_id": "device-abc"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["id"] == "user-1"
    mock_sb.table.return_value.insert.assert_not_called()
