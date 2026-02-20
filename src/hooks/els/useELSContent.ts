import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsContentService } from '@/services/els';
import type { ELSContent } from '@/types/els';

const QUERY_KEYS = {
  content: (orgId: string, projectId: string) =>
    ['els', 'content', orgId, projectId] as const,
  contentItem: (orgId: string, contentId: string) =>
    ['els', 'content', orgId, contentId] as const,
};

// ============================================================================
// READ HOOKS
// ============================================================================

export function useELSContent(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.content(orgId, projectId),
    queryFn: () => elsContentService.list(orgId, projectId),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useELSContentItem(
  orgId: string,
  contentId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.contentItem(orgId, contentId),
    queryFn: () => elsContentService.get(orgId, contentId),
    enabled: !!orgId && !!contentId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateELSContent(
  orgId: string,
  projectId: string,
  userId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      type: ELSContent['type'];
      size: number;
      fileUrl: string;
      storagePath?: string;
      processingOptions?: ELSContent['processingOptions'];
    }) => elsContentService.create(orgId, projectId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.content(orgId, projectId),
      });
    },
  });
}

export function useUpdateELSContent(orgId: string, contentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof elsContentService.update>[2]) =>
      elsContentService.update(orgId, contentId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.contentItem(orgId, contentId),
      });
    },
  });
}

export function useUpdateELSContentProgress(orgId: string, contentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      progress,
      status,
    }: {
      progress: number;
      status?: ELSContent['status'];
    }) => elsContentService.updateProgress(orgId, contentId, progress, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.contentItem(orgId, contentId),
      });
    },
  });
}

export function useDeleteELSContent(orgId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: string) => elsContentService.delete(orgId, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.content(orgId, projectId),
      });
    },
  });
}
