import { create } from 'zustand';
import type { Monitor, CheckResult } from '../types/monitor';
import type { TracerouteHop } from '../types/topology';

interface MonitorState {
  monitors: Monitor[];
  results: Record<number, CheckResult[]>;
  latestResults: Record<number, CheckResult>;
  tracerouteHops: Record<number, TracerouteHop[]>;
  currentTraceRunId: number | null;
  language: 'en' | 'zh';

  setMonitors: (monitors: Monitor[]) => void;
  setLatestResults: (results: Record<number, CheckResult>) => void;
  addResult: (data: Record<string, unknown>) => void;
  addTracerouteHop: (data: Record<string, unknown>) => void;
  completeTraceroute: (data: Record<string, unknown>) => void;
  setLanguage: (lang: 'en' | 'zh') => void;
  setResults: (monitorId: number, results: CheckResult[]) => void;
  setCurrentTraceRunId: (id: number | null) => void;
}

export const useStore = create<MonitorState>((set) => ({
  monitors: [],
  results: {},
  latestResults: {},
  tracerouteHops: {},
  currentTraceRunId: null,
  language: (localStorage.getItem('language') as 'en' | 'zh') || 'en',

  setMonitors: (monitors) => set({ monitors }),

  setLatestResults: (results) => set({ latestResults: results }),

  addResult: (data) =>
    set((state) => {
      const monitorId = data.monitor_id as number;
      const result = {
        id: data.id as number,
        monitor_id: monitorId,
        is_success: data.is_success as boolean,
        latency_ms: data.latency_ms as number | null,
        status_code: data.status_code as number | null,
        error_message: data.error_message as string | null,
        dns_result: data.dns_result as string | null,
        checked_at: data.checked_at as string,
      };
      return {
        latestResults: { ...state.latestResults, [monitorId]: result },
        results: {
          ...state.results,
          [monitorId]: [...(state.results[monitorId] || []), result].slice(-200),
        },
      };
    }),

  addTracerouteHop: (data) =>
    set((state) => {
      const runId = data.run_id as number;
      const hop = data as unknown as TracerouteHop;
      return {
        tracerouteHops: {
          ...state.tracerouteHops,
          [runId]: [...(state.tracerouteHops[runId] || []), hop],
        },
      };
    }),

  completeTraceroute: (data) =>
    set((state) => {
      const runId = data.run_id as number;
      return {
        tracerouteHops: {
          ...state.tracerouteHops,
          [runId]: state.tracerouteHops[runId] || [],
        },
        currentTraceRunId: state.currentTraceRunId === runId ? null : state.currentTraceRunId,
      };
    }),

  setLanguage: (lang) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
  },

  setResults: (monitorId, results) =>
    set((state) => ({
      results: { ...state.results, [monitorId]: results },
    })),

  setCurrentTraceRunId: (id) => set({ currentTraceRunId: id }),
}));
