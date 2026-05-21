from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import sessions, photos, analytics, backup

app = FastAPI(title="PhotoSwipe API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(photos.router, prefix="/photos", tags=["photos"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(backup.router, prefix="/backup", tags=["backup"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
