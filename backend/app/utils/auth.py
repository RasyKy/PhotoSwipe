import logging
import os
import secrets

from fastapi import Header, HTTPException, Request

logger = logging.getLogger(__name__)

_EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


async def verify_api_key(
    request: Request,
    x_api_key: str | None = Header(default=None),
) -> None:
    if request.url.path in _EXCLUDED_PATHS:
        return
    expected = os.environ.get("API_KEY", "")
    if not x_api_key or not expected or not secrets.compare_digest(x_api_key, expected):
        logger.warning("Unauthorized request path=%s", request.url.path)
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
