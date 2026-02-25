import { serviceEvents } from './events';

export const competencyBadgeService = {
  listForOrg: async (_orgId: string) => [],
  listForUser: async (_orgId: string, _userId: string) => [],
  emitIssued: (badgeId: string, userId: string) => {
    serviceEvents.emit('competency.badge.issued', { badgeId, userId });
  },
};
