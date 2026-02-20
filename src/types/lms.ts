// ========== Organization & Multi-Tenancy ==========

export interface Organization {
  id: string;
  name: string;
  slug: string; // URL-friendly name (e.g., 'acme-corp')
  domain?: string; // Custom domain for white-labeling
  logo?: string;
  settings: OrganizationSettings;
  subscription: SubscriptionTier;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrganizationSettings {
  apiKey?: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    favicon?: string;
  };
  features: {
    enableGamification: boolean;
    enableCertificates: boolean;
    enableDiscussions: boolean;
    enableLeaderboards: boolean;
    enableCustomBranding: boolean;
  };
  notifications?: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    pushEnabled: boolean;
    digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    courseEnrollment: boolean;
    courseCompletion: boolean;
    assignmentDue: boolean;
    certificateIssued: boolean;
    newAnnouncements: boolean;
    discussionReplies: boolean;
    gradePosted: boolean;
    reminderDaysBefore: number;
    managerDigestEnabled: boolean;
    managerDigestFrequency: 'weekly' | 'monthly';
    managerDigestRoles: UserRole[];
    webhookUrl?: string;
  };
  compliance: {
    requireCompletionDeadlines: boolean;
    autoRemindDays: number[]; // e.g., [7, 3, 1] days before deadline
    overdueEscalation: boolean;
    autoIssueCertificates?: boolean;
    logCompletionEvents?: boolean;
    requireCertificateApproval?: boolean;
    retentionPolicies?: RetentionPolicy[];
  };
  defaults: {
    defaultLanguage: string;
    timezone: string;
    dateFormat: string;
  };
}

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

// ========== Announcements ==========

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'expired';
export type TargetAudience = 'all' | 'learners' | 'instructors' | 'admins' | 'specific_courses' | 'specific_teams';

export interface Announcement {
  id: string;
  orgId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetAudience: TargetAudience;
  targetIds?: string[];
  isPinned: boolean;
  publishAt?: number | Date;
  expiresAt?: number | Date;
  viewCount: number;
  createdBy: string;
  createdAt: number | Date;
  updatedAt: number | Date;
}

// ========== User Roles & Permissions ==========

export type UserRole =
  | 'super_admin'    // Platform admin (Tuutta staff)
  | 'org_admin'      // Organization administrator
  | 'ld_manager'     // L&D Manager - creates courses, assigns training
  | 'team_lead'      // Team lead - manages team, views team reports
  | 'instructor'     // Creates content, grades assignments
  | 'learner';       // End user - completes training

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'courses' | 'reports' | 'settings' | 'enrollments';
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'], // All permissions
  org_admin: [
    'users:read', 'users:create', 'users:update', 'users:delete',
    'courses:read', 'courses:create', 'courses:update', 'courses:delete', 'courses:publish',
    'enrollments:read', 'enrollments:create', 'enrollments:update', 'enrollments:delete',
    'reports:read', 'reports:export',
    'settings:read', 'settings:update',
  ],
  ld_manager: [
    'users:read',
    'courses:read', 'courses:create', 'courses:update', 'courses:publish',
    'enrollments:read', 'enrollments:create', 'enrollments:update',
    'reports:read', 'reports:export',
  ],
  team_lead: [
    'users:read:team', // Only their team
    'courses:read',
    'enrollments:read:team', 'enrollments:create:team',
    'reports:read:team',
  ],
  instructor: [
    'courses:read', 'courses:create', 'courses:update',
    'enrollments:read:assigned', // Only courses they're assigned to
  ],
  learner: [
    'courses:read:enrolled',
    'enrollments:read:self',
  ],
};

export interface OrgMember {
  id: string;
  odId: string;
  orgId?: string;
  userId?: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
  title?: string;
  hireDate?: number;
  status: 'active' | 'inactive' | 'pending';
  invitedAt?: number;
  joinedAt?: number;
  lastActiveAt?: number;
}

// ========== Departments & Teams ==========

export interface Department {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  parentId?: string; // For nested departments
  managerId?: string;
  createdAt: number;
}

export interface Team {
  id: string;
  orgId: string;
  departmentId?: string;
  name: string;
  description?: string;
  leadId?: string;
  memberIds: string[];
  createdAt: number;
}

// ========== Course & Content ==========

export interface Course {
  id: string;
  orgId: string;
  title: string;
  description: string;
  shortDescription?: string;
  thumbnail?: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // in minutes
  modules: CourseModule[];
  status: 'draft' | 'published' | 'archived';
  version: number;
  prerequisites?: string[]; // Course IDs
  learningObjectives?: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  settings: CourseSettings;
}

