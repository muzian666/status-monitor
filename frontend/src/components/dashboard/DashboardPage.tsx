import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { monitorsApi } from '../../api/monitors';
import { resultsApi } from '../../api/results';
import { useStore } from '../../store';
import MonitorCard from './MonitorCard';
import QuickStats from './QuickStats';

const PAGE_SIZES = [5, 10, 20, 50];

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const setMonitors = useStore((s) => s.setMonitors);
  const setLatestResults = useStore((s) => s.setLatestResults);
  const monitors = useStore((s) => s.monitors);
  const latestResults = useStore((s) => s.latestResults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(safeMonitors.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pagedMonitors = useMemo(
    () => safeMonitors.slice((safePage - 1) * pageSize, safePage * pageSize),
    [safeMonitors, safePage, pageSize]
  );

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
        {pagedMonitors.map((monitor, i) => (
          <MonitorCard key={monitor.id} monitor={monitor} index={i} />
        ))}
      </div>

      {safeMonitors.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('noData', { ns: 'common' })}
        </div>
      )}

      {/* Pagination */}
      {safeMonitors.length > 0 && (
        <div className="flex items-center justify-between px-1 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{tc('total', { count: safeMonitors.length })}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} {tc('perPage')}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {tc('prev')}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {tc('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
