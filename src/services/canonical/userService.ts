/**
 * User Service — Canonical Implementation
 *
 * Delegates to Django REST API:
 *   GET/PATCH /auth/me/               — current user profile
 *   GET       /organizations/{id}/members/  — org member list
 *   PATCH     /members/{id}/          — update member record
 *
 * All user operations go through this service.
 * Components should not bypass this layer.
 */

import { apiClient } from '../../lib/api';
import type { User, UserRole } from '../../types/schema';
import { activity } from './activityService';

export class UserNotFoundError extends Error {
  constructor(uid: string) {
    super(`User not found: ${uid}`);
    this.name = 'UserNotFoundError';
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(uid: string) {
    super(`User already exists: ${uid}`);
    this.name = 'UserAlreadyExistsError';
  }
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/** Map a Django OrganizationMember record (with nested user) to the frontend User shape. */
function mapMember(m: Record<string, unknown>, orgId?: string): User {
  const u = (m.user as Record<string, unknown>) ?? {};
  return {
    uid: u.id as string,
    email: u.email as string,
    displayName: (u.display_name as string) || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    photoUrl: (u.avatar as string) || undefined,
    orgId: orgId || (m.organization as string) || '',
    role: (m.role as UserRole) || 'learner',
    departmentId: (m.department as string) || undefined,
    teamId: (m.team as string) || undefined,
    managerId: undefined,
    isActive: (u.is_active as boolean) ?? true,
    xp: 0,
    level: 1,
    createdAt: u.date_joined ? new Date(u.date_joined as string).getTime() : Date.now(),
    lastLoginAt: u.last_login ? new Date(u.last_login as string).getTime() : Date.now(),
  };
}

/** Map a Django User record (from /auth/me/) to the frontend User shape. */
function mapCurrentUser(u: Record<string, unknown>): User {
  return {
    uid: u.id as string,
    email: u.email as string,
    displayName: (u.display_name as string) || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    photoUrl: (u.avatar as string) || undefined,
    orgId: '',
    role: 'learner',
    isActive: (u.is_active as boolean) ?? true,
    xp: 0,
    level: 1,
    createdAt: u.date_joined ? new Date(u.date_joined as string).getTime() : Date.now(),
    lastLoginAt: u.last_login ? new Date(u.last_login as string).getTime() : Date.now(),
  };
}

// ─── User operations ─────────────────────────────────────────────────────────

/**
 * Create a new user. Registration is handled by /auth/register/;
 * this returns the currently authenticated user's profile.
 */
export async function createUser(
  _uid: string,
  _data: Omit<User, 'uid' | 'createdAt' | 'lastLoginAt' | 'xp' | 'level'>
): Promise<User> {
  const { data } = await apiClient.get('/auth/me/');
  return mapCurrentUser(data);
}

/**
 * Get a user by UID. Only the authenticated user's own profile is directly accessible.
 */
export async function getUser(uid: string): Promise<User | null> {
  try {
    const { data } = await apiClient.get('/auth/me/');
    if ((data.id as string) === uid) return mapCurrentUser(data);
    return null;
  } catch {
    return null;
  }
}

/**
 * Get a user by UID, throwing if not found.
 */
export async function getUserOrThrow(uid: string): Promise<User> {
  const user = await getUser(uid);
  if (!user) throw new UserNotFoundError(uid);
  return user;
}

/**
 * Update a user's profile (limited fields for self-update).
 */
export async function updateUserProfile(
  _uid: string,
  updates: Pick<Partial<User>, 'displayName' | 'photoUrl'>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.displayName !== undefined) payload.display_name = updates.displayName;
  if (updates.photoUrl !== undefined) payload.avatar = updates.photoUrl;
  await apiClient.patch('/auth/me/', payload);
}

/**
 * Update a user (admin operation — can update role via membership record).
 */
export async function updateUser(
  uid: string,
  updates: Partial<Omit<User, 'uid' | 'createdAt'>>,
  updatedBy?: string
): Promise<void> {
  // Update profile fields on the account
  const profilePayload: Record<string, unknown> = {};
  if (updates.displayName !== undefined) profilePayload.display_name = updates.displayName;
  if (updates.photoUrl !== undefined) profilePayload.avatar = updates.photoUrl;
  if (updates.isActive !== undefined) profilePayload.is_active = updates.isActive;
  if (Object.keys(profilePayload).length) {
    await apiClient.patch('/auth/me/', profilePayload).catch(() => {});
  }

  // Update role on the OrganizationMember record
  if (updates.role !== undefined && updates.orgId) {
    const { data } = await apiClient.get(`/organizations/${updates.orgId}/members/`);
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    const membership = results.find(m => {
      const u = m.user as Record<string, unknown>;
      return (u.id as string) === uid;
    }) as Record<string, unknown> | undefined;

    if (membership) {
      const prevRole = (membership.role as string) || '';
      await apiClient.patch(`/members/${membership.id}/`, { role: updates.role });
      if (updatedBy && updates.role !== prevRole) {
        await activity.userRoleChange(updates.orgId, uid, prevRole, updates.role, updatedBy);
      }
    }
  }
}

/**
 * Update last login timestamp. Django JWT auth handles this server-side.
 */
export async function recordLogin(_uid: string): Promise<void> {
  // No-op: JWT auth records last login server-side.
}

/**
 * Get all users in an organization.
 */
export async function getUsersByOrg(orgId: string): Promise<User[]> {
  try {
    const { data } = await apiClient.get(`/organizations/${orgId}/members/`);
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results.map(m => mapMember(m, orgId));
  } catch {
    return [];
  }
}

/**
 * Get users by role in an organization.
 */
export async function getUsersByRole(orgId: string, role: UserRole): Promise<User[]> {
  try {
    const { data } = await apiClient.get(`/organizations/${orgId}/members/`, { params: { role } });
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results.map(m => mapMember(m, orgId));
  } catch {
    return [];
  }
}

/**
 * Get direct reports for a manager.
 * Manager hierarchy is not yet exposed via REST — returns empty list.
 */
export async function getDirectReports(_orgId: string, _managerId: string): Promise<User[]> {
  return [];
}

/**
 * Deactivate a user.
 */
export async function deactivateUser(uid: string, deactivatedBy: string): Promise<void> {
  await updateUser(uid, { isActive: false }, deactivatedBy);
}

/**
 * Reactivate a user.
 */
export async function reactivateUser(uid: string, reactivatedBy: string): Promise<void> {
  await updateUser(uid, { isActive: true }, reactivatedBy);
}

/**
 * Add XP to a user. XP is managed server-side by the gamification app.
 */
export async function addXP(
  _uid: string,
  _xpAmount: number
): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  return { newXP: 0, newLevel: 1, leveledUp: false };
}

export const userService = {
  createUser,
  getUser,
  getUserOrThrow,
  updateUserProfile,
  updateUser,
  recordLogin,
  getUsersByOrg,
  getUsersByRole,
  getDirectReports,
  deactivateUser,
  reactivateUser,
  addXP,
};

export default userService;
