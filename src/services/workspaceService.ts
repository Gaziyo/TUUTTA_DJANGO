import { apiClient } from '../lib/api';
import type { WorkspaceContext } from '../store/workspaceStore';

export interface WorkspaceOrgAccess {
  id: string;
  slug: string;
  name: string;
  role: string;
}

export interface WorkspaceResolveResponse {
  activeContext: WorkspaceContext;
  activeOrgSlug: string | null;
  defaultRoute: string;
  isMaster: boolean;
  authorizedWorkspaces: {
    personal: boolean;
    master: boolean;
    organizations: WorkspaceOrgAccess[];
  };
}

export const workspaceService = {
  resolve: async (orgSlug?: string): Promise<WorkspaceResolveResponse> => {
    const params = new URLSearchParams();
    if (orgSlug) params.set('orgSlug', orgSlug);
    const query = params.toString();
    const { data } = await apiClient.get(`/workspaces/resolve/${query ? `?${query}` : ''}`);
    return data as WorkspaceResolveResponse;
  },
};
