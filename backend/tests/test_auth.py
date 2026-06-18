import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import Base, get_db
from app.main import app


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def test_status_reports_no_auth_required():
    async def run():
        async with _client() as c:
            r = await c.get("/api/v1/auth/status")
        assert r.status_code == 200
        assert r.json() == {"auth_required": False}

    asyncio.run(run())


def test_status_reports_auth_required_when_key_set(monkeypatch):
    monkeypatch.setattr(settings, "api_key", "s3cret")

    async def run():
        async with _client() as c:
            r = await c.get("/api/v1/auth/status")
        assert r.json() == {"auth_required": True}

    asyncio.run(run())


def test_protected_route_rejects_missing_key(monkeypatch):
    monkeypatch.setattr(settings, "api_key", "s3cret")

    async def run():
        async with _client() as c:
            r = await c.get("/api/v1/monitors")
        assert r.status_code == 401

    asyncio.run(run())


def test_protected_route_rejects_wrong_key(monkeypatch):
    monkeypatch.setattr(settings, "api_key", "s3cret")

    async def run():
        async with _client() as c:
            r = await c.get("/api/v1/monitors", headers={"X-API-Key": "wrong"})
        assert r.status_code == 401

    asyncio.run(run())


def test_protected_route_accepts_correct_key(monkeypatch):
    monkeypatch.setattr(settings, "api_key", "s3cret")

    async def run():
        engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False}
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async def override_get_db():
            async with Session() as s:
                yield s

        app.dependency_overrides[get_db] = override_get_db
        try:
            async with _client() as c:
                r = await c.get(
                    "/api/v1/monitors", headers={"X-API-Key": "s3cret"}
                )
            assert r.status_code == 200
            assert r.json() == []
        finally:
            app.dependency_overrides.clear()
            await engine.dispose()

    asyncio.run(run())


def test_health_is_exempt(monkeypatch):
    monkeypatch.setattr(settings, "api_key", "s3cret")

    async def run():
        async with _client() as c:
            r = await c.get("/api/v1/health/live")
        assert r.status_code == 200

    asyncio.run(run())


def test_cors_preflight_passes_through_auth(monkeypatch):
    monkeypatch.setattr(settings, "api_key", "s3cret")

    async def run():
        async with _client() as c:
            r = await c.options(
                "/api/v1/monitors",
                headers={
                    "Origin": "https://example.com",
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "X-API-Key",
                },
            )
        # Must not be rejected by auth (CORS owns OPTIONS).
        assert r.status_code != 401

    asyncio.run(run())


_ = pytest
