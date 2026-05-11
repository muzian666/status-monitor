from datetime import datetime

from pydantic import BaseModel, Field

from app.models.monitor import Protocol


class MonitorCreate(BaseModel):
    name: str = Field(..., max_length=200)
    protocol: Protocol
    target: str = Field(..., max_length=500)
    port: int | None = None
    interval_seconds: int = 30
    timeout_seconds: float = 5.0
    is_active: bool = True
    expected_status: int | None = None
    dns_record_type: str | None = None


class MonitorUpdate(BaseModel):
    name: str | None = None
    protocol: Protocol | None = None
    target: str | None = None
    port: int | None = None
    interval_seconds: int | None = None
    timeout_seconds: float | None = None
    is_active: bool | None = None
    expected_status: int | None = None
    dns_record_type: str | None = None


class MonitorResponse(BaseModel):
    id: int
    name: str
    protocol: Protocol
    target: str
    port: int | None
    interval_seconds: int
    timeout_seconds: float
    is_active: bool
    expected_status: int | None
    dns_record_type: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
