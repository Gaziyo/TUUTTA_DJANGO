import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsAIGenerationService } from '@/services/els';
import type { ELSGeneratedAssessment } from '@/types/els';

const QUERY_KEYS = {
  generation: (orgId: string, projectId: string) =>
    ['els', 'generation', orgId, projectId] as const,
};

// ============================================================================
// READ HOOKS
// ============================================================================

export function useELSAIGeneration(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.generation(orgId, projectId),
    queryFn: () => elsAIGenerationService.getByProject(orgId, projectId),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateGeneration(orgId: string, generationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      type: 'lesson' | 'slides' | 'audio' | 'interactive' | 'video_script';
      prompt: string;
      parameters?: Record<string, any>;
      targetModuleId?: string;
      targetUnitId?: string;
    }) => elsAIGenerationService.createGeneration(orgId, generationId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'generation', orgId] });
    },
  });
}

export function useUpdateGenerationStatus(orgId: string, generationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      status,
      output,
      metadata,
    }: {
      itemId: string;
      status: 'pending' | 'generating' | 'completed' | 'error';
      output?: string;
      metadata?: {
        tokensUsed: number;
        model: string;
        confidence: number;
        generationTime: number;
      };
    }) =>
      elsAIGenerationService.updateGenerationStatus(
        orgId,
        generationId,
        itemId,
        status,
        output,
        metadata
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'generation', orgId] });
    },
  });
}

export function useReviewGeneration(orgId: string, generationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      userId,
      approved,
    }: {
      itemId: string;
      userId: string;
      approved: boolean;
    }) =>
      elsAIGenerationService.reviewGeneration(
        orgId,
        generationId,
        itemId,
        userId,
        approved
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'generation', orgId] });
    },
  });
}

export function useCreateAssessment(orgId: string, generationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assessment: Omit<ELSGeneratedAssessment, 'id'>) =>
      elsAIGenerationService.createAssessment(orgId, generationId, assessment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'generation', orgId] });
    },
  });
}

export function useUpdateAssessment(orgId: string, generationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assessmentId,
      updates,
    }: {
      assessmentId: string;
      updates: Partial<ELSGeneratedAssessment>;
    }) =>
      elsAIGenerationService.updateAssessment(
        orgId,
        generationId,
        assessmentId,
        updates
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'generation', orgId] });
    },
  });
}

export function useRemoveAssessment(orgId: string, generationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assessmentId: string) =>
      elsAIGenerationService.removeAssessment(orgId, generationId, assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'generation', orgId] });
    },
  });
}
