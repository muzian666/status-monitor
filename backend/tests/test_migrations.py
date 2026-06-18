import sqlite3

import pytest
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.database import Base, _schema_untracked, migrate_database


def _tabs_and_rev(path: str):
    conn = sqlite3.connect(path)
    tabs = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    rev = (
        conn.execute("SELECT version_num FROM alembic_version").fetchone()[0]
        if "alembic_version" in tabs
        else None
    )
    conn.close()
    return tabs, rev


def test_schema_untracked_false_for_empty_db(tmp_path):
    db = tmp_path / "empty.db"
    assert _schema_untracked(f"sqlite+aiosqlite:///{db}") is False


def test_schema_untracked_true_for_legacy_db(tmp_path):
    db = tmp_path / "legacy.db"
    import sqlalchemy as sa

    eng = sa.create_engine(f"sqlite:///{db}")  # creates the file
    with eng.begin() as conn:
        conn.execute(sa.text("CREATE TABLE monitors (id INTEGER PRIMARY KEY)"))
    eng.dispose()
    assert _schema_untracked(f"sqlite+aiosqlite:///{db}") is True


def test_migrate_fresh_db_creates_schema_and_baseline(tmp_path, monkeypatch):
    db = tmp_path / "fresh.db"
    monkeypatch.setattr(settings, "database_url", f"sqlite+aiosqlite:///{db}")

    import asyncio

    asyncio.run(migrate_database())

    tabs, rev = _tabs_and_rev(str(db))
    assert "monitors" in tabs
    assert "check_results" in tabs
    assert "alembic_version" in tabs
    assert rev == "0001"


def test_migrate_legacy_db_stamps_baseline_without_losing_data(tmp_path, monkeypatch):
    db = tmp_path / "legacy.db"

    # Build a legacy schema (created by the old create_all path) with a row.
    async def seed():
        engine = create_async_engine(f"sqlite+aiosqlite:///{db}")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    import asyncio

    asyncio.run(seed())

    import sqlalchemy as sa

    eng = sa.create_engine(f"sqlite:///{db}")
    with eng.begin() as conn:
        conn.execute(
            sa.text(
                "INSERT INTO monitors (name, protocol, target, interval_seconds, "
                "timeout_seconds, is_active) VALUES ('m', 'ping', '1.1.1.1', 30, 5, 1)"
            )
        )
    eng.dispose()

    monkeypatch.setattr(settings, "database_url", f"sqlite+aiosqlite:///{db}")
    asyncio.run(migrate_database())

    tabs, rev = _tabs_and_rev(str(db))
    assert "alembic_version" in tabs
    assert rev == "0001"
    # data survived the stamp
    eng = sa.create_engine(f"sqlite:///{db}")
    with eng.begin() as conn:
        count = conn.execute(sa.text("SELECT COUNT(*) FROM monitors")).scalar()
    eng.dispose()
    assert count == 1


_ = pytest  # keep import for fixtures if extended later
