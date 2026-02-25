/**
 * Assessment Service — Migration Adapter
 *
 * This service bridges the legacy assessment types with the canonical
 * assessmentService (canonical/assessmentService.ts).
 *
 * Canonical architecture:
 *   /assessments/{assessmentId} — Assessment definitions
 *   /assessmentResults/{resultId} — Submitted results
 */

import type { AssessmentResult as LegacyAssessmentResult } from '../types/lms';
import type {
  Assessment as CanonicalAssessment,
  AssessmentResult as CanonicalResult,
} from '../types/schema';
import {
  assessmentService as canonical,
} from './canonical';
import { serviceEvents } from './events';

/**
 * Convert canonical AssessmentResult to legacy format.
 */
function toLegacyResult(result: CanonicalResult): LegacyAssessmentResult {
  return {
    id: result.id,
    orgId: result.orgId,
    userId: result.userId,
    userAuthId: result.userId,
    courseId: result.courseId,
    assessmentId: result.assessmentId,
    enrollmentId: result.enrollmentId,
    attempt: result.attempt,
    score: result.score,
    passed: result.passed,
    answers: result.answers.map(a => ({
      questionId: a.questionId,
      answer: a.givenAnswer,
      isCorrect: a.isCorrect,
      pointsEarned: a.pointsEarned,
    })),
    startedAt: result.startedAt ? (result.startedAt as any).toMillis?.() || Date.now() : Date.now(),
    submittedAt: result.submittedAt ? (result.submittedAt as any).toMillis?.() || Date.now() : Date.now(),
    createdAt: result.submittedAt ? (result.submittedAt as any).toMillis?.() || Date.now() : Date.now(),
    updatedAt: result.submittedAt ? (result.submittedAt as any).toMillis?.() || Date.now() : Date.now(),
  };
}

export const assessmentService = {
  // ─── ASSESSMENT DEFINITIONS ──────────────────────────────────────────────────

  /**
   * Get an assessment by ID.
   */
  getAssessment: async (assessmentId: string): Promise<CanonicalAssessment | null> => {
    try {
      return canonical.getAssessment(assessmentId);
    } catch (error) {
      console.warn('[assessmentService] Error getting assessment:', error);
      return null;
    }
  },

  /**
   * Get assessments for a course.
   */
  getAssessmentsForCourse: async (orgId: string, courseId: string): Promise<CanonicalAssessment[]> => {
    try {
      return canonical.getAssessmentsForCourse(orgId, courseId);
    } catch (error) {
      console.warn('[assessmentService] Error getting assessments for course:', error);
      return [];
    }
  },

  /**
   * Get assessment for a specific lesson.
   */
  getAssessmentForLesson: async (
    orgId: string,
    courseId: string,
    lessonId: string
  ): Promise<CanonicalAssessment | null> => {
    try {
      return canonical.getAssessmentForLesson(orgId, courseId, lessonId);
    } catch (error) {
      console.warn('[assessmentService] Error getting assessment for lesson:', error);
      return null;
    }
  },

  /**
   * Create a new assessment.
   */
  createAssessment: async (
    data: Omit<CanonicalAssessment, 'id' | 'createdAt'>
  ): Promise<CanonicalAssessment> => {
    return canonical.createAssessment(data);
  },

  /**
   * Update an assessment.
   */
  updateAssessment: async (
    assessmentId: string,
    updates: Partial<CanonicalAssessment>
  ): Promise<void> => {
    return canonical.updateAssessment(assessmentId, updates);
  },

  // ─── RESULT SUBMISSION ───────────────────────────────────────────────────────

  /**
   * Submit quiz/assessment result.
   * This is the core submission function that grades and records results.
   */
  submitResult: async (
    orgId: string,
    userId: string,
    courseId: string,
    assessmentId: string,
    answers: Record<string, string | string[]>,
    startedAt: Date
  ): Promise<CanonicalResult> => {
    try {
      const result = await canonical.submitResult(
        orgId,
        userId,
        courseId,
        assessmentId,
        answers,
        startedAt
      );

      serviceEvents.emit('assessment.submitted', {
        assessmentId: result.assessmentId,
        enrollmentId: result.enrollmentId,
        score: result.score,
        passed: result.passed,
      });

      return result;
    } catch (error) {
      console.error('[assessmentService] Error submitting result:', error);
      throw error;
    }
  },

  /**
   * Get remaining attempts for an assessment.
   */
  getRemainingAttempts: async (
    userId: string,
    assessmentId: string
  ): Promise<number | null> => {
    try {
      return canonical.getRemainingAttempts(userId, assessmentId);
    } catch (error) {
      console.warn('[assessmentService] Error getting remaining attempts:', error);
      return null;
    }
  },

  /**
   * Get best score for a user on an assessment.
   */
  getBestScore: async (
    userId: string,
    assessmentId: string
  ): Promise<number | null> => {
    try {
      return canonical.getBestScore(userId, assessmentId);
    } catch (error) {
      console.warn('[assessmentService] Error getting best score:', error);
      return null;
    }
  },

  /**
   * Get all results for a user on an assessment.
   */
  getResultsForUserAssessment: async (
    userId: string,
    assessmentId: string
  ): Promise<LegacyAssessmentResult[]> => {
    try {
      const results = await canonical.getResultsForUserAssessment(userId, assessmentId);
      return results.map(toLegacyResult);
    } catch (error) {
      console.warn('[assessmentService] Error getting results:', error);
      return [];
    }
  },

  /**
   * List results for an organization.
   */
  listForOrg: async (orgId: string, limitCount = 200): Promise<LegacyAssessmentResult[]> => {
    try {
      const results = await canonical.getResultsForOrg(orgId, limitCount);
      return results.map(toLegacyResult);
    } catch (error) {
      console.warn('[assessmentService] Error in listForOrg:', error);
      return [];
    }
  },
};

export default assessmentService;
