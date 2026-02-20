import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elsAnalyticsService } from '@/services/els';
import type { ELSMetrics, ELSTimeSeriesPoint } from '@/types/els';

const QUERY_KEYS = {
  analytics: (orgId: string, projectId: string) =>
    ['els', 'analytics', orgId, projectId] as const,
  dashboardSummary: (orgId: string) =>
    ['els', 'analytics', orgId, 'dashboard'] as const,
};

// ============================================================================
// READ HOOKS
// ============================================================================

export function useELSAnalytics(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.analytics(orgId, projectId),
    queryFn: () => elsAnalyticsService.getByProject(orgId, projectId),
    enabled: !!orgId && !!projectId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useELSDashboardSummary(orgId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardSummary(orgId),
    queryFn: () => elsAnalyticsService.getDashboardSummary(orgId),
    enabled: !!orgId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useUpdateELSAnalytics(orgId: string, analyticsId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof elsAnalyticsService.update>[2]) =>
      elsAnalyticsService.update(orgId, analyticsId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analytics', orgId] });
    },
  });
}

export function useUpdateELSMetrics(orgId: string, analyticsId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metrics: Partial<ELSMetrics>) =>
      elsAnalyticsService.updateMetrics(orgId, analyticsId, metrics),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analytics', orgId] });
    },
  });
}

export function useAddTimeSeriesPoint(orgId: string, analyticsId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (point: ELSTimeSeriesPoint) =>
      elsAnalyticsService.addTimeSeriesPoint(orgId, analyticsId, point),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analytics', orgId] });
    },
  });
}

export function useComputeFromEnrollments(orgId: string, analyticsId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enrollmentData: Parameters<typeof elsAnalyticsService.computeFromEnrollments>[2]) =>
      elsAnalyticsService.computeFromEnrollments(orgId, analyticsId, enrollmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['els', 'analytics', orgId] });
    },
  });
}
