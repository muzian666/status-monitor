import asyncio

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app


def test_live_needs_no_database():
    async def run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.get("/api/v1/health/live")
        assert r.status_code == 200
        assert r.json() == {"status": "healthy"}

    asyncio.run(run())


def test_health_alias_still_works():
    # Backward compat for the Dockerfile/compose HEALTHCHECK.
    async def run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.get("/api/v1/health")
        assert r.status_code == 200

    asyncio.run(run())


def test_ready_returns_ok_when_db_reachable():
    async def run():
        engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async def override_get_db():
            async with Session() as s:
                yield s

        app.dependency_overrides[get_db] = override_get_db
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as c:
                r = await c.get("/api/v1/health/ready")
            assert r.status_code == 200
            assert r.json() == {"status": "ready"}
        finally:
            app.dependency_overrides.clear()
            await engine.dispose()

    asyncio.run(run())
