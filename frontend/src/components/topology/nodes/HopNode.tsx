import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  gateway: {
    icon: '🏠',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  lan: {
    icon: '🔗',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
  },
  transit: {
    icon: '🌍',
    color: 'text-cyan-700 dark:text-cyan-300',
    bg: 'bg-cyan-100 dark:bg-cyan-900/40',
  },
  target: {
    icon: '🎯',
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/40',
  },
  unknown: {
    icon: '❓',
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-200 dark:bg-gray-700',
  },
};

export default function HopNode({ data }: NodeProps) {
  const { t } = useTranslation('topology');
  const isTimeout = data.is_timeout as boolean;
  const hopNumber = data.hop_number as number;
  const ip = data.ip as string | undefined;
  const hostname = data.hostname as string | undefined;
  const latency = data.latency_ms as number | undefined;
  const label = data.label as string;
  const hopType = (data.hop_type as string) || 'unknown';
  const tc = TYPE_CONFIG[hopType] || TYPE_CONFIG.unknown;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`px-4 py-3 rounded-xl shadow-md border-2 min-w-[170px] ${
        isTimeout
          ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-gray-300" />

      <div className="space-y-1.5">
        {/* Header: hop number + type badge + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              #{hopNumber}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tc.bg} ${tc.color}`}>
              {tc.icon} {t(`node_type.${hopType}`, hopType)}
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full ${isTimeout ? 'bg-red-500' : 'bg-green-500'}`} />
        </div>

        {/* Main info */}
        {isTimeout ? (
          <p className="text-sm font-medium text-red-500 dark:text-red-400">* * * Request timed out</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {hostname || ip || 'Unknown'}
            </p>
            {hostname && ip && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{ip}</p>
            )}
          </>
        )}

        {/* Latency bar */}
        {latency != null && !isTimeout && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className={`text-xs font-mono font-semibold ${
              latency < 10 ? 'text-green-600 dark:text-green-400' :
              latency < 50 ? 'text-yellow-600 dark:text-yellow-400' :
              latency < 100 ? 'text-orange-500' :
              'text-red-500'
            }`}>
              {latency.toFixed(1)}ms
            </span>
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  latency < 10 ? 'bg-green-500' :
                  latency < 50 ? 'bg-yellow-500' :
                  latency < 100 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(latency / 2, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-gray-300" />
    </motion.div>
  );
}
