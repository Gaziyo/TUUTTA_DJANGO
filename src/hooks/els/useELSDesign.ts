import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsDesignService } from '@/services/els';
import type { ELSCourseDesign, ELSModule, ELSUnit } from '@/types/els';

const QUERY_KEYS = {
  design: (orgId: string, projectId: string) =>
    ['els', 'design', orgId, projectId] as const,
};

// ============================================================================
// READ HOOKS
// ============================================================================

export function useELSDesign(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.design(orgId, projectId),
    queryFn: () => elsDesignService.getByProject(orgId, projectId),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useUpdateELSDesign(orgId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof elsDesignService.update>[2]) =>
      elsDesignService.update(orgId, designId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'design', orgId] });
    },
  });
}

export function useAddELSModule(orgId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (module: Omit<ELSModule, 'id'>) =>
      elsDesignService.addModule(orgId, designId, module),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'design', orgId] });
    },
  });
}

export function useUpdateELSModule(orgId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      moduleId,
      updates,
    }: {
      moduleId: string;
      updates: Partial<ELSModule>;
    }) => elsDesignService.updateModule(orgId, designId, moduleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'design', orgId] });
    },
  });
}

export function useRemoveELSModule(orgId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moduleId: string) =>
      elsDesignService.removeModule(orgId, designId, moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'design', orgId] });
    },
  });
}

export function useReorderELSModules(orgId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moduleIds: string[]) =>
      elsDesignService.reorderModules(orgId, designId, moduleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'design', orgId] });
    },
  });
}

export function useAddELSUnit(orgId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      moduleId,
      unit,
    }: {
      moduleId: string;
      unit: Omit<ELSUnit, 'id'>;
    }) => elsDesignService.addUnit(orgId, designId, moduleId, unit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'design', orgId] });
    },
  });
}

export function useUpdateELSUnit(orgId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      moduleId,
      unitId,
      updates,
    }: {
      moduleId: string;
      unitId: string;
      updates: Partial<ELSUnit>;
    }) =>
      elsDesignService.updateUnit(orgId, designId, moduleId, unitId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'design', orgId] });
    },
  });
}

export function useRemoveELSUnit(orgId: string, designId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      moduleId,
      unitId,
    }: {
      moduleId: string;
      unitId: string;
    }) => elsDesignService.removeUnit(orgId, designId, moduleId, unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'design', orgId] });
    },
  });
}
