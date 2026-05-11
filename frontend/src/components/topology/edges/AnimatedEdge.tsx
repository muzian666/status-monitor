import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

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
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const latency = data?.latency as number | undefined;
  const status = data?.status as string | undefined;

  const strokeColor = status === 'up'
    ? '#22c55e'
    : status === 'down'
    ? '#ef4444'
    : '#94a3b8';

  const animDuration = latency ? Math.max(0.5, Math.min(latency / 1000, 3)) : 1.5;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: strokeColor, strokeWidth: 2 }} />
      <circle r="4" fill={strokeColor}>
        <animateMotion
          dur={`${animDuration}s`}
          repeatCount="indefinite"
          path={edgePath}
        />
        <animate
          attributeName="opacity"
          values="1;0.3;1"
          dur={`${animDuration}s`}
          repeatCount="indefinite"
        />
      </circle>
      {latency != null && (
        <text
          style={{
            fontSize: 10,
            fill: '#6b7280',
            textAnchor: 'middle',
          }}
        >
          <textPath href={`#${id}`} startOffset="50%" />
        </text>
      )}
    </>
  );
}
