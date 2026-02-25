/**
 * Organization Service — Canonical Implementation (Django API)
 *
 * Uses apiClient to call the Django REST API.
 */

import { apiClient } from '../../lib/api';
import type { Organization } from '../../types/schema';

export class OrganizationNotFoundError extends Error {
  constructor(orgId: string) {
    super(`Organization not found: ${orgId}`);
    this.name = 'OrganizationNotFoundError';
  }
}

// Map Django plan values to schema plan values
function mapPlan(plan: string): Organization['plan'] {
  const map: Record<string, Organization['plan']> = {
    free: 'free',
    starter: 'starter',
    professional: 'pro',
    enterprise: 'enterprise',
  };
  return map[plan] ?? 'free';
}

function mapOrg(data: Record<string, unknown>): Organization {
  const settings = (data.settings ?? {}) as Record<string, unknown>;
  return {
    id: data.id as string,
    name: data.name as string,
    plan: mapPlan(data.plan as string),
    allowSelfEnrollment: (settings.allowSelfEnrollment as boolean) ?? false,
    requireManagerApproval: (settings.requireManagerApproval as boolean) ?? false,
    createdAt: data.created_at as any,
  };
}

/**
 * Create a new organization.
 */
export async function createOrganization(
  data: Omit<Organization, 'id' | 'createdAt'>
): Promise<Organization> {
  const payload = {
    name: data.name,
    slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    plan: data.plan === 'pro' ? 'professional' : data.plan,
    settings: {
      allowSelfEnrollment: data.allowSelfEnrollment ?? false,
      requireManagerApproval: data.requireManagerApproval ?? false,
    },
  };
  const { data: result } = await apiClient.post('/organizations/', payload);
  return mapOrg(result);
}

/**
 * Get an organization by ID.
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  try {
    const { data } = await apiClient.get(`/organizations/${orgId}/`);
    return mapOrg(data);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number } };
    if (axiosErr?.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Get an organization by ID, throwing if not found.
 */
export async function getOrganizationOrThrow(orgId: string): Promise<Organization> {
  const org = await getOrganization(orgId);
  if (!org) {
    throw new OrganizationNotFoundError(orgId);
  }
  return org;
}

/**
 * Update an organization.
 */
export async function updateOrganization(
  orgId: string,
  updates: Partial<Omit<Organization, 'id' | 'createdAt'>>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.plan !== undefined) payload.plan = updates.plan === 'pro' ? 'professional' : updates.plan;
  if (updates.allowSelfEnrollment !== undefined || updates.requireManagerApproval !== undefined) {
    // Fetch current settings to merge
    const { data: current } = await apiClient.get(`/organizations/${orgId}/`);
    payload.settings = {
      ...(current.settings ?? {}),
      ...(updates.allowSelfEnrollment !== undefined ? { allowSelfEnrollment: updates.allowSelfEnrollment } : {}),
      ...(updates.requireManagerApproval !== undefined ? { requireManagerApproval: updates.requireManagerApproval } : {}),
    };
  }
  await apiClient.patch(`/organizations/${orgId}/`, payload);
}

/**
 * Update organization plan.
 */
export async function updatePlan(orgId: string, plan: Organization['plan']): Promise<void> {
  await updateOrganization(orgId, { plan });
}

/**
 * Update self-enrollment setting.
 */
export async function setSelfEnrollment(orgId: string, allowSelfEnrollment: boolean): Promise<void> {
  await updateOrganization(orgId, { allowSelfEnrollment });
}

/**
 * Update manager approval requirement.
 */
export async function setManagerApprovalRequired(orgId: string, requireManagerApproval: boolean): Promise<void> {
  await updateOrganization(orgId, { requireManagerApproval });
}

/**
 * Check if self-enrollment is allowed.
 */
export async function canSelfEnroll(orgId: string): Promise<boolean> {
  const org = await getOrganization(orgId);
  return org?.allowSelfEnrollment ?? false;
}

export const organizationService = {
  createOrganization,
  getOrganization,
  getOrganizationOrThrow,
  updateOrganization,
  updatePlan,
  setSelfEnrollment,
  setManagerApprovalRequired,
  canSelfEnroll,
};

export default organizationService;
