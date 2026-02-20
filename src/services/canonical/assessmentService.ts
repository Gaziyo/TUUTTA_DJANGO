/**
 * Assessment Service — Canonical Implementation
 *
 * Collections:
 *   /assessments/{assessmentId}
 *   /assessmentResults/{resultId}
 *
 * All assessment operations go through this service.
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
  orderBy,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type {
  Assessment,
  AssessmentResult,
  Question,
  AnswerRecord,
  QuestionType,
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

// ─── ASSESSMENT OPERATIONS ────────────────────────────────────────────────────

/**
 * Create a new assessment.
 */
export async function createAssessment(
  data: Omit<Assessment, 'id' | 'createdAt'>
): Promise<Assessment> {
  const assessmentRef = doc(collection(db, 'assessments'));

  const assessment: Assessment = {
    id: assessmentRef.id,
    orgId: data.orgId,
    courseId: data.courseId,
    lessonId: data.lessonId,
    title: data.title,
    type: data.type,
    questions: data.questions,
    passMark: data.passMark ?? 70,
    maxAttempts: data.maxAttempts,
    createdBy: data.createdBy,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(assessmentRef, assessment);
  return assessment;
}

/**
 * Get an assessment by ID.
 */
export async function getAssessment(assessmentId: string): Promise<Assessment | null> {
  const assessmentRef = doc(db, 'assessments', assessmentId);
  const snapshot = await getDoc(assessmentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Assessment;
}

/**
 * Get an assessment by ID, throwing if not found.
 */
export async function getAssessmentOrThrow(assessmentId: string): Promise<Assessment> {
  const assessment = await getAssessment(assessmentId);
  if (!assessment) {
    throw new AssessmentNotFoundError(assessmentId);
  }
  return assessment;
}

/**
 * Get assessments for a course.
 */
export async function getAssessmentsForCourse(
  orgId: string,
  courseId: string
): Promise<Assessment[]> {
  const assessmentsRef = collection(db, 'assessments');
  const q = query(
    assessmentsRef,
    where('orgId', '==', orgId),
    where('courseId', '==', courseId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Assessment);
}

/**
 * Get assessment for a specific lesson.
 */
export async function getAssessmentForLesson(
  orgId: string,
  courseId: string,
  lessonId: string
): Promise<Assessment | null> {
  const assessmentsRef = collection(db, 'assessments');
  const q = query(
    assessmentsRef,
    where('orgId', '==', orgId),
    where('courseId', '==', courseId),
    where('lessonId', '==', lessonId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as Assessment;
}

/**
 * Update an assessment.
 */
export async function updateAssessment(
  assessmentId: string,
  updates: Partial<Omit<Assessment, 'id' | 'orgId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  await getAssessmentOrThrow(assessmentId);
  const assessmentRef = doc(db, 'assessments', assessmentId);
  await updateDoc(assessmentRef, updates);
}

// ─── RESULT OPERATIONS ────────────────────────────────────────────────────────

/**
 * Grade answers for an assessment.
 * Returns scored answers and total score.
 */
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
      // Single correct answer
      const correct = Array.isArray(question.correctAnswer)
        ? question.correctAnswer[0]
        : question.correctAnswer;

      const given = Array.isArray(givenAnswer) ? givenAnswer[0] : givenAnswer;
      isCorrect = given.toLowerCase().trim() === correct.toLowerCase().trim();
    } else if (question.type === 'short_answer') {
      // Case-insensitive comparison for short answers
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

/**
 * Submit an assessment result.
 *
 * This function:
 * 1. Validates the user hasn't exceeded max attempts
 * 2. Grades the answers
 * 3. Creates the result document
 * 4. Logs the activity
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

  // Get enrollment to link result
  const enrollment = await enrollmentService.getEnrollmentForUserCourse(orgId, userId, courseId);
  if (!enrollment) {
    throw new Error('User is not enrolled in this course');
  }

  // Check attempt count
  const previousAttempts = await getResultsForUserAssessment(userId, assessmentId);
  const attemptNumber = previousAttempts.length + 1;

  if (assessment.maxAttempts !== null && attemptNumber > assessment.maxAttempts) {
    throw new MaxAttemptsReachedError(assessmentId, assessment.maxAttempts);
  }

  // Grade the answers
  const { answers, totalScore, maxScore } = gradeAnswers(assessment.questions, givenAnswers);
  const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = scorePercent >= assessment.passMark;

  // Create result document
  const resultRef = doc(collection(db, 'assessmentResults'));
  const result: AssessmentResult = {
    id: resultRef.id,
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
    submittedAt: serverTimestamp() as any,
  };

  await setDoc(resultRef, result);

  // Log activity
  await activity.quizSubmit(orgId, userId, assessmentId, scorePercent, passed);

  return result;
}

/**
 * Get all results for a user and assessment.
 */
export async function getResultsForUserAssessment(
  userId: string,
  assessmentId: string
): Promise<AssessmentResult[]> {
  const resultsRef = collection(db, 'assessmentResults');
  const q = query(
    resultsRef,
    where('userId', '==', userId),
    where('assessmentId', '==', assessmentId),
    orderBy('submittedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AssessmentResult);
}

/**
 * Get all results for a user in a course.
 */
export async function getResultsForUserCourse(
  userId: string,
  courseId: string
): Promise<AssessmentResult[]> {
  const resultsRef = collection(db, 'assessmentResults');
  const q = query(
    resultsRef,
    where('userId', '==', userId),
    where('courseId', '==', courseId),
    orderBy('submittedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AssessmentResult);
}

/**
 * Get all results for an assessment (instructor/admin view).
 */
export async function getResultsForAssessment(
  orgId: string,
  assessmentId: string
): Promise<AssessmentResult[]> {
  const resultsRef = collection(db, 'assessmentResults');
  const q = query(
    resultsRef,
    where('orgId', '==', orgId),
    where('assessmentId', '==', assessmentId),
    orderBy('submittedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AssessmentResult);
}

/**
 * Get all results for an organization (admin reporting).
 */
export async function getResultsForOrg(
  orgId: string,
  limitCount = 100
): Promise<AssessmentResult[]> {
  const resultsRef = collection(db, 'assessmentResults');
  const q = query(
    resultsRef,
    where('orgId', '==', orgId),
    orderBy('submittedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AssessmentResult).slice(0, limitCount);
}

/**
 * Check remaining attempts for a user on an assessment.
 */
export async function getRemainingAttempts(
  userId: string,
  assessmentId: string
): Promise<number | null> {
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.maxAttempts === null) {
    return null; // Unlimited attempts
  }

  const attempts = await getResultsForUserAssessment(userId, assessmentId);
  return Math.max(0, assessment.maxAttempts - attempts.length);
}

/**
 * Get the best score for a user on an assessment.
 */
export async function getBestScore(
  userId: string,
  assessmentId: string
): Promise<number | null> {
  const results = await getResultsForUserAssessment(userId, assessmentId);
  if (results.length === 0) {
    return null;
  }

  return Math.max(...results.map(r => r.score));
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
