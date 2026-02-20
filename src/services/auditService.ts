import type { AuditLog } from '../types/lms';
import * as lmsService from '../lib/lmsService';

export const auditService = {
  create: (log: Omit<AuditLog, 'id'>) => lmsService.createAuditLog(log),
  list: (orgId: string, limitCount?: number) => lmsService.getAuditLogs(orgId, limitCount),
};