export interface CourseSettings {
  allowSelfEnrollment: boolean;
  allowGuestAccess: boolean;
  allowCohortSync: boolean;
  requireSequentialProgress: boolean;
  showProgressBar: boolean;
  enableDiscussions: boolean;
  enableCertificate: boolean;
  passingScore: number; // 0-100
  maxAttempts: number; // 0 = unlimited
  timeLimit?: number; // in minutes, for timed courses
  completionCriteria?: {
    requireAssessmentPass: boolean;
    minScore: number;
    requireFinalExamPass?: boolean;
  };
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  quiz?: ModuleQuiz;
}

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  content: LessonContent;
  duration: number; // estimated minutes
  order: number;
  isRequired: boolean;
  assessmentMeta?: {
    role?: 'pre' | 'lesson' | 'module' | 'final';
    competencyTags?: string[];
    topicTags?: string[];
    remediationModuleId?: string;
    remediationLessonId?: string;
    recertifyDays?: number;
    skipModuleIds?: string[];
  };
}

// ========== Genie (AI Course Developer) ==========

export type GenieSourceType = 'policy' | 'sop' | 'manual' | 'resource';

export interface GenieSource {
  id: string;
  orgId: string;
  sourceKey: string;
  title: string;
  description?: string;
  type: GenieSourceType;
  tags: string[];
  version: number;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
  uploadedBy?: string;
}

export interface GenieCourseDraft {
  id: string;
  orgId: string;
  title: string;
  sourceIds: string[];
  status: 'draft' | 'generated' | 'archived';
  learningObjectives?: string[];
  contentGaps?: string[];
  skillGaps?: string[];
  instructionalStrategies?: {
    moduleIndex: number;
    activeLearning: string[];
    multimedia: string[];
  }[];
  adultLearningChecklist?: {
    practicalRelevance: boolean;
    selfDirected: boolean;
    reflectiveActivities: boolean;
  };
  outline: {
    moduleId: string;
    title: string;
    lessons: Lesson[];
  }[];
  createdAt: number;
  updatedAt: number;
}

export interface GeniePipelineProject {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  sourceIds: string[];
  sources?: GenieSource[];
  analysis?: any;
  design?: any;
  draft?: GenieCourseDraft;
  implementation?: {
    courseId?: string;
    enrollmentRules: Array<{
      type: 'role' | 'team' | 'department' | 'all';
      targetId?: string;
      targetName: string;
    }>;
    startDate?: number;
    endDate?: number;
    notifications: boolean;
  };
  evaluation?: any;
  stageStatus: Record<'ingest' | 'analyze' | 'design' | 'develop' | 'implement' | 'evaluate', 'pending' | 'in_progress' | 'completed'>;
  stageApprovals: Record<'ingest' | 'analyze' | 'design' | 'develop' | 'implement' | 'evaluate', 'pending' | 'approved' | 'rejected'>;
  approvalHistory: Array<{
    stage: 'ingest' | 'analyze' | 'design' | 'develop' | 'implement' | 'evaluate';
    status: 'approved' | 'rejected';
    approvedBy?: { id: string; name: string };
    approvedAt: number;
    notes?: string;
  }>;
  copilot?: {
    prompts: Partial<Record<'ingest' | 'analyze' | 'design' | 'develop' | 'implement' | 'evaluate', string[]>>;
    history: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: number;
    }>;
    actionsTaken?: Array<{
      id: string;
      stage: 'ingest' | 'analyze' | 'design' | 'develop' | 'implement' | 'evaluate';
      action: string;
      status?: 'pending' | 'success' | 'error';
      error?: string;
      createdAt: number;
    }>;
    suggestions?: Array<{
      id: string;
      stage: 'ingest' | 'analyze' | 'design' | 'develop' | 'implement' | 'evaluate';
      message: string;
      createdAt: number;
      followed?: boolean;
      action?: string;
    }>;
  };
}

export type GenieAssessmentCategory =
  | 'general'
  | 'reading'
  | 'listening'
  | 'speaking'
  | 'math';

