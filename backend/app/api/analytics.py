from typing import Literal

from fastapi import APIRouter

from app.models.schemas import AnalyticsSummaryResponse, DailyStatResponse
from app.services.analytics_service import get_history, get_summary
from app.utils.helpers import error_response, success_response

router = APIRouter()


@router.get("/summary")
def summary(user_id: str):
    try:
        data = get_summary(user_id)
        return success_response(AnalyticsSummaryResponse(**data).model_dump())
    except Exception as e:
        return error_response(str(e), 500)


@router.get("/history")
def history(user_id: str, period: Literal["week", "month", "all"] = "week"):
    try:
        rows = get_history(user_id, period)
        return success_response([DailyStatResponse(**r).model_dump() for r in rows])
    except Exception as e:
        return error_response(str(e), 500)
