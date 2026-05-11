import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { monitorsApi } from '../../api/monitors';
import { resultsApi } from '../../api/results';
import { useStore } from '../../store';
import MonitorCard from './MonitorCard';
import QuickStats from './QuickStats';

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const setMonitors = useStore((s) => s.setMonitors);
  const setLatestResults = useStore((s) => s.setLatestResults);
  const monitors = useStore((s) => s.monitors);
  const latestResults = useStore((s) => s.latestResults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      monitorsApi.list().catch(() => []),
      resultsApi.latestAll().catch(() => ({})),
    ])
      .then(([monitorData, latestData]) => {
        setMonitors(Array.isArray(monitorData) ? monitorData : []);
        setLatestResults(latestData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setMonitors, setLatestResults]);

  const safeMonitors = Array.isArray(monitors) ? monitors : [];
  const activeCount = safeMonitors.filter((m) => m.is_active).length;
  const healthyCount = safeMonitors.filter((m) => {
    const result = latestResults[m.id];
    return result?.is_success;
  }).length;
  const unhealthyCount = activeCount - healthyCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-gray-900 dark:text-white"
      >
        {t('title')}
      </motion.h1>

      <QuickStats
        total={safeMonitors.length}
        active={activeCount}
        healthy={healthyCount}
        unhealthy={unhealthyCount}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {safeMonitors.map((monitor, i) => (
          <MonitorCard key={monitor.id} monitor={monitor} index={i} />
        ))}
      </div>

      {safeMonitors.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('noData', { ns: 'common' })}
        </div>
      )}
    </div>
  );
}
