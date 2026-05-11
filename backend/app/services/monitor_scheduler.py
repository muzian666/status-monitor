import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import async_session
from app.models.monitor import Monitor

logger = logging.getLogger(__name__)


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

    async def add_job(self, monitor: Monitor):
        job_id = f"monitor_{monitor.id}"
        self._scheduler.add_job(
            self._run_check,
            "interval",
            seconds=monitor.interval_seconds,
            id=job_id,
            args=[monitor.id],
            replace_existing=True,
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
