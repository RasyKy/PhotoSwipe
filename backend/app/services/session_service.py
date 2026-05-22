import logging
from datetime import datetime, timezone

from fastapi import HTTPException

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def create_session(user_id: str) -> dict:
    logger.info("create_session called user_id=%s", user_id)
    try:
        supabase = get_supabase()
        active = (
            supabase.table("sessions")
            .select("id")
            .eq("user_id", user_id)
            .eq("status", "active")
            .execute()
        )
        if active.data:
            logger.warning("create_session rejected: active session exists user_id=%s", user_id)
            raise ValueError("User already has an active session")
        result = supabase.table("sessions").insert({"user_id": user_id, "status": "active"}).execute()
        logger.info("create_session completed session_id=%s user_id=%s", result.data[0]["id"], user_id)
        return result.data[0]
    except ValueError:
        raise
    except Exception as exc:
        logger.error("Database error in create_session: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")


def get_sessions(user_id: str) -> list[dict]:
    logger.info("get_sessions called user_id=%s", user_id)
    try:
        supabase = get_supabase()
        result = (
            supabase.table("sessions")
            .select("*")
            .eq("user_id", user_id)
            .order("started_at", desc=True)
            .execute()
        )
        logger.info("get_sessions returning %d sessions user_id=%s", len(result.data), user_id)
        return result.data
    except Exception as exc:
        logger.error("Database error in get_sessions: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")


def update_session(session_id: str, status: str) -> dict:
    logger.info("update_session called session_id=%s status=%s", session_id, status)
    try:
        supabase = get_supabase()
        existing = supabase.table("sessions").select("id").eq("id", session_id).execute()
        if not existing.data:
            logger.warning("update_session not found session_id=%s", session_id)
            raise LookupError("Session not found")

        swipes = (
            supabase.table("swipe_actions")
            .select("action, file_size_bytes")
            .eq("session_id", session_id)
            .eq("undone", False)
            .execute()
        )
        total_reviewed = len(swipes.data)
        total_kept = sum(1 for s in swipes.data if s["action"] == "keep")
        total_deleted = sum(1 for s in swipes.data if s["action"] == "delete")
        storage_saved = sum(s["file_size_bytes"] for s in swipes.data if s["action"] == "delete")

        result = (
            supabase.table("sessions")
            .update(
                {
                    "status": status,
                    "ended_at": datetime.now(timezone.utc).isoformat(),
                    "total_reviewed": total_reviewed,
                    "total_kept": total_kept,
                    "total_deleted": total_deleted,
                    "storage_saved_bytes": storage_saved,
                }
            )
            .eq("id", session_id)
            .execute()
        )
        logger.info(
            "update_session completed session_id=%s status=%s reviewed=%d kept=%d deleted=%d",
            session_id, status, total_reviewed, total_kept, total_deleted,
        )
        return result.data[0]
    except LookupError:
        raise
    except Exception as exc:
        logger.error("Database error in update_session: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")
