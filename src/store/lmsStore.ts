import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Organization,
  OrgMember,
  Department,
  Team,
  Course,
  Enrollment,
  AuditLog,
  AdminDashboardStats,
  DepartmentStats,
  CourseStats,
  UserRole,
  ModuleProgress,
  LearningPath,
  GenieSource,
  GenieCourseDraft,
  GenieAssessment,
  GenieEnrollmentRule,
  Certificate,
  CertificateApproval,
  CompetencyScore,
  CompetencyBadge,
  GenieReportSchedule,
  GenieReportRun,
  ManagerDigestRun,
  NotificationChannel,
  RemediationAssignment,
} from '../types/lms';
import type { GapMatrixEntry } from '../services/gapMatrixService';
import { useAuthStore } from '../lib/authStore';
import {
  notifyTrainingAssigned,
  notifyCourseCompleted,
  notifyCertificateIssued,
  notifyDeadlineReminder,
  notifyTrainingOverdue
} from '../lib/lmsNotifications';
import {
  courseService,
  enrollmentService,
  userService,
  assessmentService,
  organizationService,
  departmentService,
  teamService,
  auditService,
  reportService,
  certificateService,
  competencyService,
  competencyBadgeService,
  remediationService,
  statsService,
  learningPathService,
  observabilityService,
  gapMatrixService
} from '../services';

const getNotificationChannels = (settings?: {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
}): NotificationChannel[] => {
  const channels: NotificationChannel[] = [];
  if (settings?.inAppEnabled) channels.push('in_app');
  if (settings?.emailEnabled) channels.push('email');
  if (settings?.pushEnabled) channels.push('push');
  return channels;
};

interface LMSState {
  // Current context
  currentOrg: Organization | null;
  currentMember: OrgMember | null;
  isAdmin: boolean;
  selectedCourseId: string | null;

  // Data
  members: OrgMember[];
  departments: Department[];
  teams: Team[];
  courses: Course[];
  learningPaths: LearningPath[];
  enrollments: Enrollment[];
  enrollmentsCursor: any | null;
  enrollmentsHasMore: boolean;
  genieSources: GenieSource[];
  genieDrafts: GenieCourseDraft[];
  genieAssessments: GenieAssessment[];
  genieEnrollmentRules: GenieEnrollmentRule[];
  certificates: Certificate[];
  certificateApprovals: CertificateApproval[];
  competencyScores: CompetencyScore[];
  competencyBadges: CompetencyBadge[];
  remediationAssignments: RemediationAssignment[];
  gapMatrixEntries: GapMatrixEntry[];
  reportSchedules: GenieReportSchedule[];
  reportRuns: GenieReportRun[];
  managerDigestRuns: ManagerDigestRun[];

