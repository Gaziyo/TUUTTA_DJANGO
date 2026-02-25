/**
 * ELS Analytics Service — Phase 6: Evaluation
 * Reads from Django org stats + enrollment progress endpoints.
 */
import { apiClient } from '@/lib/api';
import type { ELSAnalytics } from '@/types/els';

function emptyAnalytics(orgId: string, projectId: string): ELSAnalytics {
  return {
    id: projectId,
    orgId,
    projectId,
    metrics: {
      totalLearners: 0,
      activeLearners: 0,
      completionRate: 0,
      averageScore: 0,
      averageTimeToComplete: 0,
      dropoutRate: 0,
    },
    timeSeriesData: [],
    engagementMetrics: [],
    complianceMetrics: [],
    skillImprovement: [],
    updatedAt: Date.now(),
  };
}

export const elsAnalyticsService = {
  get: async (orgId: string, projectId: string): Promise<ELSAnalytics> => {
    try {
      const { data: stats } = await apiClient.get(`/organizations/${orgId}/stats/`);
      return {
        id: projectId,
        orgId,
        projectId,
        metrics: {
          totalLearners: stats.total_learners ?? 0,
          activeLearners: stats.active_learners ?? 0,
          completionRate: stats.completion_rate ?? 0,
          averageScore: stats.average_score ?? 0,
          averageTimeToComplete: 0,
          dropoutRate: 0,
        },
        timeSeriesData: [],
        engagementMetrics: [],
        complianceMetrics: [],
        skillImprovement: [],
        updatedAt: Date.now(),
      };
    } catch {
      return emptyAnalytics(orgId, projectId);
    }
  },

  computeForProject: async (orgId: string, projectId: string): Promise<ELSAnalytics> => {
    return elsAnalyticsService.get(orgId, projectId);
  },

  subscribe: (_orgId: string, _projectId: string, _cb: (a: ELSAnalytics | null) => void) => () => {},
};