export interface GenieAssessment {
  id: string;
  orgId: string;
  title: string;
  category: GenieAssessmentCategory;
  draftId?: string;
  questions: QuizQuestion[];
  status: 'draft' | 'published' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface GenieEnrollmentRule {
  id: string;
  orgId: string;
  courseId: string;
  roleFilters: UserRole[];
  departmentIds: string[];
  teamIds: string[];
  dueDate?: number;
  priority: 'required' | 'recommended' | 'optional';
  enrollRole: 'student' | 'teacher';
  isActive: boolean;
  autoRunDaily?: boolean;
  lastRunAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type LessonType =
  | 'video'
  | 'audio'
  | 'document'
  | 'text'
  | 'quiz'
  | 'assignment'
  | 'scorm'
  | 'external_link'
  | 'interactive';

export interface LessonContent {
  // For video
  videoUrl?: string;
  videoProvider?: 'youtube' | 'vimeo' | 'uploaded' | 'external';

  // For audio
  audioUrl?: string;

  // For document
  documentUrl?: string;
  documentType?: 'pdf' | 'ppt' | 'doc' | 'other';

  // For text/HTML content
  htmlContent?: string;

  // For quiz
  questions?: QuizQuestion[];
  quizSettings?: Partial<ModuleQuiz>;

  // For assignment
  assignmentPrompt?: string;
  submissionType?: 'text' | 'file' | 'link';

  // For SCORM
  scormPackageUrl?: string;
  scormVersion?: '1.2' | '2004';

  // For external link
  externalUrl?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  explanation?: string;
  topicTag?: string;
}

export interface ModuleQuiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
}

// ========== Learning Paths ==========

export interface LearningPath {
  id: string;
  orgId: string;
  title: string;
  description: string;
  thumbnail?: string;
  courses: LearningPathCourse[];
  certification?: CertificationConfig;
  estimatedDuration: number;
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface LearningPathCourse {
  courseId: string;
  order: number;
  isRequired: boolean;
  unlockAfter?: string; // Course ID that must be completed first
}

export interface CertificationConfig {
  enabled: boolean;
  title: string;
  description?: string;
  validityPeriod?: number; // in days, 0 = never expires
  renewalRequired: boolean;
  badgeImage?: string;
}

// ========== Enrollment & Progress ==========

export interface Enrollment {
  id: string;
  odId: string;
  orgId?: string;
  userId: string;
  userAuthId?: string;
  courseId: string;
  learningPathId?: string;
  assignedBy: string; // User ID who assigned
  assignedAt: number;
  dueDate?: number;
  role: EnrollmentRole;
  priority: 'required' | 'recommended' | 'optional';
  status: EnrollmentStatus;
  progress: number; // 0-100
  startedAt?: number;
  completedAt?: number;
  lastAccessedAt?: number;
  score?: number;
  attempts: number;
  moduleProgress: Record<string, ModuleProgress>;
  certificate?: Certificate;
  complianceAttestationIssued?: boolean;
}

export type EnrollmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'overdue'
  | 'expired';

export type EnrollmentRole = 'student' | 'teacher';

export interface ModuleProgress {
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedLessons: string[];
  quizScore?: number;
  quizAttempts: number;
  startedAt?: number;
  completedAt?: number;
}

export interface LessonProgressRecord {
  id: string;
  orgId: string;
  enrollmentId: string;
  userId: string;
  userAuthId?: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  status: 'started' | 'completed';
  startedAt?: number;
  completedAt?: number;
  timeSpentMs?: number;
}

export interface AssessmentResult {
  id: string;
  orgId: string;
  enrollmentId: string;
  userId: string;
  userAuthId?: string;
  courseId: string;
  assessmentId: string;
  score: number;
  attempts: number;
  passed: boolean;
  createdAt: number;
  updatedAt?: number;
  metadata?: Record<string, any>;
}

export interface CompetencyScore {
  id: string;
  orgId: string;
  userId: string;
  courseId?: string;
  enrollmentId?: string;
  assessmentId?: string;
  competencyTag: string;
  score: number;
  assessedAt: number;
  expiresAt?: number;
}

export interface CompetencyBadge {
  id: string;
  orgId: string;
  userId: string;
  courseId: string;
  moduleId: string;
  assessmentId?: string;
  title: string;
  issuedAt: number;
  competencyTags?: string[];
}

export interface RemediationAssignment {
  id: string;
  orgId: string;
  userId: string;
  enrollmentId: string;
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  status: 'assigned' | 'completed' | 'dismissed';
  reason?: string;
  scheduledReassessmentAt?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface Certificate {
  id: string;
  odId: string;
  orgId?: string;
  userId: string;
  courseId?: string;
  learningPathId?: string;
  title: string;
  issuedAt: number;
  expiresAt?: number;
  certificateNumber: string;
  verificationCode?: string;
  verificationUrl: string;
  qrImageUrl?: string;
  pdfUrl?: string;
  evidence?: {
    assessmentResultIds?: string[];
    completionProgress?: number;
    issuedBy?: string;
    assessmentScore?: number;
    courseVersion?: number;
    complianceAttestation?: boolean;
  };
}

export interface CertificateApproval {
  id: string;
  orgId: string;
  userId: string;
  courseId: string;
  enrollmentId?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  decidedAt?: number;
  decidedBy?: string;
  reason?: 'auto' | 'manual';
}

export interface GenieReportSchedule {
  id: string;
  orgId: string;
  enabled: boolean;
  frequency: 'weekly' | 'monthly';
  recipients: string;
  createdAt?: number;
  updatedAt?: number;
  lastRunAt?: number | null;
}

export interface GenieReportRun {
  id: string;
  orgId: string;
  scheduleId?: string;
  recipients?: string;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface ManagerDigestRun {
  id: string;
  orgId: string;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
  frequency?: 'weekly' | 'monthly';
  roles?: UserRole[];
}

// ========== Audit Logs ==========

export type AuditActorType = 'user' | 'system' | 'admin';

export type AuditAction =
  | 'course.created' | 'course.published' | 'course.archived'
  | 'enrollment.created' | 'enrollment.completed' | 'enrollment.failed'
  | 'assessment.submitted' | 'assessment.passed' | 'assessment.failed'
  | 'user.enrolled' | 'user.removed';

export interface AuditLog {
  id: string;
  orgId: string;
  timestamp: number;
  actorId: string;
  actorName?: string;
  actorType?: AuditActorType;
  action: AuditAction | string;
  entityType?: 'course' | 'enrollment' | 'assessment' | 'user' | string;
  entityId?: string;
  changes?: Array<{ field: string; oldValue: any; newValue: any }>;
  createdAt?: number;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, any>;
}

export interface RetentionPolicy {
  entityType: string;
  retentionPeriod: number; // days
  action: 'archive' | 'delete' | 'anonymize';
}

export interface SSOConnection {
  id: string;
  orgId: string;
  provider: 'azure_ad' | 'okta' | 'google' | string;
  config: Record<string, any>;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface HRISIntegration {
  id: string;
  orgId: string;
  provider: 'workday' | 'bamboohr' | 'rippling' | string;
  config: Record<string, any>;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// ========== Assignment Rules ==========

export interface AssignmentRule {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: AssignmentTrigger;
  conditions: AssignmentConditions;
  courseIds: string[];
  learningPathIds?: string[];
  dueDate: DueDateConfig;
  priority: 'required' | 'recommended' | 'optional';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export type AssignmentTrigger =
  | 'on_join'           // When user joins org
  | 'on_role_change'    // When user's role changes
  | 'on_department_change'
  | 'on_team_change'
  | 'scheduled'         // Run on schedule
  | 'manual';           // Manual bulk assignment

export interface AssignmentConditions {
  departments?: string[];
  teams?: string[];
  roles?: UserRole[];
  locations?: string[];
  tenureMonths?: { min?: number; max?: number };
  customFields?: Record<string, string>;
}

export interface DueDateConfig {
  type: 'relative' | 'fixed' | 'none';
  relativeDays?: number; // Days from enrollment
  fixedDate?: number;    // Timestamp
}

// ========== Notifications ==========

export interface LMSNotification {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'failed' | 'read';
  scheduledAt?: number;
  sentAt?: number;
  readAt?: number;
  createdAt: number;
}

export type NotificationType =
  | 'enrollment_new'
  | 'enrollment_reminder'
  | 'enrollment_overdue'
  | 'course_completed'
  | 'certificate_issued'
  | 'certificate_expiring'
  | 'announcement'
  | 'feedback_received';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'slack' | 'teams';

// ========== Reports & Analytics ==========

export interface LMSReport {
  id: string;
  orgId: string;
  name: string;
  type: ReportType;
  filters: ReportFilters;
  columns: string[];
  schedule?: ReportSchedule;
  createdBy: string;
  createdAt: number;
  lastRunAt?: number;
}

export type ReportType =
  | 'learner_progress'
  | 'course_completion'
  | 'department_summary'
  | 'compliance_status'
  | 'training_hours'
  | 'assessment_scores'
  | 'overdue_training'
  | 'certification_status';

export interface ReportFilters {
  dateRange?: { start: number; end: number };
  departments?: string[];
  teams?: string[];
  courses?: string[];
  learningPaths?: string[];
  status?: EnrollmentStatus[];
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM
  recipients: string[];
  format: 'pdf' | 'csv' | 'excel';
}

export interface RiskScore {
  id: string;
  orgId: string;
  userId: string;
  enrollmentId: string;
  courseId: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  reasons?: string[];
  updatedAt: number;
}

export interface AnalyticsRecommendation {
  id: string;
  orgId: string;
  audience: 'learner' | 'manager' | 'ld';
  userId?: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: number;
  status?: 'followed' | 'ignored';
  respondedAt?: number;
}

// ========== Dashboard Stats ==========

export interface AdminDashboardStats {
  totalLearners: number;
  activeLearners: number; // Active in last 30 days
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completionRate: number;
  overdueCount: number;
  averageScore: number;
  trainingHoursThisMonth: number;
  certificatesIssued: number;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  learnerCount: number;
  enrollmentCount: number;
  completionRate: number;
  overdueCount: number;
  averageScore: number;
}

export interface CourseStats {
  courseId: string;
  courseTitle: string;
  enrollmentCount: number;
  completionCount: number;
  completionRate: number;
  averageScore: number;
  averageTimeSpent: number;
  rating?: number;
}
