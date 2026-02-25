/**
 * LMS Service
 *
 * Firebase Firestore removed. Stub only — Django LMS endpoints pending.
 * All read operations return empty values; write operations throw (not yet implemented).
 * Local Zustand/localStorage is source of truth until backend endpoints are wired up.
 */

import type {
  Organization,
  OrganizationSettings,
  OrgMember,
  Department,
  Team,
  Course,
  LearningPath,
  Enrollment,
  EnrollmentStatus,
  Certificate,
  CertificateApproval,
  AuditLog,
  AdminDashboardStats,
  DepartmentStats,
  CourseStats,
  UserRole,
  GenieReportSchedule,
  GenieReportRun,
  ManagerDigestRun,
  GeniePipelineProject,
  LessonProgressRecord,
  AssessmentResult,
  CompetencyScore,
  CompetencyBadge,
  RemediationAssignment,
} from '../types/lms';

const notImplemented = (name: string) =>
  new Error(`[lmsService] ${name}: backend migration pending.`);

// ============================================================
// Organization
// ============================================================

export const createOrganization = async (
  _org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Organization> => {
  throw notImplemented('createOrganization');
};

export const getOrganization = async (_orgId: string): Promise<Organization | null> => null;

export const getOrganizationBySlug = async (_slug: string): Promise<Organization | null> => null;

export const updateOrganization = async (
  _orgId: string,
  _updates: Partial<Organization>
): Promise<void> => {};

export const updateOrganizationSettings = async (
  _orgId: string,
  _settings: Partial<OrganizationSettings>
): Promise<void> => {};

// ============================================================
// Organization Members
// ============================================================

export const addOrgMember = async (_member: Omit<OrgMember, 'id'>): Promise<OrgMember> => {
  throw notImplemented('addOrgMember');
};

export const getOrgMember = async (_memberId: string): Promise<OrgMember | null> => null;

export const getOrgMemberByEmail = async (
  _orgId: string,
  _email: string
): Promise<OrgMember | null> => null;

export const getOrgMembers = async (
  _orgId: string,
  _options?: {
    role?: UserRole;
    departmentId?: string;
    teamId?: string;
    status?: 'active' | 'inactive' | 'pending';
    limit?: number;
  }
): Promise<OrgMember[]> => [];

export const getOrgMembershipsForUser = async (_userId: string): Promise<OrgMember[]> => [];

export const updateOrgMember = async (
  _memberId: string,
  _updates: Partial<OrgMember>
): Promise<void> => {};

export const removeOrgMember = async (_memberId: string): Promise<void> => {};

// ============================================================
// Departments
// ============================================================

export const createDepartment = async (
  _dept: Omit<Department, 'id' | 'createdAt'>
): Promise<Department> => {
  throw notImplemented('createDepartment');
};

export const getDepartments = async (_orgId: string): Promise<Department[]> => [];

export const updateDepartment = async (
  _deptId: string,
  _updates: Partial<Department>
): Promise<void> => {};

export const deleteDepartment = async (_deptId: string): Promise<void> => {};

// ============================================================
// Teams
// ============================================================

export const createTeam = async (_team: Omit<Team, 'id' | 'createdAt'>): Promise<Team> => {
  throw notImplemented('createTeam');
};

export const getTeams = async (_orgId: string, _departmentId?: string): Promise<Team[]> => [];

export const updateTeam = async (_teamId: string, _updates: Partial<Team>): Promise<void> => {};

export const deleteTeam = async (_teamId: string): Promise<void> => {};

// ============================================================
// Courses
// ============================================================

export const createCourse = async (
  _course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'version'>
): Promise<Course> => {
  throw notImplemented('createCourse');
};

export const getCourse = async (_courseId: string): Promise<Course | null> => null;

export const getCourses = async (
  _orgId: string,
  _options?: {
    status?: 'draft' | 'published' | 'archived';
    category?: string;
    limit?: number;
  }
): Promise<Course[]> => [];

export const updateCourse = async (
  _courseId: string,
  _updates: Partial<Course>
): Promise<void> => {};

export const publishCourse = async (_courseId: string): Promise<void> => {};

export const archiveCourse = async (_courseId: string): Promise<void> => {};

export const deleteCourse = async (_courseId: string): Promise<void> => {};

// ============================================================
// Learning Paths
// ============================================================

export const createLearningPath = async (
  _lp: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LearningPath> => {
  throw notImplemented('createLearningPath');
};

export const getLearningPath = async (_pathId: string): Promise<LearningPath | null> => null;

export const getLearningPaths = async (
  _orgId: string,
  _options?: { status?: 'draft' | 'published' | 'archived'; limit?: number }
): Promise<LearningPath[]> => [];

export const updateLearningPath = async (
  _pathId: string,
  _updates: Partial<LearningPath>
): Promise<void> => {};

export const publishLearningPath = async (_pathId: string): Promise<void> => {};

export const archiveLearningPath = async (_pathId: string): Promise<void> => {};

export const deleteLearningPath = async (_pathId: string): Promise<void> => {};

// ============================================================
// Enrollments
// ============================================================

export const createEnrollment = async (_enrollment: Omit<Enrollment, 'id'>): Promise<Enrollment> => {
  throw notImplemented('createEnrollment');
};

export const getEnrollment = async (_enrollmentId: string): Promise<Enrollment | null> => null;

export const getUserEnrollments = async (
  _orgId: string,
  _userId: string
): Promise<Enrollment[]> => [];

export const getCourseEnrollments = async (
  _orgId: string,
  _courseId: string
): Promise<Enrollment[]> => [];

export const getEnrollmentsByStatus = async (
  _orgId: string,
  _status: EnrollmentStatus
): Promise<Enrollment[]> => [];

export const getOrgEnrollments = async (_orgId: string): Promise<Enrollment[]> => [];

export const getOrgEnrollmentsPage = async (
  _orgId: string,
  _options: { limitCount: number; cursor?: unknown }
): Promise<{ enrollments: Enrollment[]; lastDoc?: unknown }> => ({ enrollments: [] });

export const updateEnrollment = async (
  _enrollmentId: string,
  _updates: Partial<Enrollment>
): Promise<void> => {};

export const updateEnrollmentProgress = async (
  _enrollmentId: string,
  _progress: number,
  _moduleProgress?: Record<string, unknown>
): Promise<void> => {};

export const bulkEnroll = async (
  _orgId: string,
  _userIds: string[],
  _courseId: string,
  _assignedBy: string,
  _options?: {
    dueDate?: number;
    priority?: 'required' | 'recommended' | 'optional';
    role?: 'student' | 'teacher';
    userAuthIdMap?: Record<string, string | undefined>;
  }
): Promise<Enrollment[]> => [];

export const deleteEnrollment = async (_enrollmentId: string): Promise<void> => {};

// ============================================================
// Lesson / Module Progress
// ============================================================

export const upsertLessonProgress = async (
  record: Omit<LessonProgressRecord, 'id'> & { id?: string }
): Promise<LessonProgressRecord> => ({
  ...record,
  id: record.id ?? `progress_${Date.now()}`,
} as LessonProgressRecord);

export const upsertModuleProgress = async (_record: {
  orgId: string;
  enrollmentId: string;
  userId: string;
  userAuthId?: string;
  courseId: string;
  moduleId: string;
  status: 'completed';
  completedAt: number;
}): Promise<void> => {};

// ============================================================
// Assessment Results
// ============================================================

export const createAssessmentResult = async (
  _result: Omit<AssessmentResult, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AssessmentResult> => {
  throw notImplemented('createAssessmentResult');
};

export const updateAssessmentResult = async (
  _resultId: string,
  _updates: Partial<AssessmentResult>
): Promise<void> => {};

export const getAssessmentResultsByEnrollment = async (
  _orgId: string,
  _enrollmentId: string
): Promise<AssessmentResult[]> => [];

export const getAssessmentResultsByOrg = async (
  _orgId: string,
  _limitCount?: number
): Promise<AssessmentResult[]> => [];

// ============================================================
// Audit Logs
// ============================================================

export const createAuditLog = async (_log: Omit<AuditLog, 'id'>): Promise<AuditLog> => {
  throw notImplemented('createAuditLog');
};

export const getAuditLogs = async (_orgId: string, _limitCount?: number): Promise<AuditLog[]> => [];

// ============================================================
// Genie Reports
// ============================================================

export const getGenieReportSchedules = async (
  _orgId: string
): Promise<GenieReportSchedule[]> => [];

export const getGenieReportRuns = async (
  _orgId: string,
  _limitCount?: number
): Promise<GenieReportRun[]> => [];

export const createGenieReportRun = async (
  _orgId: string,
  _scheduleId: string,
  _recipients: string
): Promise<GenieReportRun> => {
  throw notImplemented('createGenieReportRun');
};

export const createGenieReportSchedule = async (
  _schedule: Omit<GenieReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt'>
): Promise<GenieReportSchedule> => {
  throw notImplemented('createGenieReportSchedule');
};

export const updateGenieReportSchedule = async (
  _scheduleId: string,
  _updates: Partial<GenieReportSchedule>
): Promise<void> => {};

// ============================================================
// Genie Pipeline Projects
// ============================================================

export const createGeniePipelineProject = async (
  _project: Omit<GeniePipelineProject, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GeniePipelineProject> => {
  throw notImplemented('createGeniePipelineProject');
};

export const updateGeniePipelineProject = async (
  _projectId: string,
  _updates: Partial<GeniePipelineProject>
): Promise<void> => {};

export const getGeniePipelineProject = async (
  _projectId: string
): Promise<GeniePipelineProject | null> => null;

export const getGeniePipelineProjects = async (
  _orgId: string,
  _limitCount?: number
): Promise<GeniePipelineProject[]> => [];

// ============================================================
// Manager Digest
// ============================================================

export const createManagerDigestRun = async (
  _orgId: string,
  _frequency: 'weekly' | 'monthly',
  _roles: UserRole[]
): Promise<ManagerDigestRun> => {
  throw notImplemented('createManagerDigestRun');
};

export const getManagerDigestRuns = async (
  _orgId: string,
  _limitCount?: number
): Promise<ManagerDigestRun[]> => [];

// ============================================================
// Certificates
// ============================================================

export const issueCertificate = async (
  _orgId: string,
  _userId: string,
  _courseId: string,
  _title: string,
  _expiresAt?: number,
  _evidence?: Certificate['evidence']
): Promise<Certificate> => {
  throw notImplemented('issueCertificate');
};

export const getUserCertificates = async (
  _orgId: string,
  _userId: string
): Promise<Certificate[]> => [];

export const getOrgCertificates = async (_orgId: string): Promise<Certificate[]> => [];

// ============================================================
// Certificate Approvals
// ============================================================

export const createCertificateApproval = async (
  _approval: Omit<CertificateApproval, 'id'>
): Promise<CertificateApproval> => {
  throw notImplemented('createCertificateApproval');
};

export const getCertificateApprovals = async (
  _orgId: string,
  _status?: 'pending' | 'approved' | 'rejected'
): Promise<CertificateApproval[]> => [];

export const updateCertificateApproval = async (
  _approvalId: string,
  _updates: Partial<CertificateApproval>
): Promise<void> => {};

export const verifyCertificate = async (
  _certificateNumber: string
): Promise<Certificate | null> => null;

// ============================================================
// Competency Scores & Badges
// ============================================================

export const createCompetencyScore = async (
  _score: Omit<CompetencyScore, 'id'>
): Promise<CompetencyScore> => {
  throw notImplemented('createCompetencyScore');
};

export const getCompetencyScores = async (
  _orgId: string,
  _userId?: string
): Promise<CompetencyScore[]> => [];

export const getCompetencyBadges = async (
  _orgId: string,
  _userId?: string
): Promise<CompetencyBadge[]> => [];

// ============================================================
// Remediation Assignments
// ============================================================

export const createRemediationAssignment = async (
  _assignment: Omit<RemediationAssignment, 'id' | 'createdAt'>
): Promise<RemediationAssignment> => {
  throw notImplemented('createRemediationAssignment');
};

export const updateRemediationAssignment = async (
  _assignmentId: string,
  _updates: Partial<RemediationAssignment>
): Promise<void> => {};

export const getRemediationAssignments = async (
  _orgId: string,
  _userId?: string
): Promise<RemediationAssignment[]> => [];

// ============================================================
// Admin Dashboard Stats
// ============================================================

export const getAdminDashboardStats = async (_orgId: string): Promise<AdminDashboardStats> => ({
  totalLearners: 0,
  activeLearners: 0,
  totalCourses: 0,
  publishedCourses: 0,
  totalEnrollments: 0,
  completionRate: 0,
  overdueCount: 0,
  averageScore: 0,
  trainingHoursThisMonth: 0,
  certificatesIssued: 0,
});

export const getDepartmentStats = async (_orgId: string): Promise<DepartmentStats[]> => [];

export const getCourseStats = async (_orgId: string): Promise<CourseStats[]> => [];
