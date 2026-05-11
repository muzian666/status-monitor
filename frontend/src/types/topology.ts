export type NodeType = 'source' | 'router' | 'server' | 'cloud';
export type LinkType = 'ethernet' | 'wireless' | 'vpn' | 'wan';

export interface TopologyNode {
  id: number;
  name: string;
  ip_address: string | null;
  node_type: NodeType;
  x_position: number;
  y_position: number;
  monitor_id: number | null;
  metadata_json: string | null;
  status?: string | null;
  latency_ms?: number | null;
}

export interface TopologyNodeCreate {
  name: string;
  ip_address?: string | null;
  node_type?: NodeType;
  x_position?: number;
  y_position?: number;
  monitor_id?: number | null;
  metadata_json?: string | null;
}

export interface TopologyLink {
  id: number;
  source_node_id: number;
  target_node_id: number;
  link_type: LinkType;
  monitor_id: number | null;
  label: string | null;
  status?: string | null;
  latency_ms?: number | null;
}

export interface TopologyLinkCreate {
  source_node_id: number;
  target_node_id: number;
  link_type?: LinkType;
  monitor_id?: number | null;
  label?: string | null;
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export interface TracerouteHop {
  id: number;
  run_id: number;
  hop_number: number;
  ip_address: string | null;
  hostname: string | null;
  latency_ms: number | null;
  is_timeout: boolean;
}

export interface TracerouteRun {
  id: number;
  target_host: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  total_hops: number | null;
  hops: TracerouteHop[];
}
