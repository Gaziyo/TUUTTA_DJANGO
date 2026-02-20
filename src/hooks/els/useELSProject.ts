import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsProjectService } from '@/services/els';
import type { ELSProject, ELSPhase } from '@/types/els';

// Query keys
const QUERY_KEYS = {
  projects: (orgId: string) => ['els', 'projects', orgId] as const,
  project: (orgId: string, projectId: string) => ['els', 'projects', orgId, projectId] as const,
};

// ============================================================================
// READ HOOKS
// ============================================================================

/**
 * Hook to fetch all ELS projects for an organization
 */
export function useELSProjects(
  orgId: string,
  options?: { status?: ELSProject['status']; enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.projects(orgId),
    queryFn: () => elsProjectService.list(orgId, options),
    enabled: !!orgId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single ELS project
 */
export function useELSProject(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.project(orgId, projectId),
    queryFn: () => elsProjectService.get(orgId, projectId),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new ELS project
 */
export function useCreateELSProject(orgId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      elsProjectService.create(orgId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects(orgId) });
    },
  });
}

/**
 * Hook to update an ELS project
 */
export function useUpdateELSProject(orgId: string, projectId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof elsProjectService.update>[3]) =>
      elsProjectService.update(orgId, projectId, userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(orgId, projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects(orgId) });
    },
  });
}

/**
 * Hook to delete an ELS project
 */
export function useDeleteELSProject(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => elsProjectService.delete(orgId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects(orgId) });
    },
  });
}

/**
 * Hook to update a phase status
 */
export function useUpdateELSPhase(orgId: string, projectId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      phase,
      status,
    }: {
      phase: ELSPhase;
      status: Partial<ELSProject['phases'][ELSPhase]>;
    }) => elsProjectService.updatePhase(orgId, projectId, userId, phase, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(orgId, projectId) });
    },
  });
}

/**
 * Hook to start a phase
 */
export function useStartELSPhase(orgId: string, projectId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (phase: ELSPhase) =>
      elsProjectService.startPhase(orgId, projectId, userId, phase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(orgId, projectId) });
    },
  });
}

/**
 * Hook to complete a phase
 */
export function useCompleteELSPhase(orgId: string, projectId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phase, phaseData }: { phase: ELSPhase; phaseData?: any }) =>
      elsProjectService.completePhase(orgId, projectId, userId, phase, phaseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.project(orgId, projectId) });
    },
  });
}

/**
 * Hook to archive a project
 */
export function useArchiveELSProject(orgId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      elsProjectService.archive(orgId, projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects(orgId) });
    },
  });
}

/**
 * Hook to activate a project
 */
export function useActivateELSProject(orgId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      elsProjectService.activate(orgId, projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects(orgId) });
    },
  });
}
