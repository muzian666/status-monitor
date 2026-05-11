import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';

export default function HopNode({ data }: NodeProps) {
  const isTimeout = data.is_timeout as boolean;
  const hopNumber = data.hop_number as number;
  const ip = data.ip as string;
  const latency = data.latency_ms as number | undefined;
  const label = data.label as string;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`px-3 py-2 rounded-lg shadow-md border-2 min-w-[130px] ${
        isTimeout
          ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-500'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-600'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-gray-300" />
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          isTimeout ? 'bg-gray-200 dark:bg-gray-600 text-gray-500' : 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300'
        }`}>
          #{hopNumber}
        </span>
        <div>
          <p className={`text-xs font-medium ${
            isTimeout ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'
          }`}>
            {isTimeout ? '* * *' : (label || ip || 'Unknown')}
          </p>
          {latency != null && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
              {latency.toFixed(1)}ms
            </p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-gray-300" />
    </motion.div>
  );
}
