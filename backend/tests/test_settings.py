import asyncio

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import Base
from app.services import settings_service
from app.services.settings_service import InvalidSetting


def _build(db_path):
    """File-based engine so multiple sessions share the same database
    (:memory: is per-connection and breaks multi-session tests)."""
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, Session


@pytest.fixture
def preserve_settings():
    originals = {s.env_attr: getattr(settings, s.env_attr) for s in settings_service.REGISTRY}
    yield
    for attr, val in originals.items():
        setattr(settings, attr, val)


def test_get_all_effective_returns_env_defaults(tmp_path, preserve_settings):
    async def run():
        engine, Session = _build(tmp_path / "s.db")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with Session() as s:
            result = await settings_service.get_all_effective(s)
        await engine.dispose()
        return result

    result = asyncio.run(run())
    keys = {r["key"] for r in result}
    assert keys == {"retention_days", "traceroute_timeout", "traceroute_max_concurrency"}
    for r in result:
        assert r["overridden"] is False
        assert r["value"] == r["default"]


def test_persist_updates_overrides_value_and_mutates_settings(tmp_path, preserve_settings):
    async def run():
        engine, Session = _build(tmp_path / "s.db")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with Session() as s:
            changed, effective = await settings_service.persist_updates(
                s, {"retention_days": 7}
            )
            eff = {r["key"]: r for r in effective}
        await engine.dispose()
        return changed, eff

    changed, eff = asyncio.run(run())
    assert changed == {"retention_days"}
    assert eff["retention_days"]["value"] == 7
    assert eff["retention_days"]["overridden"] is True
    assert settings.retention_days == 7  # in-memory settings mutated


def test_persist_updates_rejects_out_of_range(tmp_path, preserve_settings):
    async def run():
        engine, Session = _build(tmp_path / "s.db")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with Session() as s:
            with pytest.raises(InvalidSetting):
                await settings_service.persist_updates(s, {"traceroute_timeout": 1})
            with pytest.raises(InvalidSetting):
                await settings_service.persist_updates(
                    s, {"traceroute_max_concurrency": 999}
                )
        await engine.dispose()

    asyncio.run(run())


def test_persist_updates_rejects_unknown_key(tmp_path, preserve_settings):
    async def run():
        engine, Session = _build(tmp_path / "s.db")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with Session() as s:
            with pytest.raises(InvalidSetting):
                await settings_service.persist_updates(s, {"nope": 1})
        await engine.dispose()

    asyncio.run(run())


def test_apply_db_overrides_to_settings(tmp_path, preserve_settings, monkeypatch):
    async def run():
        engine, Session = _build(tmp_path / "s.db")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        # Persist an override, then simulate a fresh process: env default is
        # restored, and apply_db_overrides_to_settings must reload it from the DB.
        async with Session() as s:
            await settings_service.persist_updates(s, {"traceroute_timeout": 90})
        monkeypatch.setattr(settings_service, "async_session", Session)

        settings.traceroute_timeout = 120
        await settings_service.apply_db_overrides_to_settings()
        assert settings.traceroute_timeout == 90
        await engine.dispose()

    asyncio.run(run())
