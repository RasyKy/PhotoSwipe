import logging
import os

from upstash_redis import Redis

logger = logging.getLogger(__name__)

_client: Redis | None = None


def get_redis() -> Redis | None:
    global _client
    if _client is not None:
        return _client
    url = os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        return None
    _client = Redis(url=url, token=token)
    logger.info("Redis client initialised")
    return _client
