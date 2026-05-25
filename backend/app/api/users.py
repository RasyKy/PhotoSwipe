from fastapi import APIRouter, HTTPException, Request

from app.models.schemas import RegisterUserRequest, UserResponse
from app.services.user_service import register_user
from app.utils.helpers import error_response, success_response
from app.utils.limiter import limiter

router = APIRouter()


@router.post("/register")
@limiter.limit("10/minute")
def register(request: Request, req: RegisterUserRequest):
    try:
        user = register_user(req.device_id)
        return success_response(UserResponse(**user).model_dump())
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e), 500)
