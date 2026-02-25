import type { Team } from '../types/lms';
import { apiClient } from '../lib/api';

function mapTeam(data: Record<string, unknown>): Team {
  return {
    id: data.id as string,
    orgId: data.organization as string,
    departmentId: (data.department as string) || undefined,
    name: data.name as string,
    description: (data.description as string) || undefined,
    leadId: (data.lead as string) || undefined,
    memberIds: [],
    createdAt: data.created_at ? new Date(data.created_at as string).getTime() : Date.now(),
  };
}

export const teamService = {
  list: async (orgId: string, departmentId?: string): Promise<Team[]> => {
    try {
      const qs = departmentId ? `?department=${encodeURIComponent(departmentId)}` : '';
      const { data } = await apiClient.get(`/organizations/${orgId}/teams/${qs}`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapTeam);
    } catch {
      return [];
    }
  },

  create: async (team: Omit<Team, 'id' | 'createdAt'>): Promise<Team> => {
    const payload = {
      organization: team.orgId,
      department: team.departmentId,
      name: team.name,
      description: team.description,
      lead: team.leadId,
    };
    const { data } = await apiClient.post(`/organizations/${team.orgId}/teams/`, payload);
    return mapTeam(data);
  },

  update: async (teamId: string, updates: Partial<Team>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.leadId !== undefined) payload.lead = updates.leadId;
    if (updates.departmentId !== undefined) payload.department = updates.departmentId;
    const orgId = updates.orgId;
    if (orgId) {
      await apiClient.patch(`/organizations/${orgId}/teams/${teamId}/`, payload);
    }
  },

  remove: async (teamId: string): Promise<void> => {
    console.warn('[teamService] remove called without orgId context:', teamId);
  },
};
