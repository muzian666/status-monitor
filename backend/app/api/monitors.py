from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.monitor import Monitor
from app.schemas.monitor import MonitorCreate, MonitorResponse, MonitorUpdate

router = APIRouter(prefix="/monitors", tags=["monitors"])


@router.get("", response_model=list[MonitorResponse])
async def list_monitors(
    protocol: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Monitor)
    if protocol:
        stmt = stmt.where(Monitor.protocol == protocol)
    if is_active is not None:
        stmt = stmt.where(Monitor.is_active == is_active)
    result = await db.execute(stmt.order_by(Monitor.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=MonitorResponse, status_code=201)
async def create_monitor(body: MonitorCreate, db: AsyncSession = Depends(get_db)):
    monitor = Monitor(**body.model_dump())
    db.add(monitor)
    await db.commit()
    await db.refresh(monitor)

    from app.services.monitor_scheduler import scheduler

    if monitor.is_active:
        await scheduler.add_job(monitor)

    return monitor


@router.get("/{monitor_id}", response_model=MonitorResponse)
async def get_monitor(monitor_id: int, db: AsyncSession = Depends(get_db)):
    monitor = await db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(404, "Monitor not found")
    return monitor


@router.put("/{monitor_id}", response_model=MonitorResponse)
async def update_monitor(
    monitor_id: int, body: MonitorUpdate, db: AsyncSession = Depends(get_db)
):
    monitor = await db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(404, "Monitor not found")

    update_data = body.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(monitor, k, v)
    await db.commit()
    await db.refresh(monitor)

    from app.services.monitor_scheduler import scheduler

    await scheduler.remove_job(monitor_id)
    if monitor.is_active:
        await scheduler.add_job(monitor)

    return monitor


@router.delete("/{monitor_id}", status_code=204)
async def delete_monitor(monitor_id: int, db: AsyncSession = Depends(get_db)):
    monitor = await db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(404, "Monitor not found")

    from app.services.monitor_scheduler import scheduler

    await scheduler.remove_job(monitor_id)
    await db.delete(monitor)
    await db.commit()


@router.post("/{monitor_id}/check", response_model=dict)
async def trigger_check(monitor_id: int, db: AsyncSession = Depends(get_db)):
    monitor = await db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(404, "Monitor not found")

    from app.services.check_runner import run_check

    result = await run_check(monitor)
    return {"status": "completed", "result": result}
