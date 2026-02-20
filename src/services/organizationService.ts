import type { Organization, OrganizationSettings } from '../types/lms';
import * as lmsService from '../lib/lmsService';

export const organizationService = {
  create: (org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) =>
    lmsService.createOrganization(org),
  get: (orgId: string) => lmsService.getOrganization(orgId),
  getBySlug: (slug: string) => lmsService.getOrganizationBySlug(slug),
  update: (orgId: string, updates: Partial<Organization>) =>
    lmsService.updateOrganization(orgId, updates),
  updateSettings: (orgId: string, settings: Partial<OrganizationSettings>) =>
    lmsService.updateOrganizationSettings(orgId, settings),
};
