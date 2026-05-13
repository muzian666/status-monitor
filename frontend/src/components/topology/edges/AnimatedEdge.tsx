import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const latency = data?.latency_ms as number | undefined;
  const isTimeout = data?.is_timeout as boolean | undefined;

  const strokeColor = isTimeout
    ? '#ef4444'
    : latency == null
    ? '#94a3b8'
    : latency < 10
    ? '#22c55e'
    : latency < 50
    ? '#eab308'
    : latency < 100
    ? '#f97316'
    : '#ef4444';

  const animDuration = isTimeout ? 3 : latency ? Math.max(0.5, Math.min(latency / 500, 3)) : 1.5;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: strokeColor, strokeWidth: 2, opacity: isTimeout ? 0.5 : 1 }} />
      {!isTimeout && (
        <circle r="4" fill={strokeColor} opacity={0.9}>
          <animateMotion
            dur={`${animDuration}s`}
            repeatCount="indefinite"
            path={edgePath}
          />
          <animate
            attributeName="r"
            values="3;5;3"
            dur={`${animDuration}s`}
            repeatCount="indefinite"
          />
        </circle>
      )}
      {latency != null && !isTimeout && (
        <g transform={`translate(${(sourceX + targetX) / 2 - 20}, ${(sourceY + targetY) / 2 - 8})`}>
          <rect rx="4" ry="4" width="40" height="16" fill="white" stroke={strokeColor} strokeWidth="1" opacity="0.9" />
          <text x="20" y="12" textAnchor="middle" fontSize="9" fill={strokeColor} fontWeight="600">
            {latency.toFixed(0)}ms
          </text>
        </g>
      )}
      {isTimeout && (
        <g transform={`translate(${(sourceX + targetX) / 2 - 24}, ${(sourceY + targetY) / 2 - 8})`}>
          <rect rx="4" ry="4" width="48" height="16" fill="#fef2f2" stroke="#ef4444" strokeWidth="1" />
          <text x="24" y="12" textAnchor="middle" fontSize="9" fill="#ef4444" fontWeight="600">
            TIMEOUT
          </text>
        </g>
      )}
    </>
  );
}
