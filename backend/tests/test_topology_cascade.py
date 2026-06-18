import asyncio

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.topology import TopologyLink, TopologyNode


def _setup():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with Session() as s:
            yield s

    return engine, Session, override_get_db


def test_deleting_node_removes_links_referencing_it():
    async def run():
        engine, Session, override = _setup()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        app.dependency_overrides[get_db] = override
        try:
            async with Session() as s:
                a = TopologyNode(name="a")
                b = TopologyNode(name="b")
                s.add_all([a, b])
                await s.flush()
                s.add(TopologyLink(source_node_id=a.id, target_node_id=b.id))
                await s.commit()
                a_id = a.id

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as c:
                resp = await c.delete(f"/api/v1/topology/nodes/{a_id}")
            assert resp.status_code == 204

            async with Session() as s:
                remaining_links = (
                    await s.execute(select(TopologyLink))
                ).scalars().all()
                remaining_nodes = (
                    await s.execute(select(TopologyNode))
                ).scalars().all()
            assert len(remaining_links) == 0
            assert len(remaining_nodes) == 1
        finally:
            app.dependency_overrides.clear()
            await engine.dispose()

    asyncio.run(run())
