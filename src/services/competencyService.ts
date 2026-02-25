import type { CompetencyScore } from '../types/lms';
import { apiClient } from '../lib/api';
import { serviceEvents } from './events';

export const competencyService = {
  create: async (score: Omit<CompetencyScore, 'id'>): Promise<CompetencyScore> => {
    const stub: CompetencyScore = { id: `comp_${Date.now()}`, ...score };
    serviceEvents.emit('competency.created', { competencyId: stub.id, userId: score.userId });
    return stub;
  },

  listForOrg: async (orgId: string): Promise<CompetencyScore[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/competencies/`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(r => ({
        id: r.id as string,
        orgId,
        userId: '',
        competencyId: r.id as string,
        competencyName: r.name as string,
        score: 0,
        level: (r.level as string) || 'novice',
        assessedAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
        createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
      })) as CompetencyScore[];
    } catch { return []; }
  },

  listForUser: async (_orgId: string, _userId: string): Promise<CompetencyScore[]> => [],
};
