import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface Props {
  total: number;
  active: number;
  healthy: number;
  unhealthy: number;
}

export default function QuickStats({ total, active, healthy, unhealthy }: Props) {
  const { t } = useTranslation('dashboard');

  const stats = [
    { label: t('totalMonitors'), value: total, color: 'bg-blue-500' },
    { label: t('activeMonitors'), value: active, color: 'bg-indigo-500' },
    { label: t('healthyMonitors'), value: healthy, color: 'bg-green-500' },
    { label: t('unhealthyMonitors'), value: unhealthy, color: 'bg-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${stat.color}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
