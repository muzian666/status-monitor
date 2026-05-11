import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
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
import AnimatedEdge from './edges/AnimatedEdge';

interface Props {
  mode: 'auto' | 'manual';
}

const nodeTypes = {
  source: SourceNode,
  monitor: MonitorNode,
  target: MonitorNode,
  hop: HopNode,
  custom: MonitorNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

export default function TopologyCanvas({ mode }: Props) {
  const { t } = useTranslation('topology');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [targetHost, setTargetHost] = useState('');
  const [tracing, setTracing] = useState(false);
  const addTracerouteHop = useStore((s) => s.addTracerouteHop);
  const setCurrentTraceRunId = useStore((s) => s.setCurrentTraceRunId);
  const tracerouteHops = useStore((s) => s.tracerouteHops);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    if (mode === 'manual') {
      loadManualGraph();
    }
  }, [mode]);

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
    setTracing(true);
    setNodes([]);
    setEdges([]);

    const sourceNode: Node = {
      id: 'source',
      type: 'source',
      position: { x: 400, y: 0 },
      data: { label: t('thisMachine') },
    };
    setNodes([sourceNode]);

    try {
      const run = await tracerouteApi.run(targetHost);
      setCurrentTraceRunId(run.id);

      const flowData = await tracerouteApi.getTopology(run.id);
      const flowNodes = flowData.nodes.map((n: any) => ({
        ...n,
        type: n.type === 'source' ? 'source' : n.type === 'target' ? 'monitor' : 'hop',
      }));
      const flowEdges = flowData.edges.map((e: any) => ({
        ...e,
        type: 'animated',
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error('Traceroute failed:', err);
    } finally {
      setTracing(false);
      setCurrentTraceRunId(null);
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
          attributionPosition="bottom-left"
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'source') return '#3b82f6';
              if (n.type === 'hop') return '#f59e0b';
              return '#22c55e';
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
