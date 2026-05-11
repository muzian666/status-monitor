import api from './client';
import type { TopologyNode, TopologyNodeCreate, TopologyLink, TopologyLinkCreate, TopologyGraph } from '../types/topology';

export const topologyApi = {
  listNodes: () =>
    api.get<TopologyNode[]>('/topology/nodes').then((r) => r.data),

  createNode: (data: TopologyNodeCreate) =>
    api.post<TopologyNode>('/topology/nodes', data).then((r) => r.data),

  updateNode: (id: number, data: Partial<TopologyNodeCreate>) =>
    api.put<TopologyNode>(`/topology/nodes/${id}`, data).then((r) => r.data),

  deleteNode: (id: number) =>
    api.delete(`/topology/nodes/${id}`),

  listLinks: () =>
    api.get<TopologyLink[]>('/topology/links').then((r) => r.data),

  createLink: (data: TopologyLinkCreate) =>
    api.post<TopologyLink>('/topology/links', data).then((r) => r.data),

  deleteLink: (id: number) =>
    api.delete(`/topology/links/${id}`),

  getGraph: () =>
    api.get<TopologyGraph>('/topology/graph').then((r) => r.data),
};
