import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsGovernanceService } from '@/services/els';
import type { ELSAuditLogEntry } from '@/types/els';

const QUERY_KEYS = {
  governance: (orgId: string, projectId: string) =>
    ['els', 'governance', orgId, projectId] as const,
  auditLogs: (orgId: string, projectId: string) =>
    ['els', 'audit', orgId, projectId] as const,
};

// ============================================================================
// READ HOOKS
// ============================================================================

export function useELSGovernance(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.governance(orgId, projectId),
    queryFn: () => elsGovernanceService.getByProject(orgId, projectId),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useELSAuditLogs(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean; limit?: number }
) {
  return useQuery({
    queryKey: QUERY_KEYS.auditLogs(orgId, projectId),
    queryFn: () =>
      elsGovernanceService.getAuditLogs(orgId, projectId, { limit: options?.limit }),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 1 * 60 * 1000, // 1 minute for audit logs
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useUpdateELSGovernance(orgId: string, governanceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof elsGovernanceService.update>[2]) =>
      elsGovernanceService.update(orgId, governanceId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'governance', orgId] });
    },
  });
}

export function useUpdatePrivacySettings(orgId: string, governanceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Parameters<typeof elsGovernanceService.updatePrivacySettings>[2]) =>
      elsGovernanceService.updatePrivacySettings(orgId, governanceId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'governance', orgId] });
    },
  });
}

export function useUpdateSecuritySettings(orgId: string, governanceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Parameters<typeof elsGovernanceService.updateSecuritySettings>[2]) =>
      elsGovernanceService.updateSecuritySettings(orgId, governanceId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'governance', orgId] });
    },
  });
}

export function useUpdateAIMonitoring(orgId: string, governanceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monitoring: Parameters<typeof elsGovernanceService.updateAIMonitoring>[2]) =>
      elsGovernanceService.updateAIMonitoring(orgId, governanceId, monitoring),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'governance', orgId] });
    },
  });
}

export function useApproveStage(orgId: string, governanceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stageId,
      userId,
      notes,
    }: {
      stageId: string;
      userId: string;
      notes?: string;
    }) => elsGovernanceService.approveStage(orgId, governanceId, stageId, userId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'governance', orgId] });
    },
  });
}

export function useRejectStage(orgId: string, governanceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stageId,
      userId,
      notes,
    }: {
      stageId: string;
      userId: string;
      notes?: string;
    }) => elsGovernanceService.rejectStage(orgId, governanceId, stageId, userId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'governance', orgId] });
    },
  });
}

export function useCreateAuditLog(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: Omit<ELSAuditLogEntry, 'id' | 'orgId'>) =>
      elsGovernanceService.createAuditLog(orgId, entry),
    onSuccess: (_data, variables) => {
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.auditLogs(orgId, variables.projectId),
        });
      }
    },
  });
}
