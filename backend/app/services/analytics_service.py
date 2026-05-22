import json
import logging
from datetime import date, timedelta

from app.db.redis_client import get_redis
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

_SUMMARY_TTL = 300


def get_summary(user_id: str) -> dict:
    logger.info("get_summary called user_id=%s", user_id)
    cache_key = f"analytics:summary:{user_id}"

    redis = get_redis()
    if redis is not None:
        try:
            cached = redis.get(cache_key)
            if cached is not None:
                logger.info("get_summary cache hit user_id=%s", user_id)
                return json.loads(cached)
        except Exception:
            logger.warning("get_summary cache read failed user_id=%s, falling back to DB", user_id)

    supabase = get_supabase()
    result = (
        supabase.table("sessions")
        .select("total_reviewed, total_kept, total_deleted, storage_saved_bytes")
        .eq("user_id", user_id)
        .execute()
    )
    sessions = result.data
    summary = {
        "total_reviewed": sum(s["total_reviewed"] for s in sessions),
        "total_kept": sum(s["total_kept"] for s in sessions),
        "total_deleted": sum(s["total_deleted"] for s in sessions),
        "total_storage_saved_bytes": sum(s["storage_saved_bytes"] for s in sessions),
        "total_sessions": len(sessions),
    }

    if redis is not None:
        try:
            redis.set(cache_key, json.dumps(summary), ex=_SUMMARY_TTL)
            logger.debug("get_summary cached user_id=%s ttl=%d", user_id, _SUMMARY_TTL)
        except Exception:
            logger.warning("get_summary cache write failed user_id=%s", user_id)

    logger.info(
        "get_summary completed user_id=%s sessions=%d reviewed=%d",
        user_id, summary["total_sessions"], summary["total_reviewed"],
    )
    return summary


def get_history(user_id: str, period: str) -> list[dict]:
    logger.info("get_history called user_id=%s period=%s", user_id, period)
    supabase = get_supabase()
    query = supabase.table("daily_stats").select("*").eq("user_id", user_id)

    if period == "week":
        start = (date.today() - timedelta(days=6)).isoformat()
        query = query.gte("date", start)
    elif period == "month":
        start = (date.today() - timedelta(days=29)).isoformat()
        query = query.gte("date", start)

    result = query.order("date").execute()
    logger.info("get_history returning %d rows user_id=%s period=%s", len(result.data), user_id, period)
    return result.data
