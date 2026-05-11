import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { resultsApi } from '../../api/results';
import { useStore } from '../../store';
import type { CheckResult } from '../../types/monitor';

interface Props {
  monitorId: number;
}

export default function LiveChart({ monitorId }: Props) {
  const [data, setData] = useState<Array<{ time: string; latency: number | null; success: boolean }>>([]);
  const storeResults = useStore((s) => s.results[monitorId]);

  useEffect(() => {
    resultsApi.latest(monitorId, 100).then((results) => {
      setData(
        results.map((r) => ({
          time: new Date(r.checked_at).toLocaleTimeString(),
          latency: r.latency_ms,
          success: r.is_success,
        }))
      );
    });
  }, [monitorId]);

  useEffect(() => {
    if (!storeResults || storeResults.length === 0) return;
    const latest = storeResults[storeResults.length - 1];
    if (!latest) return;
    setData((prev) => {
      const newPoint = {
        time: new Date(latest.checked_at).toLocaleTimeString(),
        latency: latest.latency_ms,
        success: latest.is_success,
      };
      return [...prev, newPoint].slice(-100);
    });
  }, [storeResults]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          label={{ value: 'ms', position: 'insideTopLeft', offset: -5, fill: '#9ca3af' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#f9fafb',
            fontSize: '12px',
          }}
          formatter={(value: string | number) => [typeof value === 'number' ? `${value.toFixed(1)}ms` : '-', 'Latency']}
        />
        <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="5 5" />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
