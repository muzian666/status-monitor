from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.services import settings_service
from app.services.settings_service import InvalidSetting

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def list_settings(db: AsyncSession = Depends(get_db)):
    """All runtime settings with their effective value, env default, and bounds."""
    return await settings_service.get_all_effective(db)


@router.put("")
async def update_settings(
    updates: dict[str, int], db: AsyncSession = Depends(get_db)
):
    """Partially update runtime settings. Returns the full effective list."""
    try:
        changed, effective = await settings_service.persist_updates(db, updates)
    except InvalidSetting as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Side effects for settings that need more than an in-memory value change.
    if "retention_days" in changed:
        from app.services.monitor_scheduler import scheduler

        scheduler.schedule_retention(settings.retention_days)  # replace_existing
    if "traceroute_max_concurrency" in changed:
        from app.checkers import traceroute as tr

        tr._traceroute_semaphore = None  # recreated with the new limit on next use

    return effective
