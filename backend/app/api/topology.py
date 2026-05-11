from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
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


@router.get("/graph", response_model=TopologyGraph)
async def get_graph(db: AsyncSession = Depends(get_db)):
    nodes_result = await db.execute(select(TopologyNode))
    nodes = nodes_result.scalars().all()

    links_result = await db.execute(select(TopologyLink))
    links = links_result.scalars().all()

    return TopologyGraph(
        nodes=[
            TopologyNodeResponse.model_validate(n) for n in nodes
        ],
        links=[
            TopologyLinkResponse.model_validate(l) for l in links
        ],
    )
