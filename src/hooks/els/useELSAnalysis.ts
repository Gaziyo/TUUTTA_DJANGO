import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsAnalysisService } from '@/services/els';
import type {
  ELSNeedsAnalysis,
  ELSSkillGap,
  ELSComplianceRequirement,
  ELSLearningObjective,
} from '@/types/els';

const QUERY_KEYS = {
  analysis: (orgId: string, projectId: string) =>
    ['els', 'analysis', orgId, projectId] as const,
};

// ============================================================================
// READ HOOKS
// ============================================================================

export function useELSAnalysis(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.analysis(orgId, projectId),
    queryFn: () => elsAnalysisService.getByProject(orgId, projectId),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useUpdateELSAnalysis(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof elsAnalysisService.update>[2]) =>
      elsAnalysisService.update(orgId, analysisId, updates),
    onSuccess: () => {
      // Invalidate all analyses for this org since we don't know the projectId
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useAddSkillGap(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillGap: Omit<ELSSkillGap, 'skillId'>) =>
      elsAnalysisService.addSkillGap(orgId, analysisId, skillGap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useUpdateSkillGap(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      skillId,
      updates,
    }: {
      skillId: string;
      updates: Partial<ELSSkillGap>;
    }) => elsAnalysisService.updateSkillGap(orgId, analysisId, skillId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useRemoveSkillGap(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) =>
      elsAnalysisService.removeSkillGap(orgId, analysisId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useAddComplianceRequirement(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requirement: Omit<ELSComplianceRequirement, 'id'>) =>
      elsAnalysisService.addComplianceRequirement(orgId, analysisId, requirement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useUpdateComplianceRequirement(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requirementId,
      updates,
    }: {
      requirementId: string;
      updates: Partial<ELSComplianceRequirement>;
    }) =>
      elsAnalysisService.updateComplianceRequirement(
        orgId,
        analysisId,
        requirementId,
        updates
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useRemoveComplianceRequirement(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requirementId: string) =>
      elsAnalysisService.removeComplianceRequirement(orgId, analysisId, requirementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useAddLearningObjective(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (objective: Omit<ELSLearningObjective, 'id'>) =>
      elsAnalysisService.addLearningObjective(orgId, analysisId, objective),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useUpdateLearningObjective(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      objectiveId,
      updates,
    }: {
      objectiveId: string;
      updates: Partial<ELSLearningObjective>;
    }) =>
      elsAnalysisService.updateLearningObjective(
        orgId,
        analysisId,
        objectiveId,
        updates
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useRemoveLearningObjective(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (objectiveId: string) =>
      elsAnalysisService.removeLearningObjective(orgId, analysisId, objectiveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}

export function useGenerateObjectives(orgId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentIds: string[]) =>
      elsAnalysisService.generateObjectives(orgId, analysisId, contentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analysis', orgId] });
    },
  });
}
