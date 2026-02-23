import { apiClient } from '../lib/api';
import type { OrgMember, UserRole } from '../types/lms';
import { serviceEvents } from './events';

// Map Django OrganizationMember response to OrgMember type
function mapMember(data: Record<string, unknown>): OrgMember {
  return {
    id: data.id as string,
    odId: (data.organization as string) ?? '',
    orgId: (data.organization as string) ?? undefined,
    userId: (data.user as string) ?? undefined,
    email: (data.user_email as string) ?? '',
    name: (data.user_name as string) ?? '',
    role: (data.role as OrgMember['role']) ?? 'learner',
    departmentId: (data.department as string) ?? undefined,
    teamId: (data.team as string) ?? undefined,
    title: (data.job_title as string) || undefined,
    status: (data.status as OrgMember['status']) ?? 'active',
    joinedAt: data.joined_at ? new Date(data.joined_at as string).getTime() : undefined,
  };
}

export const userService = {
  /** Return all org memberships for the current logged-in user (JWT identifies the user). */
  listMembershipsForUser: async (_userId: string): Promise<OrgMember[]> => {
    try {
      const { data } = await apiClient.get('/members/me/');
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapMember);
    } catch {
      return [];
    }
  },

  getMember: async (memberId: string): Promise<OrgMember | null> => {
    try {
      const { data } = await apiClient.get(`/members/${memberId}/`);
      return mapMember(data);
    } catch {
      return null;
    }
  },

  getMemberByEmail: async (orgId: string, email: string): Promise<OrgMember | null> => {
    try {
      const { data } = await apiClient.get(
        `/organizations/${orgId}/members/?email=${encodeURIComponent(email)}`
      );
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results[0] ? mapMember(results[0]) : null;
    } catch {
      return null;
    }
  },

  listMembers: async (
    orgId: string,
    options?: {
      role?: UserRole;
      departmentId?: string;
      teamId?: string;
      status?: 'active' | 'inactive' | 'pending';
      limit?: number;
    }
  ): Promise<OrgMember[]> => {
    try {
      const params = new URLSearchParams();
      if (options?.role) params.set('role', options.role);
      if (options?.status) params.set('status', options.status);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const { data } = await apiClient.get(`/organizations/${orgId}/members/${qs}`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapMember);
    } catch {
      return [];
    }
  },

  addMember: async (member: Omit<OrgMember, 'id'>): Promise<OrgMember> => {
    const orgId = member.orgId ?? member.odId;
    const payload = {
      organization: orgId,
      user: member.userId,
      role: member.role,
      status: member.status ?? 'active',
    };
    const { data } = await apiClient.post(`/organizations/${orgId}/members/`, payload);
    const created = mapMember(data);
    serviceEvents.emit('member.created', { memberId: created.id, orgId: created.orgId });
    return created;
  },

  updateMember: async (memberId: string, updates: Partial<OrgMember>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.title !== undefined) payload.job_title = updates.title;
    await apiClient.patch(`/members/${memberId}/`, payload);
    serviceEvents.emit('member.updated', { memberId });
  },

  removeMember: async (memberId: string): Promise<void> => {
    await apiClient.delete(`/members/${memberId}/`);
    serviceEvents.emit('member.deleted', { memberId });
  },
};
