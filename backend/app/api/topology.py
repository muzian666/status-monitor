from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.check_result import CheckResult
from app.models.topology import TopologyLink, TopologyNode
from app.schemas.topology import (
    TopologyGraph,
    TopologyLinkCreate,
    TopologyLinkResponse,
    TopologyLinkUpdate,
    TopologyNodeCreate,
    TopologyNodeResponse,
    TopologyNodeUpdate,
)

router = APIRouter(prefix="/topology", tags=["topology"])


@router.get("/nodes", response_model=list[TopologyNodeResponse])
async def list_nodes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TopologyNode))
    nodes = result.scalars().all()
    return nodes


@router.post("/nodes", response_model=TopologyNodeResponse, status_code=201)
async def create_node(body: TopologyNodeCreate, db: AsyncSession = Depends(get_db)):
    node = TopologyNode(**body.model_dump())
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


@router.put("/nodes/{node_id}", response_model=TopologyNodeResponse)
async def update_node(
    node_id: int, body: TopologyNodeUpdate, db: AsyncSession = Depends(get_db)
):
    node = await db.get(TopologyNode, node_id)
    if not node:
        raise HTTPException(404, "Node not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(node, k, v)
    await db.commit()
    await db.refresh(node)
    return node


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(node_id: int, db: AsyncSession = Depends(get_db)):
    node = await db.get(TopologyNode, node_id)
    if not node:
        raise HTTPException(404, "Node not found")
    # SQLite does not enforce FKs by default, so explicitly remove links that
    # reference this node to avoid orphaned edges pointing at a deleted node.
    await db.execute(
        delete(TopologyLink).where(
            or_(
                TopologyLink.source_node_id == node_id,
                TopologyLink.target_node_id == node_id,
            )
        )
    )
    await db.delete(node)
    await db.commit()


@router.get("/links", response_model=list[TopologyLinkResponse])
async def list_links(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TopologyLink))
    return result.scalars().all()


@router.post("/links", response_model=TopologyLinkResponse, status_code=201)
async def create_link(body: TopologyLinkCreate, db: AsyncSession = Depends(get_db)):
    source = await db.get(TopologyNode, body.source_node_id)
    target = await db.get(TopologyNode, body.target_node_id)
    if not source or not target:
        raise HTTPException(400, "Source or target node not found")
    link = TopologyLink(**body.model_dump())
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.put("/links/{link_id}", response_model=TopologyLinkResponse)
async def update_link(
    link_id: int, body: TopologyLinkUpdate, db: AsyncSession = Depends(get_db)
):
    link = await db.get(TopologyLink, link_id)
    if not link:
        raise HTTPException(404, "Link not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(link, k, v)
    await db.commit()
    await db.refresh(link)
    return link


@router.delete("/links/{link_id}", status_code=204)
async def delete_link(link_id: int, db: AsyncSession = Depends(get_db)):
    link = await db.get(TopologyLink, link_id)
    if not link:
        raise HTTPException(404, "Link not found")
    await db.delete(link)
    await db.commit()


async def _latest_results_by_monitor(
    db: AsyncSession, monitor_ids: set[int]
) -> dict[int, tuple[str, float | None]]:
    """Map monitor_id -> (status, latency_ms) from each monitor's newest result.

    status is "up"/"down" so the frontend MonitorNode (which keys on those
    exact strings) lights up; previously get_graph left status/latency_ms None.
    """
    if not monitor_ids:
        return {}
    sub = (
        select(CheckResult.monitor_id, func.max(CheckResult.id).label("max_id"))
        .where(CheckResult.monitor_id.in_(monitor_ids))
        .group_by(CheckResult.monitor_id)
        .subquery()
    )
    rows = await db.execute(
        select(CheckResult.monitor_id, CheckResult.is_success, CheckResult.latency_ms)
        .join(sub, CheckResult.id == sub.c.max_id)
    )
    return {
        mid: ("up" if ok else "down", lat)
        for mid, ok, lat in rows.all()
    }


@router.get("/graph", response_model=TopologyGraph)
async def get_graph(db: AsyncSession = Depends(get_db)):
    nodes_result = await db.execute(select(TopologyNode))
    nodes = nodes_result.scalars().all()

    links_result = await db.execute(select(TopologyLink))
    links = links_result.scalars().all()

    monitor_ids = {n.monitor_id for n in nodes if n.monitor_id} | {
        l.monitor_id for l in links if l.monitor_id
    }
    latest = await _latest_results_by_monitor(db, monitor_ids)

    node_responses = []
    for n in nodes:
        resp = TopologyNodeResponse.model_validate(n)
        latest_for_node = latest.get(n.monitor_id) if n.monitor_id else None
        if latest_for_node:
            resp.status, resp.latency_ms = latest_for_node
        node_responses.append(resp)

    link_responses = []
    for l in links:
        resp = TopologyLinkResponse.model_validate(l)
        latest_for_link = latest.get(l.monitor_id) if l.monitor_id else None
        if latest_for_link:
            resp.status, resp.latency_ms = latest_for_link
        link_responses.append(resp)

    return TopologyGraph(nodes=node_responses, links=link_responses)
