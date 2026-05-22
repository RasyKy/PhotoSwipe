from fastapi import APIRouter

from app.models.schemas import CreateSessionRequest, SessionResponse, UpdateSessionRequest
from app.services.session_service import create_session, get_sessions, update_session
from app.utils.helpers import error_response, success_response

router = APIRouter()


@router.post("")
def create(req: CreateSessionRequest):
    try:
        session = create_session(req.user_id)
        return success_response(SessionResponse(**session).model_dump())
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500)


@router.get("")
def list_sessions(user_id: str):
    try:
        sessions = get_sessions(user_id)
        return success_response([SessionResponse(**s).model_dump() for s in sessions])
    except Exception as e:
        return error_response(str(e), 500)


@router.patch("/{session_id}")
def update(session_id: str, req: UpdateSessionRequest):
    try:
        session = update_session(session_id, req.status)
        return success_response(SessionResponse(**session).model_dump())
    except LookupError as e:
        return error_response(str(e), 404)
    except Exception as e:
        return error_response(str(e), 500)
