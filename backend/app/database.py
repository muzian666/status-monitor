import asyncio
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

# Revision that captures the legacy create_all() schema; existing pre-Alembic
# databases are stamped here so later migrations apply on top.
BASELINE_REVISION = "0001"


def connect_args_for(url: str) -> dict:
    """Return DBAPI connect_args appropriate for the given URL.

    ``check_same_thread`` is a sqlite3 (sync driver) option. aiosqlite passes it
    through harmlessly, but forwarding it to PostgreSQL/MySQL drivers (asyncpg,
    aiomysql, ...) raises an unexpected-argument error. Only inject it for sqlite.
    """
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


db_url = settings.get_database_url()
engine = create_async_engine(
    db_url,
    echo=settings.debug,
    connect_args=connect_args_for(db_url),
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


def _to_sync_url(url: str) -> str:
    """Convert an async driver URL to its sync counterpart for inspection."""
    return url.replace("+aiosqlite", "").replace("+asyncpg", "+psycopg2")


def _schema_untracked(url: str) -> bool:
    """True if app tables exist but alembic_version does not (a legacy DB).

    Such databases were created by create_all() and have no revision history;
    they must be stamped at the baseline before upgrade.
    """
    from sqlalchemy import create_engine, inspect

    try:
        sync_engine = create_engine(_to_sync_url(url))
    except Exception:
        return False  # unknown driver; let alembic upgrade attempt it
    try:
        names = set(inspect(sync_engine).get_table_names())
    except Exception:
        return False
    finally:
        sync_engine.dispose()

    app_tables = {
        "monitors",
        "check_results",
        "traceroute_runs",
        "traceroute_hops",
        "topology_nodes",
        "topology_links",
    }
    return bool(app_tables & names) and "alembic_version" not in names


def _run_migrations_blocking() -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))
    url = settings.get_database_url()
    if _schema_untracked(url):
        logger.info(
            "Legacy schema without alembic_version; stamping baseline %s",
            BASELINE_REVISION,
        )
        command.stamp(cfg, BASELINE_REVISION)
    command.upgrade(cfg, "head")


async def migrate_database() -> None:
    """Apply pending migrations on startup.

    Runs in a worker thread because Alembic's env.py calls asyncio.run(), which
    cannot nest inside the app's already-running event loop.
    """
    await asyncio.to_thread(_run_migrations_blocking)

