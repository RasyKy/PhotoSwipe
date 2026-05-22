from fastapi import APIRouter

from app.models.schemas import RegisterUserRequest, UserResponse
from app.services.user_service import register_user
from app.utils.helpers import error_response, success_response

router = APIRouter()


@router.post("/register")
def register(req: RegisterUserRequest):
    try:
        user = register_user(req.device_id)
        return success_response(UserResponse(**user).model_dump())
    except Exception as e:
        return error_response(str(e), 500)
