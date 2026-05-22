from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.schemas import BackupResponse
from app.services.backup_service import list_backups, upload_backup
from app.utils.helpers import error_response, success_response

router = APIRouter()


@router.post("/upload")
async def upload(
    user_id: str = Form(...),
    photo_name: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        file_bytes = await file.read()
        result = upload_backup(user_id, photo_name, file_bytes)
        return success_response(BackupResponse(**result).model_dump())
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e), 500)


@router.get("/list")
def list_user_backups(user_id: str):
    try:
        backups = list_backups(user_id)
        return success_response([BackupResponse(**b).model_dump() for b in backups])
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e), 500)
