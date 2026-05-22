import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    from app.utils.auth import verify_api_key
    app.dependency_overrides[verify_api_key] = lambda: None
    yield TestClient(app)
    app.dependency_overrides.clear()


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
    for module in [
        "app.services.analytics_service",
        "app.services.photo_service",
    ]:
        monkeypatch.setattr(f"{module}.get_redis", lambda: None)
    return sb
