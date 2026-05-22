from pydantic import BaseModel
from typing import Any, Literal, Optional


# --- Requests ---

class RegisterUserRequest(BaseModel):
    device_id: str


class CreateSessionRequest(BaseModel):
    user_id: str


class UpdateSessionRequest(BaseModel):
    status: Literal["completed", "cancelled"]


class SwipeRequest(BaseModel):
    session_id: str
    photo_uri: str
    photo_name: str
    file_size_bytes: int
    action: Literal["keep", "delete"]


class UndoSwipeRequest(BaseModel):
    session_id: str


class ConfirmDeleteRequest(BaseModel):
    session_id: str


# --- Responses ---

class UserResponse(BaseModel):
    id: str
    device_id: str
    created_at: str


class SessionResponse(BaseModel):
    id: str
    user_id: str
    status: str
    total_reviewed: int
    total_kept: int
    total_deleted: int
    storage_saved_bytes: int
    started_at: str
    ended_at: Optional[str]


class SwipeActionResponse(BaseModel):
    id: str
    action: str
    swiped_at: str


class UndoResponse(BaseModel):
    undone_swipe_id: str
    photo_uri: str
    action: str


class DeleteQueueItemResponse(BaseModel):
    id: str
    photo_uri: str
    photo_name: str
    file_size_bytes: int
    added_at: str


class ConfirmDeleteResponse(BaseModel):
    deleted_count: int
    storage_freed_bytes: int


class AnalyticsSummaryResponse(BaseModel):
    total_reviewed: int
    total_kept: int
    total_deleted: int
    total_storage_saved_bytes: int
    total_sessions: int


class DailyStatResponse(BaseModel):
    date: str
    reviewed: int
    kept: int
    deleted: int
    storage_saved_bytes: int


class BackupResponse(BaseModel):
    id: str
    photo_name: str
    storage_path: str
    file_size_bytes: int
    backed_up_at: str


class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
