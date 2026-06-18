from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status")
async def auth_status():
    """Tells the frontend whether an API key is required (SM_API_KEY is set).

    Always public so the UI can decide whether to show a key prompt.
    """
    return {"auth_required": bool(settings.api_key)}
