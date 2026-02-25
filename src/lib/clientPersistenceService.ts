/**
 * Client persistence helpers.
 *
 * Firebase/Firestore has been removed from the web client.
 * These helpers keep lightweight, user-scoped local persistence
 * for UI features that do not yet have dedicated Django endpoints.
 */

const ASSESSMENTS_PREFIX = 'tuutta:assessments:';

function keyForUser(userId: string): string {
  return `${ASSESSMENTS_PREFIX}${userId}`;
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export const saveAssessment = async (
  userId: string,
  assessment: Record<string, unknown>
): Promise<void> => {
  const key = keyForUser(userId);
  const existing = readList<Record<string, unknown>>(key);
  writeList(key, [assessment, ...existing]);
};

export const getAssessments = async (userId: string): Promise<Record<string, unknown>[]> => {
  return readList<Record<string, unknown>>(keyForUser(userId));
};

export const deleteAssessment = async (userId: string, assessmentId: string): Promise<void> => {
  const key = keyForUser(userId);
  const existing = readList<Record<string, unknown>>(key);
  const filtered = existing.filter(item => String(item.id ?? '') !== assessmentId);
  writeList(key, filtered);
};

