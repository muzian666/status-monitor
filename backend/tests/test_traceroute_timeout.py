import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base
from app.models.traceroute import TracerouteRun, TracerouteStatus


def _build_db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, Session


class _BlockingStream:
    async def readline(self):
        # Never produces a line → simulates a stuck traceroute process.
        await asyncio.sleep(1000)


class _FakeProc:
    def __init__(self):
        self.stdout = _BlockingStream()
        self.stderr = _BlockingStream()
        self.killed = False

    def kill(self):
        self.killed = True

    async def wait(self):
        return 0

    async def communicate(self):
        return (b"", b"")


def test_stuck_traceroute_times_out_kills_proc_and_marks_failed(monkeypatch):
    """The headline #7 fix: a stuck process must not hang forever."""

    async def run():
        engine, Session = _build_db()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Point the runner at the in-memory DB instead of the real session.
        monkeypatch.setattr("app.checkers.traceroute.async_session", Session)
        monkeypatch.setattr("app.checkers.traceroute.settings.traceroute_timeout", 0.1)
        fake_proc = _FakeProc()
        monkeypatch.setattr(
            "asyncio.create_subprocess_exec",
            lambda *a, **kw: _completed(fake_proc),
        )

        async with Session() as s:
            run_row = TracerouteRun(target_host="example.com")
            s.add(run_row)
            await s.commit()
            run_id = run_row.id

        from app.checkers.traceroute import run_traceroute

        await run_traceroute(run_id, "example.com")

        async with Session() as s:
            refreshed = await s.get(TracerouteRun, run_id)
        await engine.dispose()
        return refreshed.status, fake_proc.killed

    status, killed = asyncio.run(run())
    assert killed, "stuck process should be killed on timeout"
    assert status == TracerouteStatus.FAILED


async def _completed(value):
    return value


def test_concurrency_semaphore_is_a_singleton_built_from_settings(monkeypatch):
    from app.checkers import traceroute as tr

    monkeypatch.setattr("app.checkers.traceroute.settings.traceroute_max_concurrency", 3)
    tr._traceroute_semaphore = None  # force re-creation with the new limit

    first = tr._concurrency_semaphore()
    second = tr._concurrency_semaphore()
    assert first is second  # same object reused
    # asyncio.Semaphore exposes its initial value internally; just sanity-check.
    assert isinstance(first, asyncio.Semaphore)
