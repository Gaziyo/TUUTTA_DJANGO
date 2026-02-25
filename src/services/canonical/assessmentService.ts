/**
 * Assessment Service — Canonical Implementation
 *
 * Delegates to Django REST API:
 *   /assessments/         — assessment CRUD
 *   /assessments/{id}/questions/  — question CRUD
 *
 * Assessment results are graded client-side and logged via observabilityService.
 * A dedicated /assessment-attempts/ endpoint will be added in a future phase.
 *
 * All assessment operations go through this service.
 * Components NEVER call Firestore directly.
 */

import { apiClient } from '../../lib/api';
import { observabilityService } from '../observabilityService';
import type {
  Assessment,
  AssessmentResult,
  Question,
  AnswerRecord,
  AssessmentType,
} from '../../types/schema';
import { activity } from './activityService';
import { enrollmentService } from './enrollmentService';

export class AssessmentNotFoundError extends Error {
  constructor(assessmentId: string) {
    super(`Assessment not found: ${assessmentId}`);
    this.name = 'AssessmentNotFoundError';
  }
}

export class MaxAttemptsReachedError extends Error {
  constructor(assessmentId: string, maxAttempts: number) {
    super(`Maximum attempts (${maxAttempts}) reached for assessment ${assessmentId}`);
    this.name = 'MaxAttemptsReachedError';
  }
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapAssessment(data: Record<string, unknown>): Assessment {
  const questions: Question[] = ((data.questions as Record<string, unknown>[]) ?? []).map(q => ({
    id: q.id as string,
    text: (q.text as string) || (q.question_text as string) || '',
    type: (q.type as Question['type']) || 'multiple_choice',
    options: (q.options as string[]) || [],
    correctAnswer: (q.correct_answer as string) || '',
    points: (q.points as number) || 1,
    explanation: (q.explanation as string) || undefined,
  }));

  return {
    id: data.id as string,
    orgId: (data.organization as string) || '',
    courseId: (data.course as string) || '',
    lessonId: (data.lesson as string) || undefined,
    title: data.title as string,
    type: (data.assessment_type as AssessmentType) || 'quiz',
    questions,
    passMark: (data.pass_mark as number) ?? 70,
    maxAttempts: (data.max_attempts as number) ?? null,
    createdBy: (data.created_by as string) || '',
    createdAt: data.created_at ? new Date(data.created_at as string).getTime() : Date.now(),
  };
}

// ─── Assessment CRUD ──────────────────────────────────────────────────────────

/**
 * Create a new assessment.
 */
export async function createAssessment(
  data: Omit<Assessment, 'id' | 'createdAt'>
): Promise<Assessment> {
  const { data: res } = await apiClient.post('/assessments/', {
    organization: data.orgId,
    course: data.courseId,
    lesson: data.lessonId,
    title: data.title,
    assessment_type: data.type,
    pass_mark: data.passMark ?? 70,
    max_attempts: data.maxAttempts,
  });
  return mapAssessment(res);
}

/**
 * Get an assessment by ID.
 */
export async function getAssessment(assessmentId: string): Promise<Assessment | null> {
  try {
    const { data } = await apiClient.get(`/assessments/${assessmentId}/`);
    return mapAssessment(data);
  } catch {
    return null;
  }
}

/**
 * Get an assessment by ID, throwing if not found.
 */
export async function getAssessmentOrThrow(assessmentId: string): Promise<Assessment> {
  const assessment = await getAssessment(assessmentId);
  if (!assessment) throw new AssessmentNotFoundError(assessmentId);
  return assessment;
}

/**
 * Get assessments for a course.
 */
export async function getAssessmentsForCourse(
  _orgId: string,
  courseId: string
): Promise<Assessment[]> {
  try {
    const { data } = await apiClient.get('/assessments/', { params: { course: courseId } });
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results.map(mapAssessment);
  } catch {
    return [];
  }
}

/**
 * Get assessment for a specific lesson.
 */
export async function getAssessmentForLesson(
  _orgId: string,
  courseId: string,
  lessonId: string
): Promise<Assessment | null> {
  try {
    const { data } = await apiClient.get('/assessments/', { params: { course: courseId, lesson: lessonId } });
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    if (!results.length) return null;
    return mapAssessment(results[0]);
  } catch {
    return null;
  }
}

/**
 * Update an assessment.
 */
export async function updateAssessment(
  assessmentId: string,
  updates: Partial<Omit<Assessment, 'id' | 'orgId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.type !== undefined) payload.assessment_type = updates.type;
  if (updates.passMark !== undefined) payload.pass_mark = updates.passMark;
  if (updates.maxAttempts !== undefined) payload.max_attempts = updates.maxAttempts;
  await apiClient.patch(`/assessments/${assessmentId}/`, payload);
}

// ─── Grading (pure computation) ───────────────────────────────────────────────

function gradeAnswers(
  questions: Question[],
  givenAnswers: Record<string, string | string[]>
): { answers: AnswerRecord[]; totalScore: number; maxScore: number } {
  const answers: AnswerRecord[] = [];
  let totalScore = 0;
  let maxScore = 0;

  for (const question of questions) {
    maxScore += question.points;
    const givenAnswer = givenAnswers[question.id] ?? '';

    let isCorrect = false;

    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      const correct = Array.isArray(question.correctAnswer)
        ? question.correctAnswer[0]
        : question.correctAnswer;
      const given = Array.isArray(givenAnswer) ? givenAnswer[0] : givenAnswer;
      isCorrect = given.toLowerCase().trim() === correct.toLowerCase().trim();
    } else if (question.type === 'short_answer') {
      const correct = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];
      const given = Array.isArray(givenAnswer) ? givenAnswer[0] : givenAnswer;
      isCorrect = correct.some(
        ans => ans.toLowerCase().trim() === given.toLowerCase().trim()
      );
    }

