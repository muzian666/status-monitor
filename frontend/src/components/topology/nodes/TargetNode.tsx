import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';

export default function TargetNode({ data }: NodeProps) {
  const label = data.label as string;
  const ip = data.ip as string;
  const isFailed = data.is_failed as boolean;
  const reached = data.reached as boolean;

  const borderColor = isFailed
    ? 'border-red-400 dark:border-red-600'
    : 'border-green-400 dark:border-green-600';
  const bg = isFailed
    ? 'bg-red-50 dark:bg-red-900/20'
    : 'bg-green-50 dark:bg-green-900/20';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`px-4 py-3 rounded-xl shadow-lg border-2 ${borderColor} ${bg} min-w-[160px]`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-gray-300" />
      <div className="flex items-center gap-2">
        <span className="text-lg">{isFailed ? '❌' : '✅'}</span>
        <div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isFailed ? 'bg-red-500' : 'bg-green-500'}`} />
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{label}</p>
          </div>
          {ip && <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{ip}</p>}
          <p className={`text-[10px] mt-0.5 font-medium ${isFailed ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
            {isFailed ? 'Unreachable' : 'Reached'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
