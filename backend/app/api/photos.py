from fastapi import APIRouter, HTTPException, Request

from app.models.schemas import (
    ConfirmDeleteRequest,
    ConfirmDeleteResponse,
    SwipeActionResponse,
    SwipeBatchRequest,
    SwipeBatchResponse,
    SwipeRequest,
    UndoResponse,
    UndoSwipeRequest,
)
from app.services.photo_service import (
    confirm_delete,
    record_swipe,
    record_swipe_batch,
    undo_swipe,
)
from app.utils.helpers import error_response, success_response
from app.utils.limiter import limiter

router = APIRouter()


@router.post("/swipe/batch")
@limiter.limit("300/minute")
def swipe_batch(request: Request, req: SwipeBatchRequest):
    try:
        result = record_swipe_batch(req.session_id, [s.model_dump() for s in req.swipes])
        return success_response(SwipeBatchResponse(**result).model_dump())
    except LookupError as e:
        return error_response(str(e), 404)
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e), 500)


@router.post("/swipe")
@limiter.limit("60/minute")
def swipe(request: Request, req: SwipeRequest):
    try:
        result = record_swipe(
            req.session_id, req.photo_uri, req.photo_name, req.file_size_bytes, req.action
        )
        return success_response(SwipeActionResponse(**result).model_dump())
    except LookupError as e:
        return error_response(str(e), 404)
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e), 500)


@router.post("/undo")
@limiter.limit("30/minute")
def undo(request: Request, req: UndoSwipeRequest):
    try:
        result = undo_swipe(req.session_id)
        return success_response(UndoResponse(**result).model_dump())
    except ValueError as e:
        return error_response(str(e), 400)
    except LookupError as e:
        return error_response(str(e), 404)
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e), 500)


@router.post("/confirm-delete")
def confirm(req: ConfirmDeleteRequest):
    try:
        result = confirm_delete(req.session_id, req.deleted_count, req.storage_freed_bytes)
        return success_response(ConfirmDeleteResponse(**result).model_dump())
    except LookupError as e:
        return error_response(str(e), 404)
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e), 500)
