import logging
import os

from fastapi import HTTPException

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def upload_backup(user_id: str, photo_name: str, file_bytes: bytes) -> dict:
    logger.info("upload_backup called user_id=%s photo_name=%s size=%d bytes", user_id, photo_name, len(file_bytes))
    try:
        supabase = get_supabase()
        bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "photo-backups")
        storage_path = f"{user_id}/{photo_name}"

        supabase.storage.from_(bucket).upload(storage_path, file_bytes)
        logger.info("upload_backup storage upload complete path=%s", storage_path)

        result = supabase.table("backups").insert({
            "user_id": user_id,
            "photo_name": photo_name,
            "storage_path": storage_path,
            "file_size_bytes": len(file_bytes),
        }).execute()
        logger.info("upload_backup completed id=%s path=%s", result.data[0]["id"], storage_path)
        return result.data[0]
    except Exception as exc:
        logger.error("Database error in upload_backup: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")


def list_backups(user_id: str) -> list[dict]:
    logger.info("list_backups called user_id=%s", user_id)
    try:
        supabase = get_supabase()
        result = (
            supabase.table("backups")
            .select("*")
            .eq("user_id", user_id)
            .order("backed_up_at", desc=True)
            .execute()
        )
        logger.info("list_backups returning %d backups user_id=%s", len(result.data), user_id)
        return result.data
    except Exception as exc:
        logger.error("Database error in list_backups: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable, please try again later.")