  // Stats
  dashboardStats: AdminDashboardStats | null;
  departmentStats: DepartmentStats[];
  courseStats: CourseStats[];
  auditLogs: AuditLog[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions - Organization
  setCurrentOrg: (org: Organization | null) => void;
  setCurrentMember: (member: OrgMember | null) => void;
  createOrganization: (name: string, slug: string, creator?: { id?: string; name?: string; email?: string }) => Promise<Organization>;
  updateOrganization: (updates: Partial<Organization>) => Promise<void>;

  // Actions - Members
  loadMembers: () => Promise<void>;
  addMember: (email: string, name: string, role: UserRole, departmentId?: string) => Promise<OrgMember>;
  updateMember: (memberId: string, updates: Partial<OrgMember>) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  // Actions - Departments
  loadDepartments: () => Promise<void>;
  createDepartment: (name: string, description?: string) => Promise<Department>;
  updateDepartment: (deptId: string, updates: Partial<Department>) => Promise<void>;
  deleteDepartment: (deptId: string) => Promise<void>;

  // Actions - Teams
  loadTeams: () => Promise<void>;
  createTeam: (name: string, departmentId?: string) => Promise<Team>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;

  // Actions - Courses
  loadCourses: () => Promise<void>;
  loadLearningPaths: () => Promise<void>;
  createCourse: (course: Partial<Course>) => Promise<Course>;
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<void>;
  publishCourse: (courseId: string) => Promise<void>;
  archiveCourse: (courseId: string) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;

  // Actions - Enrollments
  loadEnrollments: (options?: { limit?: number; append?: boolean }) => Promise<void>;
  loadMoreEnrollments: () => Promise<void>;
  enrollUser: (userId: string, courseId: string, dueDate?: number, role?: 'student' | 'teacher') => Promise<Enrollment>;
  bulkEnroll: (userIds: string[], courseId: string, options?: { dueDate?: number; priority?: 'required' | 'recommended' | 'optional'; role?: 'student' | 'teacher' }) => Promise<Enrollment[]>;
  updateEnrollmentProgress: (enrollmentId: string, progress: number, moduleProgress?: Record<string, ModuleProgress>) => Promise<void>;
  deleteEnrollment: (enrollmentId: string) => Promise<void>;

  // Actions - Stats
  loadDashboardStats: () => Promise<void>;
  loadDepartmentStats: () => Promise<void>;
  loadCourseStats: () => Promise<void>;
  loadAuditLogs: () => Promise<void>;
  loadCertificates: () => Promise<void>;
  loadCertificateApprovals: () => Promise<void>;
  loadReportSchedules: () => Promise<void>;
  createReportSchedule: (payload: {
    frequency: 'weekly' | 'monthly';
    recipients: string;
    enabled?: boolean;
  }) => Promise<GenieReportSchedule>;
  loadReportRuns: () => Promise<void>;
  runReportNow: (scheduleId: string) => Promise<void>;
  loadManagerDigestRuns: () => Promise<void>;
  runManagerDigestNow: () => Promise<void>;
  loadCompetencyScores: () => Promise<void>;
  loadCompetencyBadges: () => Promise<void>;
  loadRemediationAssignments: () => Promise<void>;
  updateRemediationAssignment: (assignmentId: string, updates: Partial<RemediationAssignment>) => Promise<void>;
  loadGapMatrixEntries: (options?: { status?: GapMatrixEntry['status']; priority?: number }) => Promise<void>;
  createGapMatrixEntry: (payload: {
    userId: string;
    competencyId?: string;
    currentBloomLevel: number;
    targetBloomLevel: number;
    gapScore?: number;
    priority?: GapMatrixEntry['priority'];
    recommendedCourseId?: string;
  }) => Promise<GapMatrixEntry | null>;
  updateGapMatrixEntry: (entryId: string, updates: Partial<Pick<GapMatrixEntry, 'status' | 'priority' | 'recommendedCourseId'>>) => Promise<void>;
  closeGapMatrixEntry: (entryId: string) => Promise<void>;
  deleteGapMatrixEntry: (entryId: string) => Promise<void>;
  bulkCloseLowPriority: (minPriority?: GapMatrixEntry['priority']) => Promise<number>;
  issueCertificate: (params: {
    userId: string;
    courseId: string;
    title: string;
    expiresAt?: number;
    enrollmentId?: string;
    reason?: 'auto' | 'manual';
  }) => Promise<Certificate | null>;
  requestCertificateApproval: (payload: Omit<CertificateApproval, 'id' | 'requestedAt' | 'status' | 'orgId'>) => Promise<CertificateApproval | null>;
  approveCertificateApproval: (approvalId: string) => Promise<void>;
  rejectCertificateApproval: (approvalId: string) => Promise<void>;
  logAction: (entry: Omit<AuditLog, 'id' | 'createdAt' | 'orgId' | 'actorId' | 'actorName' | 'timestamp'> & {
    orgId?: string;
    actorId?: string;
    actorName?: string;
  }) => Promise<void>;

  // Actions - Genie Sources
  loadGenieSources: () => Promise<void>;
  addGenieSource: (source: Omit<GenieSource, 'id' | 'createdAt' | 'updatedAt'>) => Promise<GenieSource>;
  updateGenieSource: (sourceId: string, updates: Partial<GenieSource>) => Promise<void>;
  archiveGenieSource: (sourceId: string) => Promise<void>;

  // Actions - Genie Drafts
  createGenieDraft: (draft: Omit<GenieCourseDraft, 'id' | 'createdAt' | 'updatedAt'>) => Promise<GenieCourseDraft>;
  updateGenieDraft: (draftId: string, updates: Partial<GenieCourseDraft>) => Promise<void>;

  // Actions - Genie Assessments
  createGenieAssessment: (assessment: Omit<GenieAssessment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<GenieAssessment>;
  updateGenieAssessment: (assessmentId: string, updates: Partial<GenieAssessment>) => Promise<void>;
  deleteGenieAssessment: (assessmentId: string) => Promise<void>;

  // Actions - Genie Enrollment Rules
  createGenieEnrollmentRule: (rule: Omit<GenieEnrollmentRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<GenieEnrollmentRule>;
  updateGenieEnrollmentRule: (ruleId: string, updates: Partial<GenieEnrollmentRule>) => Promise<void>;
  deleteGenieEnrollmentRule: (ruleId: string) => Promise<void>;

  // Utility
  checkPermission: (permission: string) => boolean;
  setSelectedCourseId: (courseId: string | null) => void;
  reset: () => void;
}

const ADMIN_ROLES: UserRole[] = ['super_admin', 'org_admin', 'ld_manager'];

export const useLMSStore = create<LMSState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentOrg: null,
      currentMember: null,
      isAdmin: false,
      selectedCourseId: null,
      members: [],
      departments: [],
      teams: [],
      courses: [],
      learningPaths: [],
      enrollments: [],
      enrollmentsCursor: null,
      enrollmentsHasMore: true,
      genieSources: [],
      genieDrafts: [],
      genieAssessments: [],
      genieEnrollmentRules: [],
      certificates: [],
      certificateApprovals: [],
      competencyScores: [],
      competencyBadges: [],
      remediationAssignments: [],
      gapMatrixEntries: [],
      reportSchedules: [],
      reportRuns: [],
      managerDigestRuns: [],
      dashboardStats: null,
      departmentStats: [],
      courseStats: [],
      auditLogs: [],
      isLoading: false,
      error: null,

      // Organization actions
      setCurrentOrg: (org) => set({ currentOrg: org }),

      setCurrentMember: (member) => set({
        currentMember: member,
        isAdmin: member ? ADMIN_ROLES.includes(member.role) : false,
      }),

      setSelectedCourseId: (courseId) => set({ selectedCourseId: courseId }),

      createOrganization: async (name, slug, creator) => {
        set({ isLoading: true, error: null });
        try {
          // Ensure user is authenticated
          const authUser = useAuthStore.getState().user;
          if (!authUser) {
            throw new Error('Authentication required. Please sign in properly.');
          }

          const authUserId = authUser.id;
          const org = await organizationService.create({
            name,
            slug,
            settings: {
              branding: {
                primaryColor: '#6366f1',
                secondaryColor: '#8b5cf6',
              },
              features: {
                enableGamification: true,
                enableCertificates: true,
                enableDiscussions: true,
                enableLeaderboards: true,
                enableCustomBranding: false,
              },
              notifications: {
                emailEnabled: true,
                inAppEnabled: true,
                pushEnabled: false,
                digestFrequency: 'daily',
                courseEnrollment: true,
                courseCompletion: true,
                assignmentDue: true,
                certificateIssued: true,
                newAnnouncements: true,
                discussionReplies: true,
                gradePosted: true,
                reminderDaysBefore: 3,
                managerDigestEnabled: false,
                managerDigestFrequency: 'weekly',
                managerDigestRoles: ['team_lead', 'ld_manager']
              },
              compliance: {
                requireCompletionDeadlines: false,
                autoRemindDays: [7, 3, 1],
                overdueEscalation: false,
                autoIssueCertificates: true,
                logCompletionEvents: true,
                requireCertificateApproval: false,
              },
              defaults: {
                defaultLanguage: 'en',
                timezone: 'UTC',
                dateFormat: 'MM/DD/YYYY',
              },
            },
            subscription: 'free',
            createdBy: authUserId,
          });
          const creatorName = creator?.name?.trim() || 'Organization Owner';
          const creatorEmail = creator?.email?.trim() || `owner@${slug}.example`;
          const member = await userService.addMember({
            odId: org.id,
            orgId: org.id,
            userId: authUserId,
            email: creatorEmail,
            name: creatorName,
            role: 'org_admin',
            status: 'active',
            joinedAt: Date.now(),
          });
          set({
            currentOrg: org,
            currentMember: member,
            members: [member],
            isAdmin: true,
            isLoading: false
          });
          return org;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      updateOrganization: async (updates) => {
        const { currentOrg } = get();
        if (!currentOrg) throw new Error('No organization selected');

        set({ isLoading: true, error: null });
        try {
          await organizationService.update(currentOrg.id, updates);
          set({
            currentOrg: { ...currentOrg, ...updates },
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      // Member actions
      loadMembers: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;

        set({ isLoading: true, error: null });
        try {
          const members = await userService.listMembers(currentOrg.id);
          set({ members, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addMember: async (email, name, role, departmentId) => {
        const { currentOrg } = get();
        if (!currentOrg) throw new Error('No organization selected');

        set({ isLoading: true, error: null });
        try {
          const member = await userService.addMember({
            odId: currentOrg.id,
            orgId: currentOrg.id,
            email,
            name,
            role,
            departmentId,
            status: 'pending',
            invitedAt: Date.now(),
          });
          set((state) => ({
            members: [...state.members, member],
            isLoading: false,
          }));
          await get().logAction({
            action: 'member_invited',
            targetType: 'member',
            targetId: member.id,
            targetName: member.name,
            metadata: { email: member.email, role: member.role }
          });
          return member;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      updateMember: async (memberId, updates) => {
        set({ isLoading: true, error: null });
        try {
          await userService.updateMember(memberId, updates);
          const updated = get().members.find((m) => m.id === memberId);
          set((state) => ({
            members: state.members.map((m) =>
              m.id === memberId ? { ...m, ...updates } : m
            ),
            isLoading: false,
          }));
          if (updated) {
            await get().logAction({
              action: 'member_updated',
              targetType: 'member',
              targetId: memberId,
              targetName: updated.name,
              metadata: updates
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      removeMember: async (memberId) => {
        set({ isLoading: true, error: null });
        try {
          const target = get().members.find((m) => m.id === memberId);
          await userService.removeMember(memberId);
          set((state) => ({
            members: state.members.filter((m) => m.id !== memberId),
            isLoading: false,
          }));
          if (target) {
            await get().logAction({
              action: 'member_removed',
              targetType: 'member',
              targetId: memberId,
              targetName: target.name,
              metadata: { email: target.email }
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      // Department actions
      loadDepartments: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;

        set({ isLoading: true, error: null });
        try {
          const departments = await departmentService.list(currentOrg.id);
          set({ departments, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createDepartment: async (name, description) => {
        const { currentOrg } = get();
        if (!currentOrg) throw new Error('No organization selected');

        set({ isLoading: true, error: null });
        try {
          const dept = await departmentService.create({
            orgId: currentOrg.id,
            name,
            description,
          });
          set((state) => ({
            departments: [...state.departments, dept],
            isLoading: false,
          }));
          await get().logAction({
            action: 'department_created',
            targetType: 'department',
            targetId: dept.id,
            targetName: dept.name
          });
          return dept;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      updateDepartment: async (deptId, updates) => {
        set({ isLoading: true, error: null });
        try {
          await departmentService.update(deptId, updates);
          const updated = get().departments.find((d) => d.id === deptId);
          set((state) => ({
            departments: state.departments.map((d) =>
              d.id === deptId ? { ...d, ...updates } : d
            ),
            isLoading: false,
          }));
          if (updated) {
            await get().logAction({
              action: 'department_updated',
              targetType: 'department',
              targetId: deptId,
              targetName: updated.name,
              metadata: updates
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      deleteDepartment: async (deptId) => {
        set({ isLoading: true, error: null });
        try {
          const target = get().departments.find((d) => d.id === deptId);
          await departmentService.remove(deptId);
          set((state) => ({
            departments: state.departments.filter((d) => d.id !== deptId),
            isLoading: false,
          }));
          if (target) {
            await get().logAction({
              action: 'department_deleted',
              targetType: 'department',
              targetId: deptId,
              targetName: target.name
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      // Team actions
      loadTeams: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;

        set({ isLoading: true, error: null });
        try {
          const teams = await teamService.list(currentOrg.id);
          set({ teams, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createTeam: async (name, departmentId) => {
        const { currentOrg } = get();
        if (!currentOrg) throw new Error('No organization selected');

        set({ isLoading: true, error: null });
        try {
          const team = await teamService.create({
            orgId: currentOrg.id,
            name,
            departmentId,
            memberIds: [],
          });
          set((state) => ({
            teams: [...state.teams, team],
            isLoading: false,
          }));
          await get().logAction({
            action: 'team_created',
            targetType: 'team',
            targetId: team.id,
            targetName: team.name
          });
          return team;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      updateTeam: async (teamId, updates) => {
        set({ isLoading: true, error: null });
        try {
          await teamService.update(teamId, updates);
          const updated = get().teams.find((t) => t.id === teamId);
          set((state) => ({
            teams: state.teams.map((t) =>
              t.id === teamId ? { ...t, ...updates } : t
            ),
            isLoading: false,
          }));
          if (updated) {
            await get().logAction({
              action: 'team_updated',
              targetType: 'team',
              targetId: teamId,
              targetName: updated.name,
              metadata: updates
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      deleteTeam: async (teamId) => {
        set({ isLoading: true, error: null });
        try {
          const target = get().teams.find((t) => t.id === teamId);
          await teamService.remove(teamId);
          set((state) => ({
            teams: state.teams.filter((t) => t.id !== teamId),
            isLoading: false,
          }));
          if (target) {
            await get().logAction({
              action: 'team_deleted',
              targetType: 'team',
              targetId: teamId,
              targetName: target.name
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      // Course actions
      loadCourses: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;

        set({ isLoading: true, error: null });
        try {
          const courses = await courseService.list(currentOrg.id);
          set({ courses, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadLearningPaths: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;

        set({ isLoading: true, error: null });
        try {
          const learningPaths = await learningPathService.list(currentOrg.id);
          set({ learningPaths, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createCourse: async (courseData) => {
        const { currentOrg, currentMember } = get();
        if (!currentOrg) throw new Error('No organization selected');
        if (!currentMember) throw new Error('No user logged in');

        set({ isLoading: true, error: null });
        try {
          const course = await courseService.create({
            orgId: currentOrg.id,
            title: courseData.title || 'Untitled Course',
            description: courseData.description || '',
            category: courseData.category || 'General',
            tags: courseData.tags || [],
            difficulty: courseData.difficulty || 'beginner',
            estimatedDuration: courseData.estimatedDuration || 60,
            modules: courseData.modules || [],
            status: 'draft',
            createdBy: currentMember.id,
            settings: {
              allowSelfEnrollment: false,
              allowGuestAccess: false,
              allowCohortSync: false,
              requireSequentialProgress: true,
              showProgressBar: true,
              enableDiscussions: false,
              enableCertificate: true,
              passingScore: 70,
              maxAttempts: 3,
              completionCriteria: {
                requireAssessmentPass: false,
                minScore: 70
              },
              ...(courseData.settings || {}),
            },
          });
          set((state) => ({
            courses: [...state.courses, course],
            isLoading: false,
          }));
          await get().logAction({
            action: 'course_created',
            targetType: 'course',
            targetId: course.id,
            targetName: course.title
          });
          return course;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      updateCourse: async (courseId, updates) => {
        set({ isLoading: true, error: null });
        try {
          await courseService.update(courseId, updates);
          const updated = get().courses.find((c) => c.id === courseId);
          set((state) => ({
            courses: state.courses.map((c) =>
              c.id === courseId ? { ...c, ...updates, updatedAt: Date.now() } : c
            ),
            isLoading: false,
          }));
          if (updated) {
            await get().logAction({
              action: 'course_updated',
              targetType: 'course',
              targetId: courseId,
              targetName: updated.title,
              metadata: updates
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      publishCourse: async (courseId) => {
        set({ isLoading: true, error: null });
        try {
          await courseService.publish(courseId);
          const published = get().courses.find((c) => c.id === courseId);
          set((state) => ({
            courses: state.courses.map((c) =>
              c.id === courseId
                ? { ...c, status: 'published' as const, publishedAt: Date.now() }
                : c
            ),
            isLoading: false,
          }));
          if (published) {
            await get().logAction({
              action: 'course_published',
              targetType: 'course',
              targetId: courseId,
              targetName: published.title
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      archiveCourse: async (courseId) => {
        set({ isLoading: true, error: null });
        try {
          await courseService.archive(courseId);
          const archived = get().courses.find((c) => c.id === courseId);
          set((state) => ({
            courses: state.courses.map((c) =>
              c.id === courseId ? { ...c, status: 'archived' as const } : c
            ),
            isLoading: false,
          }));
          if (archived) {
            await get().logAction({
              action: 'course_archived',
              targetType: 'course',
              targetId: courseId,
              targetName: archived.title
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      deleteCourse: async (courseId) => {
        set({ isLoading: true, error: null });
        try {
          const target = get().courses.find((c) => c.id === courseId);
          await courseService.remove(courseId);
          set((state) => ({
            courses: state.courses.filter((c) => c.id !== courseId),
            isLoading: false,
          }));
          if (target) {
            await get().logAction({
              action: 'course_deleted',
              targetType: 'course',
              targetId: courseId,
              targetName: target.title
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      // Enrollment actions
      loadEnrollments: async (options) => {
        const { currentOrg, currentMember, isAdmin } = get();
        if (!currentOrg || !currentMember) return;

        set({ isLoading: true, error: null });
        try {
          let enrollments: Enrollment[] = [];
          let nextCursor: any | null = null;
          let hasMore = false;
          const limitCount = options?.limit ?? 200;
          if (isAdmin) {
            const cursor = options?.append ? get().enrollmentsCursor : undefined;
            const page = await enrollmentService.listForOrgPage(currentOrg.id, { limitCount, cursor });
            enrollments = page.enrollments;
            nextCursor = page.lastDoc || null;
            hasMore = enrollments.length === limitCount;
          } else {
            // Regular users see only their enrollments
            enrollments = await enrollmentService.listForUser(currentOrg.id, currentMember.id);
          }
          set((state) => ({
            enrollments: options?.append ? [...state.enrollments, ...enrollments] : enrollments,
            enrollmentsCursor: nextCursor,
            enrollmentsHasMore: hasMore,
            isLoading: false
          }));
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadMoreEnrollments: async () => {
        const { enrollmentsHasMore, isLoading } = get();
        if (!enrollmentsHasMore || isLoading) return;
        await get().loadEnrollments({ append: true });
      },

      enrollUser: async (userId, courseId, dueDate, role) => {
        const { currentOrg, currentMember } = get();
        if (!currentOrg) throw new Error('No organization selected');
        if (!currentMember) throw new Error('No user logged in');

        set({ isLoading: true, error: null });
        try {
          const member = get().members.find((m) => m.id === userId);
          const enrollment = await enrollmentService.create({
            odId: currentOrg.id,
            orgId: currentOrg.id,
            userId,
            userAuthId: member?.userId,
            courseId,
            assignedBy: currentMember.id,
            assignedAt: Date.now(),
            dueDate,
            role: role || 'student',
            priority: 'required',
            status: 'not_started',
            progress: 0,
            attempts: 0,
            moduleProgress: {},
          });
          set((state) => ({
            enrollments: [...state.enrollments, enrollment],
            isLoading: false,
          }));
          await get().logAction({
            action: 'enrollment_created',
            targetType: 'enrollment',
            targetId: enrollment.id,
            targetName: enrollment.userId,
            metadata: { courseId: enrollment.courseId, role: enrollment.role }
          });
          const course = get().courses.find((c) => c.id === courseId);
          const notificationSettings = currentOrg.settings?.notifications;
          const channels = getNotificationChannels(notificationSettings);
          if (notificationSettings?.courseEnrollment && channels.length > 0 && course && member) {
            await notifyTrainingAssigned(currentOrg.id, enrollment, course, currentMember, channels);
          }
          return enrollment;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      bulkEnroll: async (userIds, courseId, options) => {
        const { currentOrg, currentMember } = get();
        if (!currentOrg) throw new Error('No organization selected');
        if (!currentMember) throw new Error('No user logged in');

        set({ isLoading: true, error: null });
        try {
          const memberMap = new Map(get().members.map((member) => [member.id, member.userId]));
          const enrollments = await enrollmentService.bulkEnroll(
            currentOrg.id,
            userIds,
            courseId,
            currentMember.id,
            {
              dueDate: options?.dueDate,
              priority: options?.priority || 'required',
              role: options?.role || 'student',
              userAuthIdMap: Object.fromEntries(memberMap)
            }
          );
          set((state) => ({
            enrollments: [...state.enrollments, ...enrollments],
            isLoading: false,
          }));
          await get().logAction({
            action: 'enrollment_bulk_created',
            targetType: 'course',
            targetId: courseId,
            targetName: courseId,
            metadata: { count: enrollments.length }
          });
          const course = get().courses.find((c) => c.id === courseId);
          const notificationSettings = currentOrg.settings?.notifications;
          const channels = getNotificationChannels(notificationSettings);
          if (notificationSettings?.courseEnrollment && channels.length > 0 && course) {
            await Promise.all(enrollments.map((enrollment) => {
              const member = get().members.find((m) => m.id === enrollment.userId);
              if (!member) return Promise.resolve();
              return notifyTrainingAssigned(currentOrg.id, enrollment, course, currentMember, channels);
            }));
          }
          return enrollments;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      updateEnrollmentProgress: async (enrollmentId, progress, moduleProgress) => {
        set({ isLoading: true, error: null });
        try {
          const { enrollments, certificateApprovals } = get();
          const existingEnrollment = enrollments.find((e) => e.id === enrollmentId);
          const wasCompleted = existingEnrollment?.status === 'completed';
          await enrollmentService.updateProgress(enrollmentId, progress, moduleProgress);
          set((state) => ({
            enrollments: state.enrollments.map((e) =>
              e.id === enrollmentId
                ? {
                  ...e,
                  progress,
                  moduleProgress: moduleProgress || e.moduleProgress,
                  status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : e.status,
                  completedAt: progress === 100 ? Date.now() : e.completedAt,
                }
                : e
            ),
            isLoading: false,
          }));
          const { currentOrg, courses, certificates } = get();
          const orgSettings = currentOrg?.settings;
          const notificationSettings = orgSettings?.notifications;
          const autoIssue = orgSettings?.compliance?.autoIssueCertificates ?? true;
          const requireApproval = orgSettings?.compliance?.requireCertificateApproval ?? false;
          const logCompletion = orgSettings?.compliance?.logCompletionEvents ?? true;
          if (progress === 100 && existingEnrollment && !wasCompleted) {
            if (logCompletion) {
              await get().logAction({
                action: 'enrollment_completed',
                targetType: 'enrollment',
                targetId: enrollmentId,
                targetName: existingEnrollment.userId,
                metadata: { courseId: existingEnrollment.courseId }
              });
            }
            const course = courses.find((c) => c.id === existingEnrollment.courseId);
            const channels = getNotificationChannels(notificationSettings);
          if (notificationSettings?.courseCompletion && channels.length > 0 && course) {
            await notifyCourseCompleted(currentOrg?.id || '', existingEnrollment, course, channels);
          }
          if (notificationSettings?.assignmentDue && channels.length > 0 && course && existingEnrollment.dueDate) {
            const daysRemaining = Math.ceil((existingEnrollment.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysRemaining >= 0 && daysRemaining <= notificationSettings.reminderDaysBefore) {
              await notifyDeadlineReminder(currentOrg?.id || '', existingEnrollment, course, daysRemaining, channels);
            } else if (daysRemaining < 0) {
              const daysOverdue = Math.abs(daysRemaining);
              await notifyTrainingOverdue(currentOrg?.id || '', existingEnrollment, course, daysOverdue, channels);
            }
          }
            if (orgSettings?.features?.enableCertificates && autoIssue) {
              const alreadyIssued = Boolean(existingEnrollment.certificate) ||
                certificates.some((cert) =>
                  cert.userId === existingEnrollment.userId &&
                  cert.courseId === existingEnrollment.courseId
                );
              if (!alreadyIssued) {
                if (requireApproval) {
                  const alreadyPending = certificateApprovals.some((approval) =>
                    approval.status === 'pending' &&
                    approval.userId === existingEnrollment.userId &&
                    approval.courseId === existingEnrollment.courseId &&
                    approval.enrollmentId === existingEnrollment.id
                  );
                  if (!alreadyPending) {
                    await get().requestCertificateApproval({
                      userId: existingEnrollment.userId,
                      courseId: existingEnrollment.courseId,
                      enrollmentId: existingEnrollment.id,
                      reason: 'auto'
                    });
                  }
                } else {
                  const course = courses.find((c) => c.id === existingEnrollment.courseId);
                  await get().issueCertificate({
                    userId: existingEnrollment.userId,
                    courseId: existingEnrollment.courseId,
                    title: course?.title || 'Course Completion',
                    enrollmentId: existingEnrollment.id,
                    reason: 'auto'
                  });
                }
              }
            }
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      deleteEnrollment: async (enrollmentId) => {
        set({ isLoading: true, error: null });
        try {
          const target = get().enrollments.find((e) => e.id === enrollmentId);
          await enrollmentService.remove(enrollmentId);
          set((state) => ({
            enrollments: state.enrollments.filter((e) => e.id !== enrollmentId),
            isLoading: false,
          }));
          if (target) {
            await get().logAction({
              action: 'enrollment_deleted',
              targetType: 'enrollment',
              targetId: enrollmentId,
              targetName: target.userId,
              metadata: { courseId: target.courseId }
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      // Stats actions
      loadDashboardStats: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;

        set({ isLoading: true, error: null });
        try {
          const stats = await statsService.getAdminDashboardStats(currentOrg.id);
          set({ dashboardStats: stats, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadDepartmentStats: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;

        set({ isLoading: true, error: null });
        try {
          const stats = await statsService.getDepartmentStats(currentOrg.id);
          set({ departmentStats: stats, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadCourseStats: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;

        set({ isLoading: true, error: null });
        try {
          const stats = await statsService.getCourseStats(currentOrg.id);
          set({ courseStats: stats, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadAuditLogs: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const logs = await auditService.list(currentOrg.id);
          set({ auditLogs: logs, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadCertificates: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const certs = await certificateService.listForOrg(currentOrg.id);
          set({ certificates: certs, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadCertificateApprovals: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const approvals = await certificateService.listApprovals(currentOrg.id);
          set({ certificateApprovals: approvals, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadCompetencyScores: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const scores = await competencyService.listForOrg(currentOrg.id);
          set({ competencyScores: scores, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadCompetencyBadges: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const badges = await competencyBadgeService.listForOrg(currentOrg.id);
          set({ competencyBadges: badges, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      loadRemediationAssignments: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const assignments = await remediationService.listForOrg(currentOrg.id);
          set({ remediationAssignments: assignments, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      updateRemediationAssignment: async (assignmentId, updates) => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        try {
          await remediationService.update(assignmentId, updates);
          set((state) => ({
            remediationAssignments: state.remediationAssignments.map((assignment) =>
              assignment.id === assignmentId
                ? { ...assignment, ...updates, updatedAt: Date.now() }
                : assignment
            )
          }));
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      loadGapMatrixEntries: async (options) => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const entries = await gapMatrixService.listForOrg(currentOrg.id, options);
          set({ gapMatrixEntries: gapMatrixService.sortByUrgency(entries), isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createGapMatrixEntry: async (payload) => {
        const { currentOrg } = get();
        if (!currentOrg) return null;
        set({ isLoading: true, error: null });
        try {
          const entry = await gapMatrixService.create(currentOrg.id, payload);
          set((state) => ({
            gapMatrixEntries: gapMatrixService.sortByUrgency([entry, ...state.gapMatrixEntries]),
            isLoading: false
          }));
          return entry;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          return null;
        }
      },

      updateGapMatrixEntry: async (entryId, updates) => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          await gapMatrixService.update(currentOrg.id, entryId, updates);
          set((state) => ({
            gapMatrixEntries: state.gapMatrixEntries.map((entry) =>
              entry.id === entryId ? { ...entry, ...updates } : entry
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      closeGapMatrixEntry: async (entryId) => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          await gapMatrixService.close(currentOrg.id, entryId);
          set((state) => ({
            gapMatrixEntries: state.gapMatrixEntries.map((entry) =>
              entry.id === entryId ? { ...entry, status: 'closed' } : entry
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      deleteGapMatrixEntry: async (entryId) => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          await gapMatrixService.delete(currentOrg.id, entryId);
          set((state) => ({
            gapMatrixEntries: state.gapMatrixEntries.filter((entry) => entry.id !== entryId),
            isLoading: false
          }));
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      bulkCloseLowPriority: async (minPriority = 4) => {
        const { currentOrg } = get();
        if (!currentOrg) return 0;
        set({ isLoading: true, error: null });
        try {
          const priorities = new Set<number>();
          for (let p = minPriority; p <= 5; p += 1) priorities.add(p);
          const batches = await Promise.all(
            Array.from(priorities).map((priority) =>
              gapMatrixService.listForOrg(currentOrg.id, { priority })
            )
          );
          const toClose = batches.flat().filter((entry) => entry.status !== 'closed');
          await Promise.all(toClose.map((entry) => gapMatrixService.close(currentOrg.id, entry.id)));
          const toCloseIds = new Set(toClose.map((entry) => entry.id));
          set((state) => ({
            gapMatrixEntries: state.gapMatrixEntries.map((entry) =>
              toCloseIds.has(entry.id) ? { ...entry, status: 'closed' } : entry
            ),
            isLoading: false
          }));
          return toClose.length;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          return 0;
        }
      },

      loadReportSchedules: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const schedules = await reportService.listGenieSchedules(currentOrg.id);
          set({ reportSchedules: schedules, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createReportSchedule: async (payload) => {
        const { currentOrg } = get();
        if (!currentOrg) throw new Error('No organization selected');
        set({ isLoading: true, error: null });
        try {
          const schedule = await reportService.createGenieSchedule({
            orgId: currentOrg.id,
            frequency: payload.frequency,
            recipients: payload.recipients,
            enabled: payload.enabled ?? true
          });
          set((state) => ({
            reportSchedules: [schedule, ...state.reportSchedules],
            isLoading: false
          }));
          return schedule;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      loadReportRuns: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const runs = await reportService.listGenieRuns(currentOrg.id);
          set({ reportRuns: runs, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      runReportNow: async (scheduleId) => {
        const { currentOrg, reportSchedules } = get();
        if (!currentOrg) return;
        const schedule = reportSchedules.find((item) => item.id === scheduleId);
        if (!schedule) return;
        const run = await reportService.createGenieRun(
          currentOrg.id,
          scheduleId,
          schedule.recipients
        );
        await reportService.updateGenieSchedule(scheduleId, { lastRunAt: Date.now() });
        set((state) => ({
          reportRuns: [run, ...state.reportRuns],
          reportSchedules: state.reportSchedules.map((item) =>
            item.id === scheduleId ? { ...item, lastRunAt: Date.now() } : item
          )
        }));
      },

      loadManagerDigestRuns: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        set({ isLoading: true, error: null });
        try {
          const runs = await reportService.listManagerDigestRuns(currentOrg.id);
          set({ managerDigestRuns: runs, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      runManagerDigestNow: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
        const notifications = currentOrg.settings?.notifications;
        if (!notifications?.managerDigestEnabled) return;
        const run = await reportService.createManagerDigestRun(
          currentOrg.id,
          notifications.managerDigestFrequency,
          notifications.managerDigestRoles
        );
        set((state) => ({
          managerDigestRuns: [run, ...state.managerDigestRuns]
        }));
      },

      issueCertificate: async ({ userId, courseId, title, expiresAt, enrollmentId, reason }) => {
        const { currentOrg, currentMember } = get();
        if (!currentOrg) throw new Error('No organization selected');
        try {
          const assessmentResults = enrollmentId
            ? await assessmentService.listForEnrollment(currentOrg.id, enrollmentId)
            : [];
          const assessmentScore = assessmentResults.length
            ? Math.round(assessmentResults.reduce((sum, result) => sum + (result.score || 0), 0) / assessmentResults.length)
            : undefined;
          const courseVersion = get().courses.find((course) => course.id === courseId)?.version;
          const evidence = {
            assessmentResultIds: assessmentResults.map((result) => result.id),
            completionProgress: enrollmentId
              ? get().enrollments.find((enrollment) => enrollment.id === enrollmentId)?.progress
              : undefined,
            issuedBy: currentMember?.id,
            assessmentScore,
            courseVersion
          };
          const certificate = await certificateService.issue({
            orgId: currentOrg.id,
            userId,
            courseId,
            title,
            expiresAt,
            evidence
          });
          set((state) => ({
            certificates: [certificate, ...state.certificates],
            enrollments: state.enrollments.map((enrollment) =>
              enrollment.id === enrollmentId
                ? { ...enrollment, certificate }
                : enrollment
            )
          }));
          if (enrollmentId) {
            await enrollmentService.update(enrollmentId, { certificate });
          }
          const notificationSettings = currentOrg.settings?.notifications;
          const channels = getNotificationChannels(notificationSettings);
          if (notificationSettings?.certificateIssued && channels.length > 0) {
            await notifyCertificateIssued(
              currentOrg.id,
              userId,
              certificate.id,
              title,
              expiresAt,
              channels
            );
          }
          const logCompletion = currentOrg.settings?.compliance?.logCompletionEvents ?? true;
          if (logCompletion) {
            await get().logAction({
              action: 'certificate_issued',
              targetType: 'certificate',
              targetId: certificate.id,
              targetName: title,
              metadata: {
                userId,
                courseId,
                reason: reason || 'manual',
                certificateNumber: certificate.certificateNumber
              },
              actorId: currentMember?.id,
              actorName: currentMember?.name
            });
          }
          return certificate;
        } catch (error) {
          set({ error: (error as Error).message });
          return null;
        }
      },

      requestCertificateApproval: async (payload) => {
        const { currentOrg, currentMember } = get();
        if (!currentOrg) throw new Error('No organization selected');
        try {
          const approval = await certificateService.requestApproval({
            ...payload,
            orgId: currentOrg.id,
            status: 'pending',
            requestedAt: Date.now(),
          });
          set((state) => ({
            certificateApprovals: [approval, ...state.certificateApprovals],
          }));
          await get().logAction({
            action: 'certificate_approval_requested',
            targetType: 'certificate',
            targetId: approval.id,
            targetName: approval.courseId,
            metadata: { userId: approval.userId, courseId: approval.courseId },
            actorId: currentMember?.id,
            actorName: currentMember?.name
          });
          return approval;
        } catch (error) {
          set({ error: (error as Error).message });
          return null;
        }
      },

      approveCertificateApproval: async (approvalId) => {
        const { certificateApprovals, currentMember, courses } = get();
        const approval = certificateApprovals.find((item) => item.id === approvalId);
        if (!approval) return;
        await certificateService.updateApproval(approvalId, {
          status: 'approved',
          decidedAt: Date.now(),
          decidedBy: currentMember?.id,
        });
        set((state) => ({
          certificateApprovals: state.certificateApprovals.map((item) =>
            item.id === approvalId
              ? { ...item, status: 'approved', decidedAt: Date.now(), decidedBy: currentMember?.id }
              : item
          ),
        }));
        await get().logAction({
          action: 'certificate_approval_approved',
          targetType: 'certificate',
          targetId: approvalId,
          targetName: approval.courseId,
          metadata: { userId: approval.userId, courseId: approval.courseId }
        });
        const course = courses.find((c) => c.id === approval.courseId);
        await get().issueCertificate({
          userId: approval.userId,
          courseId: approval.courseId,
          title: course?.title || 'Course Completion',
          enrollmentId: approval.enrollmentId,
          reason: 'manual'
        });
      },

      rejectCertificateApproval: async (approvalId) => {
        const { currentMember } = get();
        await certificateService.updateApproval(approvalId, {
          status: 'rejected',
          decidedAt: Date.now(),
          decidedBy: currentMember?.id,
        });
        set((state) => ({
          certificateApprovals: state.certificateApprovals.map((item) =>
            item.id === approvalId
              ? { ...item, status: 'rejected', decidedAt: Date.now(), decidedBy: currentMember?.id }
              : item
          ),
        }));
        await get().logAction({
          action: 'certificate_approval_rejected',
          targetType: 'certificate',
          targetId: approvalId,
          targetName: 'Certificate approval',
        });
      },

      // Genie sources actions
      loadGenieSources: async () => {
        const { currentOrg } = get();
        if (!currentOrg) return;
      },

      addGenieSource: async (source) => {
        const { currentOrg, genieSources } = get();
        if (!currentOrg) throw new Error('No organization selected');

        const now = Date.now();
        const newSource: GenieSource = {
          ...source,
          id: `genie_${now}_${Math.random().toString(36).slice(2, 8)}`,
          orgId: currentOrg.id,
          createdAt: now,
          updatedAt: now,
        };

        set({ genieSources: [newSource, ...genieSources] });
        return newSource;
      },

      updateGenieSource: async (sourceId, updates) => {
        const { genieSources } = get();
        const next = genieSources.map((source) =>
          source.id === sourceId
            ? { ...source, ...updates, updatedAt: Date.now() }
            : source
        );
        set({ genieSources: next });
      },

      archiveGenieSource: async (sourceId) => {
        const { genieSources } = get();
        const next = genieSources.map((source) =>
          source.id === sourceId
            ? { ...source, status: 'archived' as const, updatedAt: Date.now() }
            : source
        );
        set({ genieSources: next });
      },

      // Genie draft actions
      createGenieDraft: async (draft) => {
        const { currentOrg, genieDrafts } = get();
        if (!currentOrg) throw new Error('No organization selected');

        const now = Date.now();
        const newDraft: GenieCourseDraft = {
          ...draft,
          id: `genie_draft_${now}_${Math.random().toString(36).slice(2, 8)}`,
          orgId: currentOrg.id,
          createdAt: now,
          updatedAt: now,
        };
        set({ genieDrafts: [newDraft, ...genieDrafts] });
        return newDraft;
      },

      updateGenieDraft: async (draftId, updates) => {
        const { genieDrafts } = get();
        const next = genieDrafts.map((draft) =>
          draft.id === draftId
            ? { ...draft, ...updates, updatedAt: Date.now() }
            : draft
        );
        set({ genieDrafts: next });
      },

      createGenieAssessment: async (assessment) => {
        const { currentOrg, genieAssessments } = get();
        if (!currentOrg) throw new Error('No organization selected');

        const now = Date.now();
        const newAssessment: GenieAssessment = {
          ...assessment,
          id: `genie_assess_${now}_${Math.random().toString(36).slice(2, 8)}`,
          orgId: currentOrg.id,
          createdAt: now,
          updatedAt: now,
        };
        set({ genieAssessments: [newAssessment, ...genieAssessments] });
        return newAssessment;
      },

      updateGenieAssessment: async (assessmentId, updates) => {
        const { genieAssessments } = get();
        const next = genieAssessments.map((assessment) =>
          assessment.id === assessmentId
            ? { ...assessment, ...updates, updatedAt: Date.now() }
            : assessment
        );
        set({ genieAssessments: next });
      },

      deleteGenieAssessment: async (assessmentId) => {
        const { genieAssessments } = get();
        set({ genieAssessments: genieAssessments.filter((assessment) => assessment.id !== assessmentId) });
      },

      createGenieEnrollmentRule: async (rule) => {
        const { currentOrg, genieEnrollmentRules } = get();
        if (!currentOrg) throw new Error('No organization selected');

        const now = Date.now();
        const newRule: GenieEnrollmentRule = {
          ...rule,
          id: `genie_rule_${now}_${Math.random().toString(36).slice(2, 8)}`,
          orgId: currentOrg.id,
          createdAt: now,
          updatedAt: now,
        };
        set({ genieEnrollmentRules: [newRule, ...genieEnrollmentRules] });
        return newRule;
      },

      updateGenieEnrollmentRule: async (ruleId, updates) => {
        const { genieEnrollmentRules } = get();
        const next = genieEnrollmentRules.map((rule) =>
          rule.id === ruleId
            ? { ...rule, ...updates, updatedAt: Date.now() }
            : rule
        );
        set({ genieEnrollmentRules: next });
      },

      deleteGenieEnrollmentRule: async (ruleId) => {
        const { genieEnrollmentRules } = get();
        set({ genieEnrollmentRules: genieEnrollmentRules.filter((rule) => rule.id !== ruleId) });
      },

      logAction: async (entry) => {
        const { currentOrg, currentMember } = get();
        if (!currentOrg || !currentMember) return;
        try {
          const actorType = ADMIN_ROLES.includes(currentMember.role) ? 'admin' : 'user';
          const orgId = entry.orgId || currentOrg.id;
          const actorId = entry.actorId || currentMember.id;
          const actorName = entry.actorName || currentMember.name;

          await observabilityService.logUserAction({
            orgId,
            actorId,
            actorName,
            actorType,
            action: entry.action,
            status: 'success',
            entityType: entry.entityType || entry.targetType,
            entityId: entry.entityId || entry.targetId,
            metadata: {
              targetType: entry.targetType,
              targetName: entry.targetName,
              ...entry.metadata
            }
          });

          const adminOrCompliance = actorType === 'admin'
            || entry.action.includes('compliance')
            || entry.action.includes('approval')
            || entry.action.includes('security');

          if (adminOrCompliance) {
            await observabilityService.log({
              orgId,
              category: entry.action.includes('compliance') ? 'compliance' : 'admin',
              action: entry.action,
              status: 'success',
              actorId,
              actorName,
              actorType,
              entityType: entry.entityType || entry.targetType,
              entityId: entry.entityId || entry.targetId,
              metadata: entry.metadata
            });
          }

          const log = await auditService.create({
            orgId,
            actorId,
            actorName,
            actorType,
            action: entry.action,
            entityType: entry.entityType || entry.targetType,
            entityId: entry.entityId || entry.targetId,
            targetType: entry.targetType,
            targetId: entry.targetId,
            targetName: entry.targetName,
            changes: entry.changes,
            metadata: entry.metadata,
            timestamp: Date.now(),
            createdAt: Date.now(),
          });
          set((state) => ({
            auditLogs: [log, ...state.auditLogs].slice(0, 100),
          }));
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      // Utility
      checkPermission: (permission) => {
        const { currentMember } = get();
        if (!currentMember) return false;

        const rolePermissions = {
          super_admin: ['*'],
          org_admin: ['*'],
          ld_manager: ['courses:*', 'enrollments:*', 'reports:read'],
          team_lead: ['enrollments:read:team', 'reports:read:team'],
          instructor: ['courses:read', 'courses:update'],
          learner: ['enrollments:read:self'],
        };

        const permissions = rolePermissions[currentMember.role] || [];
        return (
          permissions.includes('*') ||
          permissions.includes(permission) ||
          permissions.some((p) => p.endsWith(':*') && permission.startsWith(p.slice(0, -1)))
        );
      },

      reset: () =>
        set({
          currentOrg: null,
          currentMember: null,
          isAdmin: false,
          selectedCourseId: null,
          members: [],
          departments: [],
          teams: [],
          courses: [],
          enrollments: [],
          genieSources: [],
          genieDrafts: [],
          genieAssessments: [],
          genieEnrollmentRules: [],
          dashboardStats: null,
          departmentStats: [],
          courseStats: [],
          auditLogs: [],
          certificates: [],
          certificateApprovals: [],
          competencyScores: [],
          competencyBadges: [],
          remediationAssignments: [],
          gapMatrixEntries: [],
          reportSchedules: [],
          reportRuns: [],
          managerDigestRuns: [],
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'tuutta-lms-storage',
      partialize: (state) => ({
        currentOrg: state.currentOrg,
        currentMember: state.currentMember,
      }),
    }
  )
);

// Bootstrap LMS context whenever the auth user changes (Django JWT auth).
useAuthStore.subscribe(async (authState, prevAuthState) => {
  const user = authState.user;
  const wasAuthenticated = prevAuthState.isAuthenticated;
  const isAuthenticated = authState.isAuthenticated;

  // User signed out — reset LMS state
  if (!isAuthenticated && wasAuthenticated) {
    useLMSStore.getState().reset();
    return;
  }

  if (!user) return;

  const state = useLMSStore.getState();
  const currentMember = state.currentMember;
  const currentOrg = state.currentOrg;

  // Already bootstrapped for this user
  if (currentOrg?.id && currentMember?.userId === user.id) {
    return;
  }

  try {
    const memberships = await userService.listMembershipsForUser(user.id);
    if (!memberships.length) {
      state.reset();
      return;
    }

    const preferredMember =
      memberships.find(m => m.role === 'org_admin' || m.role === 'ld_manager' || m.role === 'super_admin')
      ?? memberships[0];
    const orgId = preferredMember.orgId || (preferredMember as any).odId;
    if (!orgId) {
      state.reset();
      return;
    }

    const org = await organizationService.get(orgId);
    if (!org) {
      state.reset();
      return;
    }

    useLMSStore.setState({
      currentOrg: org,
      currentMember: preferredMember,
      isAdmin: ADMIN_ROLES.includes(preferredMember.role),
    });
  } catch (error) {
    console.error('Failed to bootstrap LMS membership context:', error);
  }
});
