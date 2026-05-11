import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TracerouteStatus(str, enum.Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TracerouteRun(Base):
    __tablename__ = "traceroute_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_host: Mapped[str] = mapped_column(String(200), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[TracerouteStatus] = mapped_column(
        String(20), default=TracerouteStatus.RUNNING
    )
    total_hops: Mapped[int | None] = mapped_column(Integer, nullable=True)


class TracerouteHop(Base):
    __tablename__ = "traceroute_hops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("traceroute_runs.id"), nullable=False
    )
    hop_number: Mapped[int] = mapped_column(Integer, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    hostname: Mapped[str | None] = mapped_column(String(200), nullable=True)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_timeout: Mapped[bool] = mapped_column(Boolean, default=False)
    hop_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
