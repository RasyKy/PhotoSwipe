import logging
from datetime import date as date_type

from fastapi import HTTPException
from supabase import Client

from app.db.redis_client import get_redis
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def record_swipe(
    session_id: str,
    photo_uri: str,
    photo_name: str,
    file_size_bytes: int,
    action: str,
) -> dict:
    logger.info("record_swipe called session_id=%s photo_name=%s action=%s", session_id, photo_name, action)
    try:
        supabase = get_supabase()

        session = _get_session(supabase, session_id)

        swipe_result = supabase.table("swipe_actions").insert({
            "session_id": session_id,
            "photo_uri": photo_uri,
            "photo_name": photo_name,
            "file_size_bytes": file_size_bytes,
            "action": action,
        }).execute()
        swipe = swipe_result.data[0]

        counter_update = {"total_reviewed": session["total_reviewed"] + 1}
        if action == "keep":
            counter_update["total_kept"] = session["total_kept"] + 1
        else:
            counter_update["total_deleted"] = session["total_deleted"] + 1
            counter_update["storage_saved_bytes"] = session["storage_saved_bytes"] + file_size_bytes
        supabase.table("sessions").update(counter_update).eq("id", session_id).execute()

        _update_daily_stats(supabase, session["user_id"], action, file_size_bytes, delta=1)

        _invalidate_summary_cache(session["user_id"])
        logger.info("record_swipe completed swipe_id=%s session_id=%s action=%s", swipe["id"], session_id, action)
        return swipe
    except (LookupError, HTTPException):
        raise
    except Exception as exc:
        logger.error("Database error in record_swipe: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")


def undo_swipe(session_id: str) -> dict:
    logger.info("undo_swipe called session_id=%s", session_id)
    try:
        supabase = get_supabase()

        swipe_result = (
            supabase.table("swipe_actions")
            .select("*")
            .eq("session_id", session_id)
            .eq("undone", False)
            .order("swiped_at", desc=True)
            .limit(1)
            .execute()
        )
        if not swipe_result.data:
            logger.warning("undo_swipe rejected: no swipe to undo session_id=%s", session_id)
            raise ValueError("No swipe to undo")
        swipe = swipe_result.data[0]

        supabase.table("swipe_actions").update({"undone": True}).eq("id", swipe["id"]).execute()

        if swipe["action"] == "delete":
            supabase.table("delete_queue").delete().eq("session_id", session_id).eq("photo_uri", swipe["photo_uri"]).execute()

        session = _get_session(supabase, session_id)
        counter_update = {"total_reviewed": session["total_reviewed"] - 1}
        if swipe["action"] == "keep":
            counter_update["total_kept"] = session["total_kept"] - 1
        else:
            counter_update["total_deleted"] = session["total_deleted"] - 1
            counter_update["storage_saved_bytes"] = session["storage_saved_bytes"] - swipe["file_size_bytes"]
        supabase.table("sessions").update(counter_update).eq("id", session_id).execute()

        _update_daily_stats(supabase, session["user_id"], swipe["action"], swipe["file_size_bytes"], delta=-1)

        _invalidate_summary_cache(session["user_id"])
        logger.info("undo_swipe completed swipe_id=%s session_id=%s action=%s", swipe["id"], session_id, swipe["action"])
        return {
            "undone_swipe_id": swipe["id"],
            "photo_uri": swipe["photo_uri"],
            "action": swipe["action"],
        }
    except (ValueError, LookupError, HTTPException):
        raise
    except Exception as exc:
        logger.error("Database error in undo_swipe: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")


def record_swipe_batch(session_id: str, swipes: list[dict]) -> dict:
    logger.info("record_swipe_batch called session_id=%s count=%d", session_id, len(swipes))
    if not swipes:
        return {"processed": 0}
    try:
        supabase = get_supabase()
        session = _get_session(supabase, session_id)
        user_id = session["user_id"]

        keep_count = 0
        delete_count = 0
        storage_saved = 0

        for swipe in swipes:
            action = swipe["action"]
            supabase.table("swipe_actions").insert({
                "session_id": session_id,
                "photo_uri": swipe["photo_uri"],
                "photo_name": swipe["photo_name"],
                "file_size_bytes": swipe["file_size_bytes"],
                "action": action,
            }).execute()
            if action == "keep":
                keep_count += 1
            else:
                delete_count += 1
                storage_saved += swipe["file_size_bytes"]

        processed = keep_count + delete_count

        supabase.table("sessions").update({
            "total_reviewed": session["total_reviewed"] + processed,
            "total_kept": session["total_kept"] + keep_count,
            "total_deleted": session["total_deleted"] + delete_count,
            "storage_saved_bytes": session["storage_saved_bytes"] + storage_saved,
        }).eq("id", session_id).execute()

        today = date_type.today().isoformat()
        existing = (
            supabase.table("daily_stats")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", today)
            .execute()
        )
        if existing.data:
            row = existing.data[0]
            supabase.table("daily_stats").update({
                "reviewed": row["reviewed"] + processed,
                "kept": row["kept"] + keep_count,
                "deleted": row["deleted"] + delete_count,
                "storage_saved_bytes": row["storage_saved_bytes"] + storage_saved,
            }).eq("user_id", user_id).eq("date", today).execute()
        else:
            supabase.table("daily_stats").insert({
                "user_id": user_id,
                "date": today,
                "reviewed": processed,
                "kept": keep_count,
                "deleted": delete_count,
                "storage_saved_bytes": storage_saved,
            }).execute()

        _invalidate_summary_cache(user_id)
        logger.info("record_swipe_batch completed session_id=%s processed=%d", session_id, processed)
        return {"processed": processed}
    except (LookupError, HTTPException):
        raise
    except Exception as exc:
        logger.error("Database error in record_swipe_batch: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")


