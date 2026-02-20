import type { RemediationAssignment } from '../types/lms';
import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

export const remediationService = {
  create: async (assignment: Omit<RemediationAssignment, 'id' | 'createdAt'>) => {
    const created = await lmsService.createRemediationAssignment(assignment);
    serviceEvents.emit('remediation.created', { remediationId: created.id, userId: created.userId });
    return created;
  },
  update: async (assignmentId: string, updates: Partial<RemediationAssignment>) => {
    await lmsService.updateRemediationAssignment(assignmentId, updates);
    serviceEvents.emit('remediation.updated', { remediationId: assignmentId });
  },
  listForOrg: (orgId: string) => lmsService.getRemediationAssignments(orgId),
  listForUser: (orgId: string, userId: string) => lmsService.getRemediationAssignments(orgId, userId),
};
