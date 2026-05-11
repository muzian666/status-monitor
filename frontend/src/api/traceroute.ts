import api from './client';
import type { TracerouteRun } from '../types/topology';

export const tracerouteApi = {
  run: (targetHost: string) =>
    api.post<TracerouteRun>('/traceroute/run', { target_host: targetHost }).then((r) => r.data),

  listRuns: (limit = 20) =>
    api.get<TracerouteRun[]>('/traceroute/runs', { params: { limit } }).then((r) => r.data),

  getRun: (runId: number) =>
    api.get<TracerouteRun>(`/traceroute/runs/${runId}`).then((r) => r.data),

  getTopology: (runId: number) =>
    api.get(`/traceroute/runs/${runId}/topology`).then((r) => r.data),
};
