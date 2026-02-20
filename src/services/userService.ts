import type { OrgMember, UserRole } from '../types/lms';
import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

export const userService = {
  addMember: async (member: Omit<OrgMember, 'id'>) => {
    const created = await lmsService.addOrgMember(member);
    serviceEvents.emit('member.created', { memberId: created.id, orgId: created.orgId });
    return created;
  },
  getMember: (memberId: string) => lmsService.getOrgMember(memberId),
  listMembershipsForUser: (userId: string) => lmsService.getOrgMembershipsForUser(userId),
  getMemberByEmail: (orgId: string, email: string) => lmsService.getOrgMemberByEmail(orgId, email),
  listMembers: (
    orgId: string,
    options?: {
      role?: UserRole;
      departmentId?: string;
      teamId?: string;
      status?: 'active' | 'inactive' | 'pending';
      limit?: number;
    }
  ) => lmsService.getOrgMembers(orgId, options),
  updateMember: async (memberId: string, updates: Partial<OrgMember>) => {
    await lmsService.updateOrgMember(memberId, updates);
    serviceEvents.emit('member.updated', { memberId });
  },
  removeMember: async (memberId: string) => {
    await lmsService.removeOrgMember(memberId);
    serviceEvents.emit('member.deleted', { memberId });
  },
};
