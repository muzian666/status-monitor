import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base
from app.models.check_result import CheckResult
from app.models.monitor import Monitor
from app.models.traceroute import TracerouteHop, TracerouteRun
from app.services.retention import _retention_cutoff, purge_older_than


def _aware_utc(**delta) -> datetime:
    return datetime.now(timezone.utc) + timedelta(**delta)


def _build():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, Session


def test_purge_deletes_only_results_older_than_cutoff():
    async def run():
        engine, Session = _build()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with Session() as s:
            mon = Monitor(name="m", protocol="ping", target="x")
            s.add(mon)
            await s.flush()
            s.add(CheckResult(monitor_id=mon.id, is_success=True, checked_at=_aware_utc(days=-40)))
            s.add(CheckResult(monitor_id=mon.id, is_success=True, checked_at=_aware_utc(days=-10)))
            s.add(CheckResult(monitor_id=mon.id, is_success=True, checked_at=_aware_utc(days=0)))
            await s.commit()

            cutoff = _aware_utc(days=-30)
            deleted = await purge_older_than(s, cutoff)

        assert deleted["checks"] == 1
        async with Session() as s:
            remaining = (await s.execute(select(CheckResult))).scalars().all()
        assert len(remaining) == 2
        await engine.dispose()

    asyncio.run(run())


def test_purge_removes_traceroute_runs_and_their_hops():
    async def run():
        engine, Session = _build()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with Session() as s:
            old_run = TracerouteRun(target_host="x", started_at=_aware_utc(days=-40))
            new_run = TracerouteRun(target_host="y", started_at=_aware_utc(days=-1))
            s.add_all([old_run, new_run])
            await s.flush()
            s.add(TracerouteHop(run_id=old_run.id, hop_number=1))
            s.add(TracerouteHop(run_id=new_run.id, hop_number=1))
            await s.commit()

            cutoff = _aware_utc(days=-30)
            deleted = await purge_older_than(s, cutoff)

        assert deleted["traceroute_runs"] == 1
        async with Session() as s:
            runs = (await s.execute(select(TracerouteRun))).scalars().all()
            hops = (await s.execute(select(TracerouteHop))).scalars().all()
        assert len(runs) == 1
        assert len(hops) == 1  # hop of the old run gone, hop of the new run kept
        await engine.dispose()

    asyncio.run(run())


def test_retention_cutoff_is_roughly_n_days_ago():
    cutoff = _retention_cutoff(30)
    expected = datetime.now(timezone.utc) - timedelta(days=30)
    # Within a minute is plenty.
    assert abs((cutoff - expected).total_seconds()) < 60
    assert cutoff.tzinfo is not None  # aware, matches the tz-aware column
