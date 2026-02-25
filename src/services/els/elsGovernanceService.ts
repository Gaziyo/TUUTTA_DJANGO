/**
 * ELS Governance Service — Phase 9: Governance
 * Uses Django CompliancePolicy model + observabilityService for audit logs.
 */
import { apiClient } from '@/lib/api';
import type { ELSGovernance, ELSAuditLogEntry } from '@/types/els';
import { observabilityService } from '@/services/observabilityService';

export const elsGovernanceService = {
  get: async (orgId: string, projectId: string): Promise<ELSGovernance | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/${projectId}/`);
      const phaseRec = (data.phase_records as Record<string, unknown>[])?.find(
        (r: Record<string, unknown>) => r.phase === 'govern'
      );
      if (!phaseRec?.output_data) return null;
      return { id: projectId, orgId, projectId, ...(phaseRec.output_data as object) } as ELSGovernance;
    } catch {
      return null;
    }
  },

  update: async (
    orgId: string,
    projectId: string,
    _govId: string,
    _userId: string,
    updates: Partial<ELSGovernance>
  ): Promise<void> => {
    await apiClient.post(
      `/organizations/${orgId}/els-projects/${projectId}/phases/govern/complete/`,
      { output_data: updates }
    );
  },

  createAuditLog: async (
    orgId: string,
    userId: string,
    entry: Omit<ELSAuditLogEntry, 'id' | 'timestamp'>
  ): Promise<void> => {
    void observabilityService.logAdminAuditEvent({
      orgId,
      actorId: userId,
      actorName: entry.actorName ?? '',
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata as Record<string, unknown>,
    });
  },

  getAuditLogs: async (_orgId: string, _projectId: string): Promise<ELSAuditLogEntry[]> => {
    // Audit logs live in observability — future: read from Django audit endpoint
    return [];
  },

  linkCompliancePolicy: async (
    orgId: string,
    policyId: string,
    projectId: string
  ): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/compliance-policies/${policyId}/`, {
      metadata: { els_project_id: projectId },
    });
  },

  subscribe: (_orgId: string, _projectId: string, _cb: (g: ELSGovernance | null) => void) => () => {},
};
