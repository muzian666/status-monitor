import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { resultsApi } from '../../api/results';
import type { CheckResult } from '../../types/monitor';

interface Props {
  monitorId: number;
}

interface Block {
  startTime: number;
  endTime: number;
  successRate: number; // 0-1, -1 = no data
}

const BLOCK_MINUTES = 15;
const HOURS = 24;
const TOTAL_BLOCKS = (HOURS * 60) / BLOCK_MINUTES; // 96 blocks

const pad = (n: number) => String(n).padStart(2, '0');

function formatBlockTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function UptimeBar({ monitorId }: Props) {
  const { t } = useTranslation('monitor');
  const [results, setResults] = useState<CheckResult[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const from = new Date(Date.now() - HOURS * 3600 * 1000).toISOString();
    resultsApi
      .list(monitorId, { limit: 1000, offset: 0, from_date: from } as any)
      .then((r) => setResults(Array.isArray(r) ? r : []))
      .catch(() => {});
  }, [monitorId]);

  const now = Date.now();
  const blocks = useMemo<Block[]>(() => {
    const blockMs = BLOCK_MINUTES * 60 * 1000;
    const endTime = Math.ceil(now / blockMs) * blockMs;
    const out: Block[] = [];

    for (let i = TOTAL_BLOCKS - 1; i >= 0; i--) {
      const start = endTime - (i + 1) * blockMs;
      const end = endTime - i * blockMs;
      const inRange = results.filter(
        (r) => {
          const t = new Date(r.checked_at).getTime();
          return t >= start && t < end;
        }
      );

      if (inRange.length === 0) {
        out.push({ startTime: start, endTime: end, successRate: -1 });
      } else {
        const ok = inRange.filter((r) => r.is_success).length;
        out.push({ startTime: start, endTime: end, successRate: ok / inRange.length });
      }
    }
    return out;
  }, [results, now]);

  const successCount = blocks.filter((b) => b.successRate >= 0 && b.successRate === 1).length;
  const dataCount = blocks.filter((b) => b.successRate >= 0).length;
  const uptimePct = dataCount > 0 ? Math.round((successCount / dataCount) * 100) : -1;

  const hoveredBlock = hovered !== null ? blocks[hovered] : null;

  return (
    <div className="space-y-2">
      {/* Time labels */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 px-0.5">
        <span>{HOURS}h ago</span>
        <span>{Math.floor(HOURS / 2)}h ago</span>
        <span>now</span>
      </div>

      {/* Blocks */}
      <div className="flex gap-[2px] overflow-x-auto pb-1">
        {blocks.map((block, i) => {
          let bg: string;
          if (block.successRate < 0) {
            bg = 'bg-gray-200 dark:bg-gray-700';
          } else if (block.successRate === 1) {
            bg = 'bg-green-500';
          } else if (block.successRate >= 0.5) {
            bg = 'bg-yellow-400';
          } else {
            bg = 'bg-red-500';
          }

          return (
            <div
              key={i}
              className={`h-7 flex-1 min-w-[6px] rounded-[3px] ${bg} cursor-default transition-all ${
                hovered === i ? 'ring-2 ring-gray-500/70 dark:ring-gray-300/70 brightness-110' : ''
              }`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      <div className="flex items-center justify-between h-5">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {uptimePct >= 0
            ? t('detail.uptimeBarPercent', { percent: uptimePct })
            : t('detail.noData')}
        </div>
        {hoveredBlock && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
            {formatBlockTime(hoveredBlock.startTime)} - {formatBlockTime(hoveredBlock.endTime)}
            {hoveredBlock.successRate < 0
              ? ` · ${t('detail.uptimeNoData')}`
              : ` · ${(hoveredBlock.successRate * 100).toFixed(0)}% ${t('detail.uptimeOk')}`}
          </div>
        )}
      </div>
    </div>
  );
}
