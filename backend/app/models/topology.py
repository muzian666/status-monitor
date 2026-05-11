import enum

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NodeType(str, enum.Enum):
    SOURCE = "source"
    ROUTER = "router"
    SERVER = "server"
    CLOUD = "cloud"


class LinkType(str, enum.Enum):
    ETHERNET = "ethernet"
    WIRELESS = "wireless"
    VPN = "vpn"
    WAN = "wan"


class TopologyNode(Base):
    __tablename__ = "topology_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    node_type: Mapped[NodeType] = mapped_column(String(20), default=NodeType.SERVER)
    x_position: Mapped[float] = mapped_column(Float, default=0.0)
    y_position: Mapped[float] = mapped_column(Float, default=0.0)
    monitor_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("monitors.id"), nullable=True
    )
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)


class TopologyLink(Base):
    __tablename__ = "topology_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_node_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topology_nodes.id"), nullable=False
    )
    target_node_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topology_nodes.id"), nullable=False
    )
    link_type: Mapped[LinkType] = mapped_column(String(20), default=LinkType.ETHERNET)
    monitor_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("monitors.id"), nullable=True
    )
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
