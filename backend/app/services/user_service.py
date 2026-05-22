import logging

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def register_user(device_id: str) -> dict:
    logger.info("register_user called device_id=%s", device_id)
    supabase = get_supabase()
    existing = supabase.table("users").select("*").eq("device_id", device_id).execute()
    if existing.data:
        logger.info("register_user returning existing user id=%s", existing.data[0]["id"])
        return existing.data[0]
    result = supabase.table("users").insert({"device_id": device_id}).execute()
    logger.info("register_user created user id=%s", result.data[0]["id"])
    return result.data[0]
