import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { monitorsApi } from '../../api/monitors';
import { resultsApi } from '../../api/results';
import { useStore } from '../../store';
import type { Monitor, MonitorStats } from '../../types/monitor';
import LiveChart from './LiveChart';

export default function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('monitor');
  const latestResult = useStore((s) => s.latestResults[Number(id)]);

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [m, s] = await Promise.all([
        monitorsApi.get(Number(id)),
        resultsApi.stats(Number(id)).catch(() => null),
      ]);
      setMonitor(m);
      setStats(s);
      setLoading(false);
    };
    load();
  }, [id]);

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('detail.lastCheck'), value: latestResult?.latency_ms != null ? `${latestResult.latency_ms.toFixed(1)}ms` : '-' },
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
    </div>
  );
}
