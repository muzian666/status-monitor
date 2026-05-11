import type { Node, Edge } from '@xyflow/react';

const GAP_X = 280; // horizontal gap between nodes
const GAP_Y = 220; // vertical gap between rows
const NODES_PER_ROW = 5;

/**
 * Layout nodes in a zigzag (serpentine) pattern.
 * Path goes left→right, then right→left, wrapping like a snake.
 * Keeps all nodes at readable size within the viewport.
 */
export function zigzagLayout(nodes: Node[], _edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  return nodes.map((node, i) => {
    const row = Math.floor(i / NODES_PER_ROW);
    const col = i % NODES_PER_ROW;
    const isReversed = row % 2 === 1;
    const actualCol = isReversed ? (NODES_PER_ROW - 1 - col) : col;

    return {
      ...node,
      position: {
        x: actualCol * GAP_X,
        y: row * GAP_Y,
      },
    };
  });
}

/**
 * General dagre-like layout for non-linear graphs (manual mode).
 * For linear paths, use zigzagLayout instead.
 */
export function zigzagLayoutForPath(nodeIds: string[], edges: Edge[]): Node[] {
  // unused, kept for compatibility
  return [];
}
