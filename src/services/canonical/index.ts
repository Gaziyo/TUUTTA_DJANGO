/**
 * Canonical Service Layer
 *
 * This is the single source of truth for all Firestore operations.
 * Components MUST use these services — NEVER call Firestore directly.
 *
 * Collection Map:
 *   /users/{uid}
 *   /organizations/{orgId}
 *   /courses/{courseId}
 *   /courses/{courseId}/modules/{moduleId}
 *   /courses/{courseId}/modules/{moduleId}/lessons/{lessonId}
 *   /assessments/{assessmentId}
 *   /enrollments/{orgId}_{userId}_{courseId}
 *   /progress/{userId}_{courseId}
 *   /progress/{userId}_{courseId}/events/{eventId}
 *   /assessmentResults/{resultId}
 *   /activityLog/{orgId}/events/{eventId}
 */

// Activity logging (fire-and-forget)
export { activity, default as activityService } from './activityService';

// User management
export {
  userService,
  default as userServiceDefault,
  UserNotFoundError,
  UserAlreadyExistsError,
} from './userService';

// Organization management
export {
  organizationService,
  default as organizationServiceDefault,
  OrganizationNotFoundError,
} from './organizationService';

// Course, module, lesson management
export {
  courseService,
  default as courseServiceDefault,
  CourseNotFoundError,
  ModuleNotFoundError,
  LessonNotFoundError,
} from './courseService';

// Enrollment management
export {
  enrollmentService,
  default as enrollmentServiceDefault,
  EnrollmentNotFoundError,
  AlreadyEnrolledError,
  generateEnrollmentId,
  generateProgressId,
} from './enrollmentService';

// Progress tracking
export {
  progressService,
  default as progressServiceDefault,
  ProgressNotFoundError,
} from './progressService';

// Assessments and results
export {
  assessmentService,
  default as assessmentServiceDefault,
  AssessmentNotFoundError,
  MaxAttemptsReachedError,
} from './assessmentService';

// Re-export types from schema
export type {
  User,
  UserRole,
  Organization,
  Course,
  CourseStatus,
  Module,
  Lesson,
  LessonType,
  Assessment,
  AssessmentType,
  Question,
  QuestionType,
  Enrollment,
  EnrollmentStatus,
  ProgressSummary,
  ProgressEvent,
  ProgressEventType,
  AssessmentResult,
  AnswerRecord,
  ActivityEvent,
  ActivityAction,
} from '../../types/schema';
