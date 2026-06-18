import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.traceroute import TracerouteHop, TracerouteRun
from app.schemas.traceroute import (
    TracerouteRunRequest,
    TracerouteRunResponse,
    TracerouteRunSummary,
)

router = APIRouter(prefix="/traceroute", tags=["traceroute"])


# Keep strong references to in-flight traceroute tasks so they are not
# garbage-collected mid-run (and so we can see/limit what is running).
_running_traceroute_tasks: set[asyncio.Task] = set()


@router.post("/run", status_code=201)
async def start_traceroute(
    body: TracerouteRunRequest,
    db: AsyncSession = Depends(get_db),
):
    run = TracerouteRun(target_host=body.target_host)
    db.add(run)
    await db.commit()
    await db.refresh(run)

    from app.checkers.traceroute import run_traceroute

    task = asyncio.create_task(run_traceroute(run.id, body.target_host))
    _running_traceroute_tasks.add(task)
    task.add_done_callback(_running_traceroute_tasks.discard)

    return {"run_id": run.id, "target_host": body.target_host, "status": "running"}


@router.get("/runs", response_model=list[TracerouteRunSummary])
async def list_runs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TracerouteRun).order_by(TracerouteRun.started_at.desc()).limit(limit)
    )
    return result.scalars().all()


@router.get("/runs/{run_id}", response_model=TracerouteRunResponse)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(TracerouteRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    hops_result = await db.execute(
        select(TracerouteHop).where(TracerouteHop.run_id == run_id).order_by(TracerouteHop.hop_number)
    )
    run.hops = hops_result.scalars().all()
    return run


@router.get("/runs/{run_id}/topology")
async def get_run_topology(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(TracerouteRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")

    hops_result = await db.execute(
        select(TracerouteHop).where(TracerouteHop.run_id == run_id).order_by(TracerouteHop.hop_number)
    )
    hops = hops_result.scalars().all()

    nodes = [
        {
            "id": "source",
            "type": "source",
            "position": {"x": 400, "y": 0},
            "data": {"label": "This Machine", "ip": "localhost"},
        }
    ]
    edges = []
    prev_id = "source"

    for i, hop in enumerate(hops):
        node_id = f"hop-{hop.hop_number}"
        y = (i + 1) * 130
        nodes.append(
            {
                "id": node_id,
                "type": "hop",
                "position": {"x": 400, "y": y},
                "data": {
                    "label": hop.hostname or hop.ip_address or "*",
                    "ip": hop.ip_address,
                    "hostname": hop.hostname,
                    "hop_number": hop.hop_number,
                    "latency_ms": hop.latency_ms,
                    "is_timeout": hop.is_timeout,
                    "hop_type": hop.hop_type,
                },
            }
        )
        edges.append(
            {
                "id": f"edge-{prev_id}-{node_id}",
                "source": prev_id,
                "target": node_id,
                "type": "animated",
                "animated": not hop.is_timeout,
                "data": {"latency_ms": hop.latency_ms, "is_timeout": hop.is_timeout},
            }
        )
        prev_id = node_id

    # Always show target node (even if unreachable)
    target_y = (len(hops) + 1) * 130
    is_failed = run.status in ("failed",) or (
        hops and hops[-1].is_timeout
    )
    nodes.append(
        {
            "id": "target",
            "type": "target",
            "position": {"x": 400, "y": target_y},
            "data": {
                "label": run.target_host,
                "ip": run.target_host,
                "is_failed": is_failed,
                "reached": run.status == "completed" and not is_failed,
            },
        }
    )
    edges.append(
        {
            "id": f"edge-{prev_id}-target",
            "source": prev_id,
            "target": "target",
            "type": "animated",
            "animated": not is_failed,
            "data": {"is_timeout": is_failed},
        }
    )

    return {"nodes": nodes, "edges": edges, "status": run.status}
