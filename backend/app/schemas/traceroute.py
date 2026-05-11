from datetime import datetime

from pydantic import BaseModel

from app.models.traceroute import TracerouteStatus


class TracerouteRunRequest(BaseModel):
    target_host: str


class TracerouteHopResponse(BaseModel):
    id: int
    run_id: int
    hop_number: int
    ip_address: str | None
    hostname: str | None
    latency_ms: float | None
    is_timeout: bool

    model_config = {"from_attributes": True}


class TracerouteRunResponse(BaseModel):
    id: int
    target_host: str
    started_at: datetime
    completed_at: datetime | None
    status: TracerouteStatus
    total_hops: int | None
    hops: list[TracerouteHopResponse] = []

    model_config = {"from_attributes": True}


class TracerouteRunSummary(BaseModel):
    id: int
    target_host: str
    started_at: datetime
    status: TracerouteStatus
    total_hops: int | None

    model_config = {"from_attributes": True}
