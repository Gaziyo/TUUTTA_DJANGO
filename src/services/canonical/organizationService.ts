/**
 * Organization Service — Canonical Implementation
 *
 * Collection: /organizations/{orgId}
 *
 * All organization operations go through this service.
 * Components NEVER call Firestore directly.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Organization } from '../../types/schema';

export class OrganizationNotFoundError extends Error {
  constructor(orgId: string) {
    super(`Organization not found: ${orgId}`);
    this.name = 'OrganizationNotFoundError';
  }
}

/**
 * Create a new organization.
 */
export async function createOrganization(
  data: Omit<Organization, 'id' | 'createdAt'>
): Promise<Organization> {
  const orgRef = doc(collection(db, 'organizations'));

  const organization: Organization = {
    id: orgRef.id,
    name: data.name,
    plan: data.plan ?? 'free',
    allowSelfEnrollment: data.allowSelfEnrollment ?? false,
    requireManagerApproval: data.requireManagerApproval ?? false,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(orgRef, organization);
  return organization;
}

/**
 * Get an organization by ID.
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const orgRef = doc(db, 'organizations', orgId);
  const snapshot = await getDoc(orgRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Organization;
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
  await getOrganizationOrThrow(orgId);
  const orgRef = doc(db, 'organizations', orgId);
  await updateDoc(orgRef, updates);
}

/**
 * Update organization plan.
 */
export async function updatePlan(
  orgId: string,
  plan: Organization['plan']
): Promise<void> {
  await updateOrganization(orgId, { plan });
}

/**
 * Update self-enrollment setting.
 */
export async function setSelfEnrollment(
  orgId: string,
  allowSelfEnrollment: boolean
): Promise<void> {
  await updateOrganization(orgId, { allowSelfEnrollment });
}

/**
 * Update manager approval requirement.
 */
export async function setManagerApprovalRequired(
  orgId: string,
  requireManagerApproval: boolean
): Promise<void> {
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
