import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import type { Monitor } from '../../types/monitor';

interface Props {
  monitor: Monitor;
  index: number;
}

export default function MonitorCard({ monitor, index }: Props) {
  const { t } = useTranslation('monitor');
  const navigate = useNavigate();
  const latestResult = useStore((s) => s.latestResults[monitor.id]);

  const isSuccess = latestResult?.is_success ?? null;
  const latency = latestResult?.latency_ms;

  const statusColor =
    isSuccess === null
      ? 'bg-gray-400'
      : isSuccess
      ? 'bg-green-500'
      : 'bg-red-500';

  const pulseClass =
    isSuccess === true
      ? 'animate-pulse-success'
      : isSuccess === false
      ? 'animate-pulse-danger'
      : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => navigate(`/monitors/${monitor.id}`)}
      className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusColor} ${pulseClass}`} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {monitor.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t(`protocols.${monitor.protocol}`)}
            </p>
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            monitor.is_active
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {monitor.is_active ? t('common.active', { ns: 'common' }) : t('common.inactive', { ns: 'common' })}
        </span>
      </div>
      <div className="mt-4 space-y-1.5">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{monitor.target}</p>
        {latency != null && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {t('common.latency', { ns: 'common' })}:{' '}
            <span className="font-mono font-medium">{latency.toFixed(1)}ms</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}
