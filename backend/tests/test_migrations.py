import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.database import Base, _schema_untracked, migrate_database


def _current_head() -> str:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))
    return ScriptDirectory.from_config(cfg).get_current_head()


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
    assert rev == _current_head()


def test_migrate_legacy_db_stamps_baseline_without_losing_data(tmp_path, monkeypatch):
    """A pre-Alembic DB (baseline schema, no alembic_version) is stamped and
    migrated forward without losing rows."""
    import asyncio
    import sqlalchemy as sa
    from alembic import command
    from alembic.config import Config

    db = tmp_path / "legacy.db"
    monkeypatch.setattr(settings, "database_url", f"sqlite+aiosqlite:///{db}")

    # Build a DB at the BASELINE (0001) schema — mirrors a pre-migration DB.
    cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))
    command.upgrade(cfg, "0001")

    eng = sa.create_engine(f"sqlite:///{db}")
    # Simulate "untracked": legacy DBs predate the alembic_version table.
    with eng.begin() as conn:
        conn.execute(sa.text("DROP TABLE alembic_version"))
        conn.execute(
            sa.text(
                "INSERT INTO monitors (name, protocol, target, interval_seconds, "
                "timeout_seconds, is_active) VALUES ('m', 'ping', '1.1.1.1', 30, 5, 1)"
            )
        )
    assert "verify_tls" not in {c["name"] for c in inspect(eng).get_columns("monitors")}
    eng.dispose()

    asyncio.run(migrate_database())

    eng = sa.create_engine(f"sqlite:///{db}")
    cols = {c["name"] for c in inspect(eng).get_columns("monitors")}
    with eng.begin() as conn:
        count = conn.execute(sa.text("SELECT COUNT(*) FROM monitors")).scalar()
        ver = conn.execute(sa.text("SELECT version_num FROM alembic_version")).scalar()
    eng.dispose()

    assert "verify_tls" in cols  # later migration applied on top of the stamp
    assert ver == _current_head()
    assert count == 1  # data preserved through stamp + upgrade



_ = pytest  # keep import for fixtures if extended later


def test_migrate_creates_verify_tls_column(tmp_path, monkeypatch):
    """Migration 0002 adds monitors.verify_tls (default true) on a fresh DB."""
    import asyncio
    import sqlalchemy as sa

    db = tmp_path / "fresh.db"
    monkeypatch.setattr(settings, "database_url", f"sqlite+aiosqlite:///{db}")
    asyncio.run(migrate_database())

    eng = sa.create_engine(f"sqlite:///{db}")
    cols = {c["name"]: c for c in inspect(eng).get_columns("monitors")}
    eng.dispose()
    assert "verify_tls" in cols
    assert cols["verify_tls"]["default"] in ("true", "1", True)

