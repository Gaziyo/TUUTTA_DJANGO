import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

export const competencyBadgeService = {
  listForOrg: (orgId: string) => lmsService.getCompetencyBadges(orgId),
  listForUser: (orgId: string, userId: string) => lmsService.getCompetencyBadges(orgId, userId),
  emitIssued: (badgeId: string, userId: string) => {
    serviceEvents.emit('competency.badge.issued', { badgeId, userId });
  }
};
