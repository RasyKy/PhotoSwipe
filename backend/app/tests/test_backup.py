BACKUP = {
    "id": "bk-1",
    "photo_name": "photo.jpg",
    "storage_path": "user-1/photo.jpg",
    "file_size_bytes": 2_000_000,
    "backed_up_at": "2026-01-01T00:00:00+00:00",
}


def test_upload_backup(client, mock_sb):
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [BACKUP]

    resp = client.post(
        "/api/v1/backup/upload",
        data={"user_id": "user-1", "photo_name": "photo.jpg"},
        files={"file": ("photo.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["id"] == "bk-1"
    assert body["data"]["storage_path"] == "user-1/photo.jpg"
    mock_sb.storage.from_.return_value.upload.assert_called_once()


def test_list_backups(client, mock_sb):
    # 1-eq + order chain
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        BACKUP
    ]

    resp = client.get("/api/v1/backup/list?user_id=user-1")

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert len(body["data"]) == 1
    assert body["data"][0]["id"] == "bk-1"


def test_list_backups_empty(client, mock_sb):
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    resp = client.get("/api/v1/backup/list?user_id=user-1")

    assert resp.status_code == 200
    assert resp.json()["data"] == []
