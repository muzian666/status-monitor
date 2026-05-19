import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface Props {
  total: number;
  active: number;
  healthy: number;
  unhealthy: number;
}

function Ring({ value, max, color, size = 64, strokeWidth = 5 }: {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        className="stroke-gray-200 dark:stroke-gray-700"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
}

function CounterRing({ value, label, color, sub }: {
  value: number;
  label: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[100px]">
      <div className="relative">
        <Ring value={value} max={Math.max(value, 1)} color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900 dark:text-white">{value}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

export default function QuickStats({ total, active, healthy, unhealthy }: Props) {
  const { t } = useTranslation('dashboard');
  const uptimePct = active > 0 ? Math.round((healthy / active) * 100) : 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-6 py-5">
      <div className="flex items-center justify-around flex-wrap gap-4">
        <CounterRing
          value={total}
          label={t('totalMonitors')}
          color="#6366f1"
        />
        <CounterRing
          value={active}
          label={t('activeMonitors')}
          color="#3b82f6"
        />
        <CounterRing
          value={healthy}
          label={t('healthyMonitors')}
          color="#22c55e"
        />
        <CounterRing
          value={unhealthy}
          label={t('unhealthyMonitors')}
          color={unhealthy > 0 ? '#ef4444' : '#94a3b8'}
          sub={unhealthy > 0 ? undefined : undefined}
        />

        {/* Health rate ring */}
        <div className="flex flex-col items-center gap-2 min-w-[100px]">
          <div className="relative">
            <Ring value={uptimePct} max={100} color={uptimePct >= 90 ? '#22c55e' : uptimePct >= 70 ? '#f59e0b' : '#ef4444'} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-gray-900 dark:text-white">{uptimePct}%</span>
            </div>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('healthRate')}</p>
        </div>
      </div>
    </div>
  );
}
