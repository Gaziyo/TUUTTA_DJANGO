import type { RemediationAssignment } from '../types/lms';
import { apiClient } from '../lib/api';
import { serviceEvents } from './events';

function mapAssignment(raw: Record<string, unknown>, orgId: string): RemediationAssignment {
  return {
    id: raw.id as string,
    orgId,
    userId: (raw.user as string) || '',
    enrollmentId: (raw.enrollment as string) || '',
    courseId: (raw.course as string) || '',
    moduleId: (raw.module_id as string) || undefined,
    lessonId: (raw.lesson_id as string) || undefined,
    status: ((raw.status as RemediationAssignment['status']) || 'assigned'),
    reason: (raw.reason as string) || undefined,
    scheduledReassessmentAt: raw.scheduled_reassessment_at
      ? new Date(raw.scheduled_reassessment_at as string).getTime()
      : undefined,
    createdAt: raw.created_at ? new Date(raw.created_at as string).getTime() : Date.now(),
    updatedAt: raw.updated_at ? new Date(raw.updated_at as string).getTime() : undefined,
  };
}

export const remediationService = {
  create: async (assignment: Omit<RemediationAssignment, 'id' | 'createdAt'>): Promise<RemediationAssignment> => {
    const { data } = await apiClient.post(`/organizations/${assignment.orgId}/remediation-assignments/`, {
      organization: assignment.orgId,
      user: assignment.userId,
      enrollment: assignment.enrollmentId || null,
      course: assignment.courseId,
      module_id: assignment.moduleId || '',
      lesson_id: assignment.lessonId || '',
      status: assignment.status,
      reason: assignment.reason || '',
      scheduled_reassessment_at: assignment.scheduledReassessmentAt
        ? new Date(assignment.scheduledReassessmentAt).toISOString()
        : null,
    });
    const created = mapAssignment(data, assignment.orgId);
    serviceEvents.emit('remediation.created', { remediationId: created.id, userId: created.userId });
    return created;
  },

  update: async (assignmentId: string, updates: Partial<RemediationAssignment>): Promise<void> => {
    const orgId = updates.orgId;
    if (orgId) {
      const payload: Record<string, unknown> = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.reason !== undefined) payload.reason = updates.reason;
      if (updates.moduleId !== undefined) payload.module_id = updates.moduleId || '';
      if (updates.lessonId !== undefined) payload.lesson_id = updates.lessonId || '';
      if (updates.scheduledReassessmentAt !== undefined) {
        payload.scheduled_reassessment_at = updates.scheduledReassessmentAt
          ? new Date(updates.scheduledReassessmentAt).toISOString()
          : null;
      }
      await apiClient.patch(`/organizations/${orgId}/remediation-assignments/${assignmentId}/`, payload);
    }
    serviceEvents.emit('remediation.updated', { remediationId: assignmentId });
  },

  listForOrg: async (orgId: string): Promise<RemediationAssignment[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/remediation-assignments/`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map((record) => mapAssignment(record, orgId));
    } catch { return []; }
  },

  listForUser: async (orgId: string, userId: string): Promise<RemediationAssignment[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/remediation-assignments/`, {
        params: { user: userId },
      });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map((record) => mapAssignment(record, orgId));
    } catch { return []; }
  },
};
