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

  addResult: (data) =>
    set((state) => {
      const monitorId = data.monitor_id as number;
      const result = data as unknown as CheckResult;
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