def confirm_delete(session_id: str, deleted_count: int, storage_freed_bytes: int) -> dict:
    logger.info("confirm_delete called session_id=%s deleted_count=%d storage_freed_bytes=%d", session_id, deleted_count, storage_freed_bytes)
    try:
        supabase = get_supabase()
        session = _get_session(supabase, session_id)
        user_id = session["user_id"]

        supabase.table("sessions").update({
            "total_deleted": session["total_deleted"] + deleted_count,
            "storage_saved_bytes": session["storage_saved_bytes"] + storage_freed_bytes,
        }).eq("id", session_id).execute()

        today = date_type.today().isoformat()
        existing = (
            supabase.table("daily_stats")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", today)
            .execute()
        )
        if existing.data:
            row = existing.data[0]
            supabase.table("daily_stats").update({
                "reviewed": row["reviewed"] + deleted_count,
                "deleted": row["deleted"] + deleted_count,
                "storage_saved_bytes": row["storage_saved_bytes"] + storage_freed_bytes,
            }).eq("user_id", user_id).eq("date", today).execute()
        else:
            supabase.table("daily_stats").insert({
                "user_id": user_id,
                "date": today,
                "reviewed": deleted_count,
                "kept": 0,
                "deleted": deleted_count,
                "storage_saved_bytes": storage_freed_bytes,
            }).execute()

        _invalidate_summary_cache(user_id)
        logger.info("confirm_delete completed session_id=%s count=%d freed_bytes=%d", session_id, deleted_count, storage_freed_bytes)
        return {"deleted_count": deleted_count, "storage_freed_bytes": storage_freed_bytes}
    except (LookupError, HTTPException):
        raise
    except Exception as exc:
        logger.error("Database error in confirm_delete: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")


def _invalidate_summary_cache(user_id: str) -> None:
    redis = get_redis()
    if redis is None:
        return
    try:
        redis.delete(f"analytics:summary:{user_id}")
        logger.debug("summary cache invalidated user_id=%s", user_id)
    except Exception:
        logger.warning("summary cache invalidation failed user_id=%s", user_id)


def _get_session(supabase: Client, session_id: str) -> dict:
    logger.debug("_get_session session_id=%s", session_id)
    try:
        result = (
            supabase.table("sessions")
            .select("user_id, total_reviewed, total_kept, total_deleted, storage_saved_bytes")
            .eq("id", session_id)
            .execute()
        )
    except Exception as exc:
        logger.error("Database error in _get_session: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")
    if not result.data:
        logger.warning("_get_session not found session_id=%s", session_id)
        raise LookupError("Session not found")
    return result.data[0]


def _update_daily_stats(supabase: Client, user_id: str, action: str, file_size_bytes: int, delta: int) -> None:
    today = date_type.today().isoformat()
    logger.debug("_update_daily_stats user_id=%s action=%s delta=%d date=%s", user_id, action, delta, today)
    try:
        existing = (
            supabase.table("daily_stats")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", today)
            .execute()
        )

        if existing.data:
            row = existing.data[0]
            update = {"reviewed": row["reviewed"] + delta}
            if action == "keep":
                update["kept"] = row["kept"] + delta
            else:
                update["deleted"] = row["deleted"] + delta
                update["storage_saved_bytes"] = row["storage_saved_bytes"] + (delta * file_size_bytes)
            supabase.table("daily_stats").update(update).eq("user_id", user_id).eq("date", today).execute()
        elif delta > 0:
            supabase.table("daily_stats").insert({
                "user_id": user_id,
                "date": today,
                "reviewed": 1,
                "kept": 1 if action == "keep" else 0,
                "deleted": 1 if action == "delete" else 0,
                "storage_saved_bytes": file_size_bytes if action == "delete" else 0,
            }).execute()
    except Exception as exc:
        logger.error("Database error in _update_daily_stats: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")
