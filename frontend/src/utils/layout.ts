import type { Node, Edge } from '@xyflow/react';

const GAP_X = 300;
const GAP_Y = 140;
const NODES_PER_COL = 5;

/**
 * Column-based U-shape loop layout.
 * Nodes fill a column top→bottom, then U-turn right and fill next column bottom→top, etc.
 */
export function zigzagLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const indexMap = new Map(nodes.map((n, i) => [n.id, i]));

  const laidOutNodes = nodes.map((node, i) => {
    const col = Math.floor(i / NODES_PER_COL);
    const posInCol = i % NODES_PER_COL;
    const isGoingUp = col % 2 === 1;
    const actualY = isGoingUp ? (NODES_PER_COL - 1 - posInCol) : posInCol;

    return {
      ...node,
      position: { x: col * GAP_X, y: actualY * GAP_Y },
    };
  });

  const laidOutEdges = edges.map((edge) => {
    const srcIdx = indexMap.get(edge.source);
    const tgtIdx = indexMap.get(edge.target);
    if (srcIdx == null || tgtIdx == null) return edge;

    const srcCol = Math.floor(srcIdx / NODES_PER_COL);
    const tgtCol = Math.floor(tgtIdx / NODES_PER_COL);

    if (srcCol === tgtCol) {
      const isGoingUp = srcCol % 2 === 1;
      return {
        ...edge,
        sourceHandle: isGoingUp ? 'source-top' : 'source-bottom',
        targetHandle: isGoingUp ? 'target-bottom' : 'target-top',
      };
    }
    return {
      ...edge,
      sourceHandle: 'source-right',
      targetHandle: 'target-left',
    };
  });

  return { nodes: laidOutNodes, edges: laidOutEdges };
}
