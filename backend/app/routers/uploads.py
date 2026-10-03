"""POST /api/uploads — Phase 3.

Replaces the client's base64/blob-URL media (see CreateEventModal.tsx and
ProfileView.tsx before this change) with a real, persisted file. Storage
backend (R2 vs local disk) is decided in app/storage.py, transparent to
callers here."""
from fastapi import APIRouter, HTTPException, UploadFile, status

from app.deps import CurrentUser
from app.schemas import UploadResponse
from app.storage import UnsupportedMediaType, UploadTooLarge, save_upload

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile, current_user: CurrentUser) -> UploadResponse:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    try:
        url, kind = save_upload(data, file.filename or "upload", file.content_type or "")
    except UnsupportedMediaType as exc:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)) from exc
    except UploadTooLarge as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)
        ) from exc

    return UploadResponse(url=url, type=kind)  # type: ignore[arg-type]
