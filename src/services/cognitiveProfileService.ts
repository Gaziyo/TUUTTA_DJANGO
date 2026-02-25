/**
 * Cognitive Profile Service
 *
 * Cognitive OS — Learner intelligence layer.
 * Delegates to Django REST API:
 *   /organizations/{orgId}/cognitive-profiles/
 *
 * Each user has at most one CognitiveProfile per organization
 * (unique_together=[user, organization]).
 */

import { apiClient } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Bloom's taxonomy level mastery (keys 1-6) */
export type BloomMastery = Record<string, number>;

/** Modality strength scores (reading/writing/listening/speaking/math/general_knowledge) */
export type ModalityStrengths = Record<string, number>;

export type Modality = 'reading' | 'writing' | 'listening' | 'speaking' | 'math' | 'general_knowledge';

export interface CognitiveProfile {
  id: string;
  userId: string;
  orgId: string;
  bloomMastery: BloomMastery;
  modalityStrengths: ModalityStrengths;
  preferredModality?: Modality;
  avgResponseTimeMs?: number;
  accuracyByDifficulty: Record<string, number>;
  totalQuestionsAnswered: number;
  totalAssessmentsTaken: number;
  lastAssessmentAt?: number;
  createdAt: number;
  updatedAt: number;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapProfile(p: Record<string, unknown>): CognitiveProfile {
  return {
    id: p.id as string,
    userId: p.user as string,
    orgId: p.organization as string,
    bloomMastery: (p.bloom_mastery as BloomMastery) || {},
    modalityStrengths: (p.modality_strengths as ModalityStrengths) || {},
    preferredModality: (p.preferred_modality as Modality) || undefined,
    avgResponseTimeMs: (p.avg_response_time_ms as number) || undefined,
    accuracyByDifficulty: (p.accuracy_by_difficulty as Record<string, number>) || {},
    totalQuestionsAnswered: (p.total_questions_answered as number) || 0,
    totalAssessmentsTaken: (p.total_assessments_taken as number) || 0,
    lastAssessmentAt: p.last_assessment_at
      ? new Date(p.last_assessment_at as string).getTime()
      : undefined,
    createdAt: p.created_at ? new Date(p.created_at as string).getTime() : Date.now(),
    updatedAt: p.updated_at ? new Date(p.updated_at as string).getTime() : Date.now(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const cognitiveProfileService = {
  /**
   * Get the cognitive profile for the current user in an organization.
   */
  getForCurrentUser: async (orgId: string): Promise<CognitiveProfile | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/cognitive-profiles/`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.length ? mapProfile(results[0]) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get a specific cognitive profile by ID.
   */
  get: async (orgId: string, profileId: string): Promise<CognitiveProfile | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/cognitive-profiles/${profileId}/`);
      return mapProfile(data);
    } catch {
      return null;
    }
  },

  /**
   * List all cognitive profiles for an organization (staff/admin only).
   */
  listForOrg: async (orgId: string): Promise<CognitiveProfile[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/cognitive-profiles/`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapProfile);
    } catch {
      return [];
    }
  },

  /**
   * Create a new cognitive profile.
   */
  create: async (
    orgId: string,
    userId: string,
    data?: Partial<Pick<CognitiveProfile, 'bloomMastery' | 'modalityStrengths' | 'preferredModality'>>
  ): Promise<CognitiveProfile> => {
    const { data: res } = await apiClient.post(`/organizations/${orgId}/cognitive-profiles/`, {
      organization: orgId,
      user: userId,
      bloom_mastery: data?.bloomMastery ?? {},
      modality_strengths: data?.modalityStrengths ?? {},
      preferred_modality: data?.preferredModality ?? null,
    });
    return mapProfile(res);
  },

  /**
   * Update a cognitive profile.
   */
  update: async (
    orgId: string,
    profileId: string,
    updates: Partial<Pick<
      CognitiveProfile,
      'bloomMastery' | 'modalityStrengths' | 'preferredModality' |
      'avgResponseTimeMs' | 'accuracyByDifficulty'
    >>
  ): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.bloomMastery !== undefined) payload.bloom_mastery = updates.bloomMastery;
    if (updates.modalityStrengths !== undefined) payload.modality_strengths = updates.modalityStrengths;
    if (updates.preferredModality !== undefined) payload.preferred_modality = updates.preferredModality;
    if (updates.avgResponseTimeMs !== undefined) payload.avg_response_time_ms = updates.avgResponseTimeMs;
    if (updates.accuracyByDifficulty !== undefined) payload.accuracy_by_difficulty = updates.accuracyByDifficulty;
    await apiClient.patch(`/organizations/${orgId}/cognitive-profiles/${profileId}/`, payload);
  },

  /**
   * Compute the dominant Bloom level from a mastery map.
   */
  getDominantBloomLevel: (profile: CognitiveProfile): number => {
    const mastery = profile.bloomMastery;
    let best = 1;
    let bestScore = -1;
    for (const [level, score] of Object.entries(mastery)) {
      if (score > bestScore) {
        bestScore = score;
        best = parseInt(level, 10);
      }
    }
    return best;
  },

  /**
   * Compute the preferred modality from a strengths map.
   */
  getDominantModality: (profile: CognitiveProfile): Modality => {
    const strengths = profile.modalityStrengths;
    let best: Modality = 'reading';
    let bestScore = -1;
    for (const [modality, score] of Object.entries(strengths)) {
      if (score > bestScore) {
        bestScore = score;
        best = modality as Modality;
      }
    }
    return profile.preferredModality ?? best;
  },
};

export default cognitiveProfileService;
