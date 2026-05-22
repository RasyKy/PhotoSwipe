from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, backup, photos, sessions, users
from app.utils.helpers import setup_logging

setup_logging()

app = FastAPI(title="PhotoSwipe API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
