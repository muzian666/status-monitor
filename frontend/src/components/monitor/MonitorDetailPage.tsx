import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { monitorsApi } from '../../api/monitors';
import { resultsApi } from '../../api/results';
import { useStore } from '../../store';
import { formatTime } from '../../utils/time';
import type { Monitor, MonitorStats, DowntimePeriod } from '../../types/monitor';
import LiveChart from './LiveChart';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

export default function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('monitor');
  const latestResult = useStore((s) => s.latestResults[Number(id)]);

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [downtimes, setDowntimes] = useState<DowntimePeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    if (!id) return;
    const [m, s, d] = await Promise.all([
      monitorsApi.get(Number(id)).catch(() => null),
      resultsApi.stats(Number(id)).catch(() => null),
      resultsApi.downtimes(Number(id)).catch(() => []),
    ]);
    if (m) setMonitor(m);
    if (s) setStats(s);
    setDowntimes(d);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (!latestResult || !id) return;
    resultsApi.stats(Number(id)).then((s) => s && setStats(s)).catch(() => {});
    resultsApi.downtimes(Number(id)).then((d) => setDowntimes(d)).catch(() => {});
  }, [latestResult, id]);

  const handleTrigger = async () => {
    if (!id) return;
    await monitorsApi.triggerCheck(Number(id));
  };

  if (loading || !monitor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const isSuccess = latestResult?.is_success ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/monitors')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr;
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{monitor.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{monitor.target}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isSuccess === null ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
            isSuccess ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {isSuccess === null ? '-' : isSuccess ? t('common.success', { ns: 'common' }) : t('common.failed', { ns: 'common' })}
          </div>
        </div>
        <button
          onClick={handleTrigger}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
        >
          {t('detail.triggerCheck')}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t('detail.lastCheck'), value: formatTime(latestResult?.checked_at) },
          { label: t('detail.currentLatency'), value: latestResult?.latency_ms != null ? `${latestResult.latency_ms.toFixed(1)}ms` : '-' },
          { label: t('detail.avgLatency'), value: stats?.avg_latency_ms != null ? `${stats.avg_latency_ms.toFixed(1)}ms` : '-' },
          { label: t('detail.uptimePercent'), value: stats ? `${stats.uptime_percent}%` : '-' },
          { label: 'P95', value: stats?.p95_latency_ms != null ? `${stats.p95_latency_ms.toFixed(1)}ms` : '-' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{item.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('detail.latencyChart')}
        </h2>
        <LiveChart monitorId={Number(id)} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('detail.downtimeTitle')}
        </h2>
        {downtimes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            {t('detail.noDowntime')}
          </p>
        ) : (
          <div className="space-y-3">
            {downtimes.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  d.recovered_at ? 'bg-red-400' : 'bg-red-600 animate-pulse'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatTime(d.started_at)}
                    </span>
                    <span className="text-gray-400">&rarr;</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {d.recovered_at ? formatTime(d.recovered_at) : t('detail.ongoing')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {t('detail.duration')}: {d.duration_seconds != null ? formatDuration(d.duration_seconds) : t('detail.ongoing')}
                    </span>
                    {d.error_message && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {d.error_message}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
