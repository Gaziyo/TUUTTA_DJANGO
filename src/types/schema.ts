import { Timestamp } from 'firebase/firestore';

// ─── ROLES ───────────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'instructor' | 'learner';

/**
 * Role hierarchy — higher index = higher privilege.
 * This is the single source of truth for role ordering.
 * Used in RouteGuard, Firestore rules logic, and permission checks.
 */
export const ROLE_HIERARCHY: readonly UserRole[] = [
  'learner',
  'instructor',
  'manager',
  'admin',
  'superadmin',
] as const;

/**
 * Get the hierarchy level for a role (0 = learner, 4 = superadmin).
 */
export function getRoleLevel(role: UserRole | null | undefined): number {
  if (!role) return -1;
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if a role has at least the specified minimum role level.
 */
export function hasMinRole(role: UserRole | null | undefined, minRole: UserRole): boolean {
  return getRoleLevel(role) >= getRoleLevel(minRole);
}

/**
 * Role groups for convenience.
 */
export const ADMIN_ROLES: readonly UserRole[] = ['superadmin', 'admin'] as const;
export const MANAGER_ROLES: readonly UserRole[] = ['superadmin', 'admin', 'manager'] as const;
export const INSTRUCTOR_ROLES: readonly UserRole[] = ['superadmin', 'admin', 'manager', 'instructor'] as const;
export const ALL_ROLES: readonly UserRole[] = ROLE_HIERARCHY;

// ─── USERS ───────────────────────────────────────────────────────────────────
// Collection: /users/{uid}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  orgId: string;
  role: UserRole;
  departmentId: string | null;
  teamId: string | null;
  managerId: string | null;
  isActive: boolean;
  xp: number;
  level: number;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

// ─── ORGANIZATIONS ────────────────────────────────────────────────────────────
// Collection: /organizations/{orgId}

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  allowSelfEnrollment: boolean;
  requireManagerApproval: boolean;
  createdAt: Timestamp;
}

// ─── COURSES ──────────────────────────────────────────────────────────────────
// Collection: /courses/{courseId}

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Course {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: CourseStatus;
  createdBy: string;           // userId
  instructorId: string | null;
  thumbnailUrl: string | null;
  estimatedDuration: number;   // minutes
  tags: string[];
  publishedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── MODULES ──────────────────────────────────────────────────────────────────
// Collection: /courses/{courseId}/modules/{moduleId}

export interface Module {
  id: string;
  courseId: string;
  orgId: string;
  title: string;
  order: number;
  isPublished: boolean;
}

// ─── LESSONS ─────────────────────────────────────────────────────────────────
// Collection: /courses/{courseId}/modules/{moduleId}/lessons/{lessonId}

export type LessonType = 'video' | 'text' | 'quiz' | 'file' | 'scorm';

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string;
  orgId: string;
  title: string;
  type: LessonType;
  order: number;
  content: string;             // rich text, video URL, or file URL
  estimatedDuration: number;   // minutes
  isPublished: boolean;
}

// ─── ASSESSMENTS ──────────────────────────────────────────────────────────────
// Collection: /assessments/{assessmentId}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type AssessmentType = 'quiz' | 'survey' | 'assignment';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string | string[];
  points: number;
}

export interface Assessment {
  id: string;
  orgId: string;
  courseId: string;
  lessonId: string | null;     // null = course-level assessment
  title: string;
  type: AssessmentType;
  questions: Question[];       // embedded — assessment questions rarely exceed 50
  passMark: number;            // 0–100 percentage
  maxAttempts: number | null;  // null = unlimited
  createdBy: string;           // userId
  createdAt: Timestamp;
}

// ─── ENROLLMENTS ──────────────────────────────────────────────────────────────
// Collection: /enrollments/{orgId}_{userId}_{courseId}
// Deterministic ID prevents duplicate enrollments without rules-only enforcement

export type EnrollmentStatus = 'active' | 'completed' | 'withdrawn' | 'expired';

export interface Enrollment {
  id: string;                  // always {orgId}_{userId}_{courseId}
  orgId: string;
  userId: string;
  courseId: string;
  enrolledBy: string;          // userId — self, manager, or admin
  status: EnrollmentStatus;
  enrolledAt: Timestamp;
  completedAt: Timestamp | null;
  dueDate: Timestamp | null;
  certificateId: string | null;
}

// ─── PROGRESS ────────────────────────────────────────────────────────────────
// Summary doc: /progress/{userId}_{courseId}
// Events subcollection: /progress/{userId}_{courseId}/events/{eventId}

export interface ProgressSummary {
  id: string;                  // always {userId}_{courseId}
  userId: string;
  courseId: string;
  orgId: string;
  enrollmentId: string;
  completedLessonIds: string[];
  completedModuleIds: string[];
  lastLessonId: string | null;
  percentComplete: number;     // 0–100, recomputed on each event write
  totalTimeSpentSeconds: number;
  updatedAt: Timestamp;
}

export type ProgressEventType =
  | 'lesson_start'
  | 'lesson_complete'
  | 'module_complete'
  | 'course_complete';

export interface ProgressEvent {
  id: string;
  type: ProgressEventType;
  lessonId: string | null;
  moduleId: string | null;
  durationSeconds: number;
  timestamp: Timestamp;
}

// ─── ASSESSMENT RESULTS ───────────────────────────────────────────────────────
// Collection: /assessmentResults/{resultId}

export interface AnswerRecord {
  questionId: string;
  givenAnswer: string | string[];
  isCorrect: boolean;
  pointsEarned: number;
}

export interface AssessmentResult {
  id: string;
  orgId: string;
  userId: string;
  courseId: string;
  assessmentId: string;
  enrollmentId: string;
  attempt: number;
  score: number;               // 0–100
  passed: boolean;
  answers: AnswerRecord[];
  startedAt: Timestamp;
  submittedAt: Timestamp;
}

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
// Collection: /activityLog/{orgId}/events/{eventId}
// Append-only. Read only by admin/manager.

export type ActivityAction =
  | 'lesson_view' | 'lesson_complete'
  | 'course_enroll' | 'course_complete' | 'course_publish'
  | 'quiz_submit'
  | 'user_login' | 'user_role_change'
  | 'enrollment_withdraw';

export interface ActivityEvent {
  id: string;
  orgId: string;
  userId: string;
  action: ActivityAction;
  resourceId: string;
  resourceType: 'lesson' | 'course' | 'assessment' | 'enrollment' | 'user';
  metadata: Record<string, unknown>;
  timestamp: Timestamp;
}

// ─── COLLECTION MAP ──────────────────────────────────────────────────────────
// Rule: If it is not in this list, it does not get created. No exceptions.
//
// /users/{uid}
// /organizations/{orgId}
// /courses/{courseId}
// /courses/{courseId}/modules/{moduleId}
// /courses/{courseId}/modules/{moduleId}/lessons/{lessonId}
// /assessments/{assessmentId}
// /enrollments/{orgId}_{userId}_{courseId}
// /progress/{userId}_{courseId}
// /progress/{userId}_{courseId}/events/{eventId}
// /assessmentResults/{resultId}
// /activityLog/{orgId}/events/{eventId}
