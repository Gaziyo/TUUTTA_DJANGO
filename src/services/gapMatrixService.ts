/**
 * Gap Matrix Service
 *
 * Cognitive OS — Learning gap analysis layer.
 * Delegates to Django REST API:
 *   /organizations/{orgId}/gap-matrix/
 *
 * A GapMatrix record captures the delta between a learner's current Bloom
 * mastery level and the target level required by a competency.
 */

import { apiClient } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GapMatrixEntry {
  id: string;
  userId: string;
  orgId: string;
  competencyId?: string;
  competencyName?: string;
  currentBloomLevel: number;
  targetBloomLevel: number;
  /** Normalised gap score 0.0–1.0 (higher = larger gap). */
  gapScore: number;
  /** Priority 1 (highest) to 5 (lowest). */
  priority: 1 | 2 | 3 | 4 | 5;
  recommendedCourseId?: string;
  recommendedCourseTitle?: string;
  status: 'open' | 'in_progress' | 'closed';
  createdAt: number;
  updatedAt: number;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapEntry(g: Record<string, unknown>): GapMatrixEntry {
  return {
    id: g.id as string,
    userId: g.user as string,
    orgId: g.organization as string,
    competencyId: (g.competency as string) || undefined,
    competencyName: (g.competency_name as string) || undefined,
    currentBloomLevel: (g.current_bloom_level as number) || 1,
    targetBloomLevel: (g.target_bloom_level as number) || 1,
    gapScore: parseFloat(g.gap_score as string) || 0,
    priority: ((g.priority as number) || 3) as GapMatrixEntry['priority'],
    recommendedCourseId: (g.recommended_course as string) || undefined,
    recommendedCourseTitle: (g.recommended_course_title as string) || undefined,
    status: (g.status as GapMatrixEntry['status']) || 'open',
    createdAt: g.created_at ? new Date(g.created_at as string).getTime() : Date.now(),
    updatedAt: g.updated_at ? new Date(g.updated_at as string).getTime() : Date.now(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const gapMatrixService = {
  /**
   * List gap matrix entries for an organization.
   * Non-admin users only see their own entries (enforced server-side).
   */
  listForOrg: async (
    orgId: string,
    options?: { status?: GapMatrixEntry['status']; priority?: number }
  ): Promise<GapMatrixEntry[]> => {
    try {
      const params: Record<string, string> = {};
      if (options?.status) params.status = options.status;
      if (options?.priority !== undefined) params.priority = String(options.priority);
      const { data } = await apiClient.get(`/organizations/${orgId}/gap-matrix/`, { params });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapEntry);
    } catch {
      return [];
    }
  },

  /**
   * List gap matrix entries for a specific user.
   */
  listForUser: async (
    orgId: string,
    userId: string,
    options?: { status?: GapMatrixEntry['status'] }
  ): Promise<GapMatrixEntry[]> => {
    try {
      const params: Record<string, string> = { user: userId };
      if (options?.status) params.status = options.status;
      const { data } = await apiClient.get(`/organizations/${orgId}/gap-matrix/`, { params });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapEntry);
    } catch {
      return [];
    }
  },

  /**
   * Get a single gap matrix entry.
   */
  get: async (orgId: string, entryId: string): Promise<GapMatrixEntry | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/gap-matrix/${entryId}/`);
      return mapEntry(data);
    } catch {
      return null;
    }
  },

  /**
   * Create a new gap matrix entry.
   */
  create: async (
    orgId: string,
    data: {
      userId: string;
      competencyId?: string;
      currentBloomLevel: number;
      targetBloomLevel: number;
      gapScore?: number;
      priority?: GapMatrixEntry['priority'];
      recommendedCourseId?: string;
    }
  ): Promise<GapMatrixEntry> => {
    const { data: res } = await apiClient.post(`/organizations/${orgId}/gap-matrix/`, {
      organization: orgId,
      user: data.userId,
      competency: data.competencyId ?? null,
      current_bloom_level: data.currentBloomLevel,
      target_bloom_level: data.targetBloomLevel,
      gap_score: data.gapScore ?? (data.targetBloomLevel - data.currentBloomLevel) / 5,
      priority: data.priority ?? 3,
      recommended_course: data.recommendedCourseId ?? null,
      status: 'open',
    });
    return mapEntry(res);
  },

  /**
   * Update the status or priority of a gap matrix entry.
   */
  update: async (
    orgId: string,
    entryId: string,
    updates: Partial<Pick<GapMatrixEntry, 'status' | 'priority' | 'recommendedCourseId'>>
  ): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.recommendedCourseId !== undefined) payload.recommended_course = updates.recommendedCourseId;
    await apiClient.patch(`/organizations/${orgId}/gap-matrix/${entryId}/`, payload);
  },

  /**
   * Close (resolve) a gap matrix entry.
   */
  close: async (orgId: string, entryId: string): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/gap-matrix/${entryId}/`, { status: 'closed' });
  },

  /**
   * Delete a gap matrix entry.
   */
  delete: async (orgId: string, entryId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/gap-matrix/${entryId}/`);
  },

  /**
   * Compute a simple gap score from bloom levels if not supplied by the API.
   * Returns a 0.0–1.0 value.
   */
  computeGapScore: (currentLevel: number, targetLevel: number): number => {
    const gap = Math.max(0, targetLevel - currentLevel);
    return Math.min(1, gap / 5);
  },

  /**
   * Sort entries by priority then gap score (highest urgency first).
   */
  sortByUrgency: (entries: GapMatrixEntry[]): GapMatrixEntry[] => {
    return [...entries].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.gapScore - a.gapScore;
    });
  },
};

export default gapMatrixService;
