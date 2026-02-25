import type { RemediationAssignment } from '../types/lms';
import { apiClient } from '../lib/api';
import { serviceEvents } from './events';

export const remediationService = {
  create: async (assignment: Omit<RemediationAssignment, 'id' | 'createdAt'>): Promise<RemediationAssignment> => {
    try {
      const { data } = await apiClient.post(`/organizations/${assignment.orgId}/gap-matrix/`, {
        organization: assignment.orgId,
        user: assignment.userId,
        status: 'open',
        priority: 3,
      });
      const created: RemediationAssignment = { id: data.id, ...assignment, createdAt: Date.now() };
      serviceEvents.emit('remediation.created', { remediationId: created.id, userId: created.userId });
      return created;
    } catch {
      const stub: RemediationAssignment = { id: `rem_${Date.now()}`, ...assignment, createdAt: Date.now() };
      serviceEvents.emit('remediation.created', { remediationId: stub.id, userId: stub.userId });
      return stub;
    }
  },

  update: async (assignmentId: string, updates: Partial<RemediationAssignment>): Promise<void> => {
    const orgId = updates.orgId;
    if (orgId) {
      try {
        await apiClient.patch(`/organizations/${orgId}/gap-matrix/${assignmentId}/`, {
          status: updates.status,
        });
      } catch { /* ignore */ }
    }
    serviceEvents.emit('remediation.updated', { remediationId: assignmentId });
  },

  listForOrg: async (orgId: string): Promise<RemediationAssignment[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/gap-matrix/`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(r => ({
        id: r.id as string,
        orgId,
        userId: r.user as string,
        assignedBy: '',
        courseId: (r.recommended_course as string) || '',
        reason: '',
        status: (r.status as string) as RemediationAssignment['status'],
        dueDate: undefined,
        createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
      }));
    } catch { return []; }
  },

  listForUser: async (orgId: string, userId: string): Promise<RemediationAssignment[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/gap-matrix/`, { params: { user: userId } });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(r => ({
        id: r.id as string,
        orgId,
        userId,
        assignedBy: '',
        courseId: (r.recommended_course as string) || '',
        reason: '',
        status: (r.status as string) as RemediationAssignment['status'],
        dueDate: undefined,
        createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
      }));
    } catch { return []; }
  },
};
