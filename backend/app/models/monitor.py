import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Protocol(str, enum.Enum):
    PING = "ping"
    HTTP = "http"
    HTTPS = "https"
    TCP = "tcp"
    DNS = "dns"


class Monitor(Base):
    __tablename__ = "monitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    protocol: Mapped[Protocol] = mapped_column(String(10), nullable=False)
    target: Mapped[str] = mapped_column(String(500), nullable=False)
    port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interval_seconds: Mapped[int] = mapped_column(Integer, default=30)
    timeout_seconds: Mapped[float] = mapped_column(Float, default=5.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expected_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verify_tls: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true")
    )
    dns_record_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # Python-side UTC defaults (not DB CURRENT_TIMESTAMP) so timestamps are
    # correct regardless of the host/server timezone. Columns are tz-aware.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
