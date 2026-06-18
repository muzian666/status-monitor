import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.check_result import CheckResult
from app.models.traceroute import TracerouteHop, TracerouteRun

logger = logging.getLogger(__name__)


def _retention_cutoff(retention_days: int) -> datetime:
    """Cutoff timestamp older than which rows should be purged.

    The DateTime columns are naive (see #18), so compare against a naive UTC
    instant that matches what check_runner writes.
    """
    return (datetime.now(timezone.utc) - timedelta(days=retention_days)).replace(
        tzinfo=None
    )


async def purge_older_than(db: AsyncSession, cutoff: datetime) -> dict[str, int]:
    """Delete check results and traceroute runs (with their hops) older than cutoff."""
    checks = await db.execute(delete(CheckResult).where(CheckResult.checked_at < cutoff))
    checks_deleted = checks.rowcount or 0

    old_run_ids = (
        await db.execute(select(TracerouteRun.id).where(TracerouteRun.started_at < cutoff))
    ).scalars().all()
    runs_deleted = len(old_run_ids)
    if old_run_ids:
        # SQLite does not enforce FK cascade, so remove hops explicitly.
        await db.execute(delete(TracerouteHop).where(TracerouteHop.run_id.in_(old_run_ids)))
        await db.execute(delete(TracerouteRun).where(TracerouteRun.id.in_(old_run_ids)))

    await db.commit()
    return {"checks": checks_deleted, "traceroute_runs": runs_deleted}


async def run_retention_purge(retention_days: int) -> dict[str, int]:
    """Entry point for the scheduled retention job."""
    if retention_days <= 0:
        return {"checks": 0, "traceroute_runs": 0}
    cutoff = _retention_cutoff(retention_days)
    from app.database import async_session

    async with async_session() as db:
        deleted = await purge_older_than(db, cutoff)
    if any(deleted.values()):
        logger.info(
            "Retention purge (>%d days): removed %s",
            retention_days,
            deleted,
        )
    return deleted
