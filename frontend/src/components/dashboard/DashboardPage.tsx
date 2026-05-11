import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { monitorsApi } from '../../api/monitors';
import { useStore } from '../../store';
import type { Monitor } from '../../types/monitor';
import MonitorCard from './MonitorCard';
import QuickStats from './QuickStats';

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const setMonitors = useStore((s) => s.setMonitors);
  const monitors = useStore((s) => s.monitors);
  const latestResults = useStore((s) => s.latestResults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    monitorsApi.list().then((data) => {
      setMonitors(data);
      setLoading(false);
    });
  }, [setMonitors]);

  const activeCount = monitors.filter((m) => m.is_active).length;
  const healthyCount = monitors.filter((m) => {
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
        total={monitors.length}
        active={activeCount}
        healthy={healthyCount}
        unhealthy={unhealthyCount}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {monitors.map((monitor, i) => (
          <MonitorCard key={monitor.id} monitor={monitor} index={i} />
        ))}
      </div>

      {monitors.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('noData', { ns: 'common' })}
        </div>
      )}
    </div>
  );
}
