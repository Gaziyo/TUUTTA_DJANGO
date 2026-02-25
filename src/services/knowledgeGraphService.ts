import { apiClient } from '../lib/api';

export interface KnowledgeNode {
  id: string;
  organization: string;
  node_type: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface KnowledgeEdge {
  id: string;
  organization: string;
  source: string;
  target: string;
  weight: number;
  relation?: string;
}

export const knowledgeGraphService = {
  build: async (orgId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/knowledge-nodes/build/`, { organization: orgId });
  },

  listNodes: async (orgId: string): Promise<KnowledgeNode[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-nodes/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as KnowledgeNode[];
  },

  listEdges: async (orgId: string): Promise<KnowledgeEdge[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-edges/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as KnowledgeEdge[];
  },
};

export default knowledgeGraphService;
