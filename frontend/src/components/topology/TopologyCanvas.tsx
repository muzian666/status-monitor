import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import { tracerouteApi } from '../../api/traceroute';
import { topologyApi } from '../../api/topology';
import { useStore } from '../../store';
import AutoTracePanel from './AutoTracePanel';
import ManualEditor from './ManualEditor';
import MonitorNode from './nodes/MonitorNode';
import SourceNode from './nodes/SourceNode';
import HopNode from './nodes/HopNode';
import TargetNode from './nodes/TargetNode';
import AnimatedEdge from './edges/AnimatedEdge';
import { zigzagLayout } from '../../utils/layout';

interface Props {
  mode: 'auto' | 'manual';
}

const nodeTypes = {
  source: SourceNode,
  monitor: MonitorNode,
  target: TargetNode,
  hop: HopNode,
  custom: MonitorNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

function TopologyCanvasInner({ mode }: Props) {
  const { t } = useTranslation('topology');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [targetHost, setTargetHost] = useState('');
  const [tracing, setTracing] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const tracerouteHops = useStore((s) => s.tracerouteHops);
  const { fitView } = useReactFlow();

  const autoFitRef = useRef(false);
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;
  const fitViewTimer = useRef<ReturnType<typeof setTimeout>>();

  // Refs to access current nodes/edges in async callbacks without stale closures
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Auto-fit view — only during active tracing
  useEffect(() => {
    if (nodes.length === 0 || !autoFitRef.current) return;
    clearTimeout(fitViewTimer.current);
    fitViewTimer.current = setTimeout(() => {
      fitViewRef.current({ padding: 0.15, duration: 300 });
    }, 100);
    return () => clearTimeout(fitViewTimer.current);
  }, [nodes]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => eds.concat(params as Edge)),
    [setEdges]
  );

  useEffect(() => {
    if (mode === 'manual') loadManualGraph();
  }, [mode]);

  // Build topology from WebSocket hops in real-time with U-shape layout
  useEffect(() => {
    if (!currentRunId || !tracing) return;
    const hops = tracerouteHops[currentRunId] || [];
    if (hops.length === 0) return;

    const rawNodes: Node[] = [
      {
        id: 'source',
        type: 'source',
        position: { x: 0, y: 0 },
        data: { label: t('thisMachine') },
      },
    ];

    const newEdges: Edge[] = [];
    let prevId = 'source';

    hops.forEach((hop) => {
      const nodeId = `hop-${hop.hop_number}`;
      rawNodes.push({
        id: nodeId,
        type: 'hop',
        position: { x: 0, y: 0 },
        data: {
          label: (hop as any).hostname || hop.ip_address || '*',
          ip: hop.ip_address,
          hostname: (hop as any).hostname,
          hop_number: hop.hop_number,
          latency_ms: hop.latency_ms,
          is_timeout: hop.is_timeout,
          hop_type: (hop as any).hop_type,
        },
      });
      newEdges.push({
        id: `edge-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        type: 'animated',
        animated: !hop.is_timeout,
        data: { latency_ms: hop.latency_ms, is_timeout: hop.is_timeout },
      });
      prevId = nodeId;
    });

    const { nodes: laidOutNodes, edges: laidOutEdges } = zigzagLayout(rawNodes, newEdges);
    setNodes(laidOutNodes);
    setEdges(laidOutEdges);
  }, [tracerouteHops, currentRunId, tracing, t, setNodes, setEdges]);

  const loadManualGraph = async () => {
    try {
      const graph = await topologyApi.getGraph();
      const flowNodes: Node[] = graph.nodes.map((n) => ({
        id: `node-${n.id}`,
        type: 'custom',
        position: { x: n.x_position, y: n.y_position },
        data: {
          label: n.name,
          ip: n.ip_address,
          nodeType: n.node_type,
          status: n.status,
          latency: n.latency_ms,
        },
      }));
      const flowEdges: Edge[] = graph.links.map((l) => ({
        id: `link-${l.id}`,
        source: `node-${l.source_node_id}`,
        target: `node-${l.target_node_id}`,
        type: 'animated',
        animated: true,
        data: { label: l.label, latency: l.latency_ms, status: l.status },
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch {
      // no manual graph yet
    }
  };

  const handleTrace = async () => {
    if (!targetHost.trim()) return;
    autoFitRef.current = true;
    setTracing(true);
    setNodes([]);
    setEdges([]);
    setCurrentRunId(null);

    setNodes([
      {
        id: 'source',
        type: 'source',
        position: { x: 0, y: 0 },
        data: { label: t('thisMachine') },
      },
    ]);

    try {
      const result = await tracerouteApi.run(targetHost);
      const runId = result.run_id;
      setCurrentRunId(runId);

      const pollInterval = setInterval(async () => {
        try {
          const run = await tracerouteApi.getRun(runId);
          if (run.status !== 'running') {
            clearInterval(pollInterval);
            autoFitRef.current = false;

            // Append target node to existing layout
            const isFailed = run.status === 'failed';
            const lastNodeId = nodesRef.current.length > 0
              ? nodesRef.current[nodesRef.current.length - 1].id
              : 'source';

            const targetNode: Node = {
              id: 'target',
              type: 'target',
              position: { x: 0, y: 0 },
              data: {
                label: targetHost,
                ip: targetHost,
                is_failed: isFailed,
                reached: run.status === 'completed' && !isFailed,
              },
            };
            const targetEdge: Edge = {
              id: `edge-${lastNodeId}-target`,
              source: lastNodeId,
              target: 'target',
              type: 'animated',
              animated: !isFailed,
              data: { is_timeout: isFailed },
            };

            const allNodes = [...nodesRef.current, targetNode];
            const allEdges = [...edgesRef.current, targetEdge];
            const { nodes: laidOutNodes, edges: laidOutEdges } = zigzagLayout(allNodes, allEdges);
            setNodes(laidOutNodes);
            setEdges(laidOutEdges);
            setTracing(false);

            // One final fit to show complete path
            setTimeout(() => fitViewRef.current({ padding: 0.15, duration: 400 }), 50);
          }
        } catch {
          clearInterval(pollInterval);
          autoFitRef.current = false;
          setTracing(false);
        }
      }, 2000);
    } catch (err) {
      console.error('Traceroute failed:', err);
      autoFitRef.current = false;
      setTracing(false);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)]">
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-left"
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'source') return '#3b82f6';
              if (n.type === 'target') return '#22c55e';
              if (n.type === 'hop') return '#f59e0b';
              return '#94a3b8';
            }}
            style={{ borderRadius: '8px' }}
          />
        </ReactFlow>
      </div>
      <div className="w-80 space-y-4">
        {mode === 'auto' ? (
          <AutoTracePanel
            targetHost={targetHost}
            setTargetHost={setTargetHost}
            tracing={tracing}
            onTrace={handleTrace}
          />
        ) : (
          <ManualEditor
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
          />
        )}
      </div>
    </div>
  );
}

export default function TopologyCanvas({ mode }: Props) {
  return (
    <ReactFlowProvider>
      <TopologyCanvasInner mode={mode} />
    </ReactFlowProvider>
  );
}
