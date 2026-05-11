import api from './client';
import type { CheckResult, MonitorStats } from '../types/monitor';

export const resultsApi = {
  list: (monitorId: number, params?: { limit?: number; offset?: number }) =>
    api.get<CheckResult[]>(`/results/monitor/${monitorId}`, { params }).then((r) => r.data),

  latest: (monitorId: number, limit = 20) =>
    api.get<CheckResult[]>(`/results/monitor/${monitorId}/latest`, { params: { limit } }).then((r) => r.data),

  stats: (monitorId: number, hours = 24) =>
    api.get<MonitorStats>(`/results/monitor/${monitorId}/stats`, { params: { hours } }).then((r) => r.data),

  latestAll: () =>
    api.get<Record<number, CheckResult>>('/results/latest-all').then((r) => r.data),
};
