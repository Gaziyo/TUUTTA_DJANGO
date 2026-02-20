import type { Team } from '../types/lms';
import * as lmsService from '../lib/lmsService';

export const teamService = {
  list: (orgId: string, departmentId?: string) => lmsService.getTeams(orgId, departmentId),
  create: (team: Omit<Team, 'id' | 'createdAt'>) => lmsService.createTeam(team),
  update: (teamId: string, updates: Partial<Team>) => lmsService.updateTeam(teamId, updates),
  remove: (teamId: string) => lmsService.deleteTeam(teamId),
};
