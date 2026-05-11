export type Protocol = 'ping' | 'http' | 'https' | 'tcp' | 'dns';

export interface Monitor {
  id: number;
  name: string;
  protocol: Protocol;
  target: string;
  port: number | null;
  interval_seconds: number;
  timeout_seconds: number;
  is_active: boolean;
  expected_status: number | null;
  dns_record_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitorCreate {
  name: string;
  protocol: Protocol;
  target: string;
  port?: number | null;
  interval_seconds?: number;
  timeout_seconds?: number;
  is_active?: boolean;
  expected_status?: number | null;
  dns_record_type?: string | null;
}

export interface MonitorUpdate {
  name?: string;
  protocol?: Protocol;
  target?: string;
  port?: number | null;
  interval_seconds?: number;
  timeout_seconds?: number;
  is_active?: boolean;
  expected_status?: number | null;
  dns_record_type?: string | null;
}

export interface CheckResult {
  id: number;
  monitor_id: number;
  is_success: boolean;
  latency_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  dns_result: string | null;
  checked_at: string;
}

export interface MonitorStats {
  monitor_id: number;
  total_checks: number;
  success_count: number;
  uptime_percent: number;
  avg_latency_ms: number | null;
  min_latency_ms: number | null;
  max_latency_ms: number | null;
  p95_latency_ms: number | null;
}