    const pointsEarned = isCorrect ? question.points : 0;
    totalScore += pointsEarned;

    answers.push({
      questionId: question.id,
      givenAnswer,
      isCorrect,
      pointsEarned,
    });
  }

  return { answers, totalScore, maxScore };
}

// ─── Result operations ────────────────────────────────────────────────────────

/**
 * Submit an assessment result.
 *
 * Grades answers client-side and logs via observabilityService.
 * Persists results to a Django /assessment-attempts/ endpoint when available.
 */
export async function submitResult(
  orgId: string,
  userId: string,
  courseId: string,
  assessmentId: string,
  givenAnswers: Record<string, string | string[]>,
  startedAt: Date
): Promise<AssessmentResult> {
  const assessment = await getAssessmentOrThrow(assessmentId);

  const enrollment = await enrollmentService.getEnrollmentForUserCourse(orgId, userId, courseId);
  if (!enrollment) throw new Error('User is not enrolled in this course');

  const previousAttempts = await getResultsForUserAssessment(userId, assessmentId);
  const attemptNumber = previousAttempts.length + 1;

  if (assessment.maxAttempts !== null && attemptNumber > assessment.maxAttempts) {
    throw new MaxAttemptsReachedError(assessmentId, assessment.maxAttempts);
  }

  const { answers, totalScore, maxScore } = gradeAnswers(assessment.questions, givenAnswers);
  const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = scorePercent >= assessment.passMark;

  const result: AssessmentResult = {
    id: `result_${Date.now()}`,
    orgId,
    userId,
    courseId,
    assessmentId,
    enrollmentId: enrollment.id,
    attempt: attemptNumber,
    score: scorePercent,
    passed,
    answers,
    startedAt: startedAt as any,
    submittedAt: new Date() as any,
  };

  // Log result via observabilityService
  observabilityService.logUserAction({
    orgId,
    actorId: userId,
    action: 'assessment_submitted',
    status: 'success',
    entityType: 'assessment',
    entityId: assessmentId,
    metadata: { score: scorePercent, passed, attempt: attemptNumber, courseId },
  }).catch(() => {});

  await activity.quizSubmit(orgId, userId, assessmentId, scorePercent, passed);

  return result;
}

/**
 * Get all results for a user and assessment.
 * Returns empty list until a Django /assessment-attempts/ endpoint is available.
 */
export async function getResultsForUserAssessment(
  _userId: string,
  _assessmentId: string
): Promise<AssessmentResult[]> {
  return [];
}

/**
 * Get all results for a user in a course.
 */
export async function getResultsForUserCourse(
  _userId: string,
  _courseId: string
): Promise<AssessmentResult[]> {
  return [];
}

/**
 * Get all results for an assessment (instructor/admin view).
 */
export async function getResultsForAssessment(
  _orgId: string,
  _assessmentId: string
): Promise<AssessmentResult[]> {
  return [];
}

/**
 * Get all results for an organization (admin reporting).
 */
export async function getResultsForOrg(
  _orgId: string,
  _limitCount = 100
): Promise<AssessmentResult[]> {
  return [];
}

/**
 * Check remaining attempts. Returns null (unlimited) until attempts endpoint is available.
 */
export async function getRemainingAttempts(
  _userId: string,
  assessmentId: string
): Promise<number | null> {
  const assessment = await getAssessment(assessmentId);
  return assessment?.maxAttempts ?? null;
}

/**
 * Get the best score for a user on an assessment. Returns null until attempts endpoint is available.
 */
export async function getBestScore(
  _userId: string,
  _assessmentId: string
): Promise<number | null> {
  return null;
}

export const assessmentService = {
  // Assessments
  createAssessment,
  getAssessment,
  getAssessmentOrThrow,
  getAssessmentsForCourse,
  getAssessmentForLesson,
  updateAssessment,

  // Results
  submitResult,
  getResultsForUserAssessment,
  getResultsForUserCourse,
  getResultsForAssessment,
  getResultsForOrg,
  getRemainingAttempts,
  getBestScore,
};

export default assessmentService;
