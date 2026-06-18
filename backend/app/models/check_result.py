from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class CheckResult(Base):
    __tablename__ = "check_results"
    # Speeds up the retention purge (WHERE checked_at < cutoff) and the stats
    # queries that filter/sort by (monitor_id, checked_at).
    __table_args__ = (
        Index("ix_check_results_monitor_checked", "monitor_id", "checked_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    monitor_id: Mapped[int] = mapped_column(Integer, ForeignKey("monitors.id"), nullable=False)
    is_success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    dns_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
