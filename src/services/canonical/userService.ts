/**
 * User Service — Canonical Implementation
 *
 * Collection: /users/{uid}
 *
 * All user operations go through this service.
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

/**
 * Create a new user document.
 */
export async function createUser(
  uid: string,
  data: Omit<User, 'uid' | 'createdAt' | 'lastLoginAt' | 'xp' | 'level'>
): Promise<User> {
  const userRef = doc(db, 'users', uid);

  // Check if user already exists
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    throw new UserAlreadyExistsError(uid);
  }

  const user: User = {
    uid,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    orgId: data.orgId,
    role: data.role,
    departmentId: data.departmentId,
    teamId: data.teamId,
    managerId: data.managerId,
    isActive: data.isActive ?? true,
    xp: 0,
    level: 1,
    createdAt: serverTimestamp() as any,
    lastLoginAt: serverTimestamp() as any,
  };

  await setDoc(userRef, user);
  return user;
}

/**
 * Get a user by UID.
 */
export async function getUser(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as User;
}

/**
 * Get a user by UID, throwing if not found.
 */
export async function getUserOrThrow(uid: string): Promise<User> {
  const user = await getUser(uid);
  if (!user) {
    throw new UserNotFoundError(uid);
  }
  return user;
}

/**
 * Update a user's profile (limited fields for self-update).
 */
export async function updateUserProfile(
  uid: string,
  updates: Pick<Partial<User>, 'displayName' | 'photoUrl'>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, updates);
}

/**
 * Update a user (admin operation — can update more fields).
 */
export async function updateUser(
  uid: string,
  updates: Partial<Omit<User, 'uid' | 'createdAt'>>,
  updatedBy?: string
): Promise<void> {
  const user = await getUserOrThrow(uid);
  const userRef = doc(db, 'users', uid);

  // Track role changes for audit
  if (updates.role && updates.role !== user.role && updatedBy) {
    await activity.userRoleChange(
      user.orgId,
      uid,
      user.role,
      updates.role,
      updatedBy
    );
  }

  await updateDoc(userRef, updates);
}

/**
 * Update last login timestamp.
 */
export async function recordLogin(uid: string): Promise<void> {
  const user = await getUser(uid);
  if (!user) return;

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp(),
  });

  await activity.userLogin(user.orgId, uid);
}

/**
 * Get all users in an organization.
 */
export async function getUsersByOrg(orgId: string): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('orgId', '==', orgId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data() as User);
}

/**
 * Get users by role in an organization.
 */
export async function getUsersByRole(
  orgId: string,
  role: UserRole
): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('orgId', '==', orgId),
    where('role', '==', role)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data() as User);
}

/**
 * Get direct reports for a manager.
 */
export async function getDirectReports(
  orgId: string,
  managerId: string
): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('orgId', '==', orgId),
    where('managerId', '==', managerId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data() as User);
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
 * Add XP to a user and level up if necessary.
 */
export async function addXP(uid: string, xpAmount: number): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  const user = await getUserOrThrow(uid);
  const newXP = user.xp + xpAmount;

  // Simple leveling formula: level = floor(sqrt(xp / 100)) + 1
  const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
  const leveledUp = newLevel > user.level;

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    xp: newXP,
    level: newLevel,
  });

  return { newXP, newLevel, leveledUp };
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
