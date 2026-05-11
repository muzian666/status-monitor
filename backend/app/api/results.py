from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.check_result import CheckResult
from app.models.monitor import Monitor
from app.schemas.check_result import CheckResultResponse, DowntimePeriod, MonitorStats

router = APIRouter(prefix="/results", tags=["results"])


@router.get("/latest-all")
async def get_all_latest(db: AsyncSession = Depends(get_db)):
    sub = (
        select(
            CheckResult.monitor_id,
            func.max(CheckResult.id).label("max_id"),
        )
        .group_by(CheckResult.monitor_id)
        .subquery()
    )
    stmt = select(CheckResult).join(sub, CheckResult.id == sub.c.max_id)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return {
        r.monitor_id: CheckResultResponse.model_validate(r).model_dump()
        for r in rows
    }


@router.get("/monitor/{monitor_id}", response_model=list[CheckResultResponse])
async def get_results(
    monitor_id: int,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    db: AsyncSession = Depends(get_db),
):
    monitor = await db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(404, "Monitor not found")

    stmt = (
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(CheckResult.checked_at.desc())
    )
    if from_date:
        stmt = stmt.where(CheckResult.checked_at >= from_date)
    if to_date:
        stmt = stmt.where(CheckResult.checked_at <= to_date)
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/monitor/{monitor_id}/latest", response_model=list[CheckResultResponse])
async def get_latest_results(
    monitor_id: int, limit: int = Query(20, ge=1, le=200), db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(CheckResult.checked_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/monitor/{monitor_id}/stats", response_model=MonitorStats)
async def get_monitor_stats(
    monitor_id: int,
    hours: int = Query(24, ge=1, le=720),
    db: AsyncSession = Depends(get_db),
):
    monitor = await db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(404, "Monitor not found")

    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    total_stmt = select(func.count()).where(
        CheckResult.monitor_id == monitor_id, CheckResult.checked_at >= since
    )
    total_result = await db.execute(total_stmt)
    total = total_result.scalar() or 0

    success_stmt = select(func.count()).where(
        CheckResult.monitor_id == monitor_id,
        CheckResult.checked_at >= since,
        CheckResult.is_success == True,
    )
    success_result = await db.execute(success_stmt)
    success_count = success_result.scalar() or 0

    latency_stmt = select(
        func.avg(CheckResult.latency_ms),
        func.min(CheckResult.latency_ms),
        func.max(CheckResult.latency_ms),
    ).where(
        CheckResult.monitor_id == monitor_id,
        CheckResult.checked_at >= since,
        CheckResult.latency_ms.isnot(None),
    )
    lat_result = await db.execute(latency_stmt)
    avg_lat, min_lat, max_lat = lat_result.one()

    all_latencies_stmt = (
        select(CheckResult.latency_ms)
        .where(
            CheckResult.monitor_id == monitor_id,
            CheckResult.checked_at >= since,
            CheckResult.latency_ms.isnot(None),
        )
        .order_by(CheckResult.latency_ms)
    )
    lat_rows = await db.execute(all_latencies_stmt)
    latencies = [r[0] for r in lat_rows.all()]
    p95 = None
    if latencies:
        idx = int(len(latencies) * 0.95)
        p95 = latencies[min(idx, len(latencies) - 1)]

    return MonitorStats(
        monitor_id=monitor_id,
        total_checks=total,
        success_count=success_count,
        uptime_percent=round(success_count / total * 100, 2) if total else 0,
        avg_latency_ms=round(avg_lat, 2) if avg_lat else None,
        min_latency_ms=round(min_lat, 2) if min_lat else None,
        max_latency_ms=round(max_lat, 2) if max_lat else None,
        p95_latency_ms=round(p95, 2) if p95 else None,
    )


@router.get("/monitor/{monitor_id}/downtimes", response_model=list[DowntimePeriod])
async def get_downtimes(
    monitor_id: int,
    hours: int = Query(168, ge=1, le=2160),
    db: AsyncSession = Depends(get_db),
):
    monitor = await db.get(Monitor, monitor_id)
    if not monitor:
        raise HTTPException(404, "Monitor not found")

    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id, CheckResult.checked_at >= since)
        .order_by(CheckResult.checked_at.asc())
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    downtimes: list[DowntimePeriod] = []
    down_start = None
    down_error = None

    for r in rows:
        if not r.is_success:
            if down_start is None:
                down_start = r.checked_at
                down_error = r.error_message
        else:
            if down_start is not None:
                duration = (r.checked_at - down_start).total_seconds()
                downtimes.append(
                    DowntimePeriod(
                        started_at=down_start,
                        recovered_at=r.checked_at,
                        duration_seconds=duration,
                        error_message=down_error,
                    )
                )
                down_start = None
                down_error = None

    if down_start is not None:
        downtimes.append(
            DowntimePeriod(
                started_at=down_start,
                recovered_at=None,
                duration_seconds=None,
                error_message=down_error,
            )
        )

    downtimes.reverse()
    return downtimes
