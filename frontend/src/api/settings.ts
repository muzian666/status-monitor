import api from './client';
import type { Setting } from '../types/settings';

export const settingsApi = {
  list: (): Promise<Setting[]> => api.get('/settings').then((r) => r.data),
  update: (updates: Record<string, number>): Promise<Setting[]> =>
    api.put('/settings', updates).then((r) => r.data),
};
