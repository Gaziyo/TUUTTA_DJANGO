import type { CompetencyScore } from '../types/lms';
import { apiClient } from '../lib/api';
import { serviceEvents } from './events';

function mapScore(raw: Record<string, unknown>, orgId: string): CompetencyScore {
  return {
    id: raw.id as string,
    orgId,
    userId: (raw.user as string) || '',
    courseId: (raw.course_id as string) || undefined,
    enrollmentId: (raw.enrollment_id as string) || undefined,
    assessmentId: (raw.assessment_id as string) || undefined,
    competencyTag: (raw.competency_tag as string) || '',
    score: Number(raw.score ?? 0),
    assessedAt: raw.assessed_at ? new Date(raw.assessed_at as string).getTime() : Date.now(),
    expiresAt: raw.expires_at ? new Date(raw.expires_at as string).getTime() : undefined,
  };
}

export const competencyService = {
  create: async (score: Omit<CompetencyScore, 'id'>): Promise<CompetencyScore> => {
    const payload = {
      organization: score.orgId,
      user: score.userId,
      competency_tag: score.competencyTag,
      score: score.score,
      course_id: score.courseId || '',
      enrollment_id: score.enrollmentId || '',
      assessment_id: score.assessmentId || '',
      expires_at: score.expiresAt ? new Date(score.expiresAt).toISOString() : null,
    };
    const { data } = await apiClient.post(`/organizations/${score.orgId}/competency-scores/`, payload);
    const created = mapScore(data, score.orgId);
    serviceEvents.emit('competency.created', { competencyId: created.id, userId: created.userId });
    return created;
  },

  listForOrg: async (orgId: string): Promise<CompetencyScore[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/competency-scores/`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map((record) => mapScore(record, orgId));
    } catch { return []; }
  },

  listForUser: async (orgId: string, userId: string): Promise<CompetencyScore[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/competency-scores/`, {
        params: { user: userId },
      });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map((record) => mapScore(record, orgId));
    } catch {
      return [];
    }
  },
};
