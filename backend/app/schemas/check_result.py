from datetime import datetime

from pydantic import BaseModel


class CheckResultResponse(BaseModel):
    id: int
    monitor_id: int
    is_success: bool
    latency_ms: float | None
    status_code: int | None
    error_message: str | None
    dns_result: str | None
    checked_at: datetime

    model_config = {"from_attributes": True}


class CheckResultCreate(BaseModel):
    monitor_id: int
    is_success: bool
    latency_ms: float | None = None
    status_code: int | None = None
    error_message: str | None = None
    dns_result: str | None = None


class MonitorStats(BaseModel):
    monitor_id: int
    total_checks: int
    success_count: int
    uptime_percent: float
    avg_latency_ms: float | None
    min_latency_ms: float | None
    max_latency_ms: float | None
    p95_latency_ms: float | None
