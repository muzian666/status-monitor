import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';

export default function MonitorNode({ data }: NodeProps) {
  const label = data.label as string;
  const ip = data.ip as string;
  const status = data.status as string | undefined;
  const latency = data.latency as number | undefined;
  const nodeType = data.nodeType as string | undefined;

  const statusColor = status === 'up' ? 'bg-green-500' : status === 'down' ? 'bg-red-500' : 'bg-gray-400';
  const borderColor = status === 'up' ? 'border-green-400 dark:border-green-600' : status === 'down' ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
  const bg = status === 'up' ? 'bg-green-50 dark:bg-green-900/10' : status === 'down' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800';

  const icons: Record<string, string> = {
    source: '💻',
    router: '📡',
    server: '🖥️',
    cloud: '☁️',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`px-4 py-3 rounded-xl shadow-lg border-2 ${borderColor} ${bg} min-w-[150px]`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-gray-300" />
      <div className="flex items-center gap-2">
        <span className="text-lg">{icons[nodeType || 'server'] || '🖥️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{label}</p>
          </div>
          {ip && <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{ip}</p>}
          {latency != null && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
              {latency.toFixed(1)}ms
            </p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-gray-300" />
    </motion.div>
  );
}
