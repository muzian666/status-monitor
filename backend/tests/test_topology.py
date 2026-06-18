import asyncio
from datetime import datetime, timezone

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.check_result import CheckResult
from app.models.monitor import Monitor
from app.models.topology import TopologyNode


def _build_engine():
    return create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )


def test_graph_populates_node_status_from_latest_result():
    async def run():
        engine = _build_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async def override_get_db():
            async with Session() as s:
                yield s

        app.dependency_overrides[get_db] = override_get_db
        try:
            # Seed a monitored node with an older DOWN result and a newer UP one.
            async with Session() as s:
                mon = Monitor(name="m", protocol="ping", target="1.1.1.1")
                s.add(mon)
                await s.flush()
                s.add(TopologyNode(name="gw", monitor_id=mon.id))
                s.add(
                    CheckResult(
                        monitor_id=mon.id,
                        is_success=False,
                        latency_ms=None,
                        checked_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                    )
                )
                s.add(
                    CheckResult(
                        monitor_id=mon.id,
                        is_success=True,
                        latency_ms=12.3,
                        checked_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
                    )
                )
                await s.commit()

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as c:
                resp = await c.get("/api/v1/topology/graph")

            assert resp.status_code == 200
            node = resp.json()["nodes"][0]
            assert node["status"] == "up"
            assert node["latency_ms"] == 12.3
        finally:
            app.dependency_overrides.clear()
            await engine.dispose()

    asyncio.run(run())


def test_graph_shows_down_when_latest_result_failed():
    async def run():
        engine = _build_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async def override_get_db():
            async with Session() as s:
                yield s

        app.dependency_overrides[get_db] = override_get_db
        try:
            async with Session() as s:
                mon = Monitor(name="m", protocol="ping", target="1.1.1.1")
                s.add(mon)
                await s.flush()
                s.add(TopologyNode(name="gw", monitor_id=mon.id))
                s.add(
                    CheckResult(
                        monitor_id=mon.id,
                        is_success=False,
                        latency_ms=None,
                        checked_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                    )
                )
                await s.commit()

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as c:
                resp = await c.get("/api/v1/topology/graph")

            node = resp.json()["nodes"][0]
            assert node["status"] == "down"
            assert node["latency_ms"] is None
        finally:
            app.dependency_overrides.clear()
            await engine.dispose()

    asyncio.run(run())


def test_graph_node_without_monitor_has_no_status():
    async def run():
        engine = _build_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async def override_get_db():
            async with Session() as s:
                yield s

        app.dependency_overrides[get_db] = override_get_db
        try:
            async with Session() as s:
                s.add(TopologyNode(name="free"))  # no monitor_id
                await s.commit()

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as c:
                resp = await c.get("/api/v1/topology/graph")

            node = resp.json()["nodes"][0]
            assert node["status"] is None
            assert node["latency_ms"] is None
        finally:
            app.dependency_overrides.clear()
            await engine.dispose()

    asyncio.run(run())
