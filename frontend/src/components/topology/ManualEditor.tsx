import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { topologyApi } from '../../api/topology';
import type { Node, Edge } from '@xyflow/react';

interface Props {
  nodes: Node[];
  setNodes: (nodes: Node[]) => void;
  edges: Edge[];
  setEdges: (edges: Edge[]) => void;
}

export default function ManualEditor({ setNodes, setEdges }: Props) {
  const { t } = useTranslation('topology');
  const [nodeName, setNodeName] = useState('');
  const [nodeIp, setNodeIp] = useState('');
  const [nodeType, setNodeType] = useState<'source' | 'router' | 'server' | 'cloud'>('server');
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  const handleAddNode = async () => {
    if (!nodeName.trim()) return;
    const node = await topologyApi.createNode({
      name: nodeName,
      ip_address: nodeIp || null,
      node_type: nodeType,
      x_position: Math.random() * 600,
      y_position: Math.random() * 400,
    });
    setNodes([]);
    // Reload from backend
    const graph = await topologyApi.getGraph();
    const flowNodes = graph.nodes.map((n) => ({
      id: `node-${n.id}`,
      type: 'custom' as const,
      position: { x: n.x_position, y: n.y_position },
      data: { label: n.name, ip: n.ip_address, nodeType: n.node_type },
    }));
    setNodes(flowNodes);
    setNodeName('');
    setNodeIp('');
  };

  const handleAddLink = async () => {
    if (!sourceId || !targetId) return;
    await topologyApi.createLink({
      source_node_id: parseInt(sourceId),
      target_node_id: parseInt(targetId),
    });
    const graph = await topologyApi.getGraph();
    const flowEdges = graph.links.map((l) => ({
      id: `link-${l.id}`,
      source: `node-${l.source_node_id}`,
      target: `node-${l.target_node_id}`,
      type: 'animated' as const,
      animated: true,
      data: { label: l.label },
    }));
    setEdges(flowEdges);
    setSourceId('');
    setTargetId('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('addNode')}</h3>
        <input
          type="text"
          value={nodeName}
          onChange={(e) => setNodeName(e.target.value)}
          placeholder="Name"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
        <input
          type="text"
          value={nodeIp}
          onChange={(e) => setNodeIp(e.target.value)}
          placeholder="IP Address (optional)"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
        <select
          value={nodeType}
          onChange={(e) => setNodeType(e.target.value as typeof nodeType)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          {(['source', 'router', 'server', 'cloud'] as const).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={handleAddNode}
          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
        >
          {t('addNode')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('addLink')}</h3>
        <input
          type="number"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder="Source Node ID"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
        <input
          type="number"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder="Target Node ID"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
        <button
          onClick={handleAddLink}
          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
        >
          {t('addLink')}
        </button>
      </div>
    </div>
  );
}
