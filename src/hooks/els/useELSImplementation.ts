import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsImplementationService } from '@/services/els';
import type { ELSEnrollmentRule } from '@/types/els';

const QUERY_KEYS = {
  implementation: (orgId: string, projectId: string) =>
    ['els', 'implementation', orgId, projectId] as const,
};

// ============================================================================
// READ HOOKS
// ============================================================================

export function useELSImplementation(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.implementation(orgId, projectId),
    queryFn: () => elsImplementationService.getByProject(orgId, projectId),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useUpdateELSImplementation(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof elsImplementationService.update>[2]) =>
      elsImplementationService.update(orgId, implementationId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}

export function useAddEnrollmentRule(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: Omit<ELSEnrollmentRule, 'id'>) =>
      elsImplementationService.addEnrollmentRule(orgId, implementationId, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}

export function useUpdateEnrollmentRule(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      updates,
    }: {
      ruleId: string;
      updates: Partial<ELSEnrollmentRule>;
    }) =>
      elsImplementationService.updateEnrollmentRule(
        orgId,
        implementationId,
        ruleId,
        updates
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}

export function useRemoveEnrollmentRule(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) =>
      elsImplementationService.removeEnrollmentRule(orgId, implementationId, ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}

export function useActivateImplementation(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => elsImplementationService.activate(orgId, implementationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}

export function usePauseImplementation(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => elsImplementationService.pause(orgId, implementationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}

export function useCompleteImplementation(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => elsImplementationService.complete(orgId, implementationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}

export function useLinkCourse(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) =>
      elsImplementationService.linkCourse(orgId, implementationId, courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}

export function useLinkLearningPath(orgId: string, implementationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (learningPathId: string) =>
      elsImplementationService.linkLearningPath(orgId, implementationId, learningPathId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'implementation', orgId] });
    },
  });
}
