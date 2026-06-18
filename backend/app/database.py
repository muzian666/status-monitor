from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


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


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
