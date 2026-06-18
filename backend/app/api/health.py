from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
@router.get("/health/live")
async def live():
    """Liveness: the process is up and serving requests.

    Deliberately does NOT touch the database, so a transient DB problem does
    not get the pod killed by the liveness probe.
    """
    return {"status": "healthy"}


@router.get("/health/ready")
async def ready(db: AsyncSession = Depends(get_db)):
    """Readiness: the app can actually serve traffic, which requires the DB."""
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(503, "database unavailable")
    return {"status": "ready"}
