export type WSMessageType =
  | 'check_result'
  | 'status_change'
  | 'traceroute_hop'
  | 'traceroute_complete'
  | 'topology_status';

export interface WSMessage {
  type: WSMessageType;
  data: Record<string, unknown>;
}
