from pydantic import BaseModel

from app.models.topology import LinkType, NodeType


class TopologyNodeCreate(BaseModel):
    name: str
    ip_address: str | None = None
    node_type: NodeType = NodeType.SERVER
    x_position: float = 0.0
    y_position: float = 0.0
    monitor_id: int | None = None
    metadata_json: str | None = None


class TopologyNodeUpdate(BaseModel):
    name: str | None = None
    ip_address: str | None = None
    node_type: NodeType | None = None
    x_position: float | None = None
    y_position: float | None = None
    monitor_id: int | None = None
    metadata_json: str | None = None


class TopologyNodeResponse(BaseModel):
    id: int
    name: str
    ip_address: str | None
    node_type: NodeType
    x_position: float
    y_position: float
    monitor_id: int | None
    metadata_json: str | None
    status: str | None = None
    latency_ms: float | None = None

    model_config = {"from_attributes": True}


class TopologyLinkCreate(BaseModel):
    source_node_id: int
    target_node_id: int
    link_type: LinkType = LinkType.ETHERNET
    monitor_id: int | None = None
    label: str | None = None


class TopologyLinkUpdate(BaseModel):
    link_type: LinkType | None = None
    monitor_id: int | None = None
    label: str | None = None


class TopologyLinkResponse(BaseModel):
    id: int
    source_node_id: int
    target_node_id: int
    link_type: LinkType
    monitor_id: int | None
    label: str | None
    status: str | None = None
    latency_ms: float | None = None

    model_config = {"from_attributes": True}


class TopologyGraph(BaseModel):
    nodes: list[TopologyNodeResponse]
    links: list[TopologyLinkResponse]
