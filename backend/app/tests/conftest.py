import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


@pytest.fixture
def mock_sb(monkeypatch):
    sb = MagicMock()
    for module in [
        "app.services.user_service",
        "app.services.session_service",
        "app.services.photo_service",
        "app.services.analytics_service",
        "app.services.backup_service",
    ]:
        monkeypatch.setattr(f"{module}.get_supabase", lambda sb=sb: sb)
    return sb
