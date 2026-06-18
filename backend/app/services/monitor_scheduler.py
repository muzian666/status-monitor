import asyncio
import enum
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import async_session
from app.models.monitor import Monitor

logger = logging.getLogger(__name__)


class SchedulerAction(enum.Enum):
    """What (if anything) should happen to the scheduled job after a monitor edit."""

    ADD = "add"            # monitor activated → schedule and run soon
    REMOVE = "remove"      # monitor deactivated
    RESCHEDULE = "reschedule"  # interval changed while active → defer one interval
    NONE = "none"          # nothing scheduler-relevant changed → leave the job alone


def decide_scheduler_action(
    old_active: bool,
    new_active: bool,
    old_interval: float,
    new_interval: float,
) -> SchedulerAction:
    """Decide whether an update to a monitor requires touching its scheduled job.

    Editing unrelated fields (name, target, timeout, ...) must NOT reschedule —
    previously any edit re-added the interval job, whose next_run_time defaults to
    now, so a rename would fire an immediate check.
    """
    if new_active and not old_active:
        return SchedulerAction.ADD
    if old_active and not new_active:
        return SchedulerAction.REMOVE
    if not new_active:
        return SchedulerAction.NONE
    # active in both states:
    if new_interval != old_interval:
        return SchedulerAction.RESCHEDULE
    return SchedulerAction.NONE


class MonitorScheduler:
    def __init__(self):
        self._scheduler = AsyncIOScheduler()
        self._jobs: dict[int, str] = {}

    def start(self):
        self._scheduler.start()
        logger.info("Monitor scheduler started")

    def shutdown(self):
        self._scheduler.shutdown(wait=False)
        logger.info("Monitor scheduler stopped")

    async def load_active_monitors(self):
        async with async_session() as db:
            result = await db.execute(
                select(Monitor).where(Monitor.is_active == True)
            )
            monitors = result.scalars().all()
            for monitor in monitors:
                await self.add_job(monitor)
        logger.info(f"Loaded {len(monitors)} active monitors")

    def schedule_retention(self, retention_days: int):
        """Hourly purge of check results / traceroute runs older than retention_days."""
        if retention_days <= 0:
            logger.info("Result retention purge disabled (retention_days <= 0)")
            return
        from app.services.retention import run_retention_purge

        self._scheduler.add_job(
            run_retention_purge,
            "interval",
            hours=1,
            id="retention_purge",
            args=[retention_days],
            replace_existing=True,
            coalesce=True,
            max_instances=1,
        )
        logger.info(
            "Scheduled result retention purge: keep %d days, run hourly",
            retention_days,
        )

    async def add_job(self, monitor: Monitor, run_immediately: bool = True):
        job_id = f"monitor_{monitor.id}"
        next_run_time = None
        if not run_immediately:
            # Defer the first run by one interval so an interval-only edit does
            # not fire an immediate check on top of the normal schedule.
            next_run_time = datetime.now(timezone.utc) + timedelta(
                seconds=monitor.interval_seconds
            )
        self._scheduler.add_job(
            self._run_check,
            "interval",
            seconds=monitor.interval_seconds,
            id=job_id,
            args=[monitor.id],
            replace_existing=True,
            next_run_time=next_run_time,
        )
        self._jobs[monitor.id] = job_id
        logger.info(f"Scheduled monitor {monitor.id} ({monitor.name}) every {monitor.interval_seconds}s")

    async def remove_job(self, monitor_id: int):
        job_id = self._jobs.pop(monitor_id, None)
        if job_id:
            try:
                self._scheduler.remove_job(job_id)
                logger.info(f"Removed job for monitor {monitor_id}")
            except Exception:
                pass

    async def _run_check(self, monitor_id: int):
        from app.services.check_runner import run_check

        async with async_session() as db:
            monitor = await db.get(Monitor, monitor_id)
            if not monitor or not monitor.is_active:
                return
        try:
            await run_check(monitor)
        except Exception as e:
            logger.error(f"Check failed for monitor {monitor_id}: {e}")


scheduler = MonitorScheduler()
