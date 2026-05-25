import asyncio
import os

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import analytics, backup, photos, sessions, users
from app.utils.auth import verify_api_key
from app.utils.helpers import setup_logging
from app.utils.limiter import limiter

setup_logging()

_allowed_origins = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]

app = FastAPI(
    title="PhotoSwipe API",
    version="0.1.0",
    dependencies=[Depends(verify_api_key)],
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"success": False, "data": None, "error": f"Rate limit exceeded: {exc.detail}"},
    )


class TimeoutMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await asyncio.wait_for(call_next(request), timeout=30)
        except asyncio.TimeoutError:
            return JSONResponse(
                status_code=504,
                content={"success": False, "data": None, "error": "Request timed out"},
            )


app.add_middleware(TimeoutMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(sessions.router, prefix="/api/v1/sessions", tags=["sessions"])
app.include_router(photos.router, prefix="/api/v1/photos", tags=["photos"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(backup.router, prefix="/api/v1/backup", tags=["backup"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
