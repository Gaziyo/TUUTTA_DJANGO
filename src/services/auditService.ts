import type { AuditLog } from '../types/lms';
import { observabilityService } from './observabilityService';

export const auditService = {
  create: async (log: Omit<AuditLog, 'id'>): Promise<AuditLog> => {
    try {
      await observabilityService.logAdminAuditEvent({
        orgId: log.orgId,
        actorId: log.actorId,
        actorName: log.actorName ?? '',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        targetType: log.targetType,
        targetId: log.targetId,
        targetName: log.targetName,
        changes: log.changes as Record<string, unknown>,
        metadata: log.metadata as Record<string, unknown>,
      });
    } catch {
      // fire-and-forget — never block caller
    }
    return { id: `audit_${Date.now()}`, ...log };
  },

  list: async (_orgId: string, _limitCount?: number): Promise<AuditLog[]> => {
    // TODO: wire to Django analytics audit endpoint
    return [];
  },
};
