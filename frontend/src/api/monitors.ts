import api from './client';
import type { Monitor, MonitorCreate, MonitorUpdate } from '../types/monitor';

export const monitorsApi = {
  list: (params?: { protocol?: string; is_active?: boolean }) =>
    api.get<Monitor[]>('/monitors', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Monitor>(`/monitors/${id}`).then((r) => r.data),

  create: (data: MonitorCreate) =>
    api.post<Monitor>('/monitors', data).then((r) => r.data),

  update: (id: number, data: MonitorUpdate) =>
    api.put<Monitor>(`/monitors/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/monitors/${id}`),

  triggerCheck: (id: number) =>
    api.post(`/monitors/${id}/check`).then((r) => r.data),
};
