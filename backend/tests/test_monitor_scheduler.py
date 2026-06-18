import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.monitor_scheduler import (
    MonitorScheduler,
    SchedulerAction,
    decide_scheduler_action,
)


# --- pure decision logic (the core of #13) ---


def test_rename_does_not_reschedule():
    # Editing only unrelated fields must leave the job alone.
    assert decide_scheduler_action(True, True, 30, 30) is SchedulerAction.NONE


def test_interval_change_reschedules():
    assert decide_scheduler_action(True, True, 30, 60) is SchedulerAction.RESCHEDULE


def test_activate_adds():
    assert decide_scheduler_action(False, True, 30, 30) is SchedulerAction.ADD


def test_deactivate_removes():
    assert decide_scheduler_action(True, False, 30, 30) is SchedulerAction.REMOVE


def test_stays_inactive_is_none():
    assert decide_scheduler_action(False, False, 30, 30) is SchedulerAction.NONE


def test_interval_change_while_inactive_is_none():
    # If inactive there is no job to reschedule.
    assert decide_scheduler_action(False, False, 30, 60) is SchedulerAction.NONE


# --- behavioral: run_immediately defers the first run ---


def test_add_job_deferred_by_one_interval():
    async def go():
        sched = MonitorScheduler()
        sched.start()
        try:
            monitor = SimpleNamespace(
                id=99999, name="t", interval_seconds=30, is_active=True
            )
            await sched.add_job(monitor, run_immediately=False)
            job = sched._scheduler.get_job("monitor_99999")
            return job.next_run_time
        finally:
            sched.shutdown()

    nxt = asyncio.run(go())
    delta = (nxt - datetime.now(timezone.utc)).total_seconds()
    # One interval out, with tolerance for test runtime.
    assert 25 <= delta <= 35, f"expected ~30s deferral, got {delta}s"

