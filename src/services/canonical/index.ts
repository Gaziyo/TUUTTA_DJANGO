/**
 * Canonical Service Layer
 *
 * This is the single source of truth for core data operations.
 * Components MUST use these services — NEVER bypass the service layer.
 *
 * Backed by Django REST endpoints under /api/v1.
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
