import { Handle, Position, type NodeProps } from '@xyflow/react';

export default function SourceNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-3 rounded-xl bg-blue-500 text-white shadow-lg border-2 border-blue-600 min-w-[140px]">
      <div className="flex items-center gap-2">
        <span className="text-lg">💻</span>
        <div>
          <p className="font-semibold text-sm">{data.label as string}</p>
          <p className="text-xs text-blue-200">localhost</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="source-bottom" />
      <Handle type="source" position={Position.Right} id="source-right" />
    </div>
  );
}
