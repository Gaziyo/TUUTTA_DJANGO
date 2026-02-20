import type { CompetencyScore } from '../types/lms';
import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

export const competencyService = {
  create: async (score: Omit<CompetencyScore, 'id'>) => {
    const created = await lmsService.createCompetencyScore(score);
    serviceEvents.emit('competency.created', { competencyId: created.id, userId: created.userId });
    return created;
  },
  listForOrg: (orgId: string) => lmsService.getCompetencyScores(orgId),
  listForUser: (orgId: string, userId: string) => lmsService.getCompetencyScores(orgId, userId),
};
