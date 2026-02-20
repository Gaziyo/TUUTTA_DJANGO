import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  Query,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Organization,
  OrganizationSettings,
  OrgMember,
  Department,
  Team,
  Course,
  LearningPath,
  Enrollment,
  EnrollmentStatus,
  AssignmentRule,
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

const stripUndefined = <T extends Record<string, any>>(payload: T): T => {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as T;
};

// Hardened rules currently authorize top-level canonical/legacy collections,
// not ad-hoc org subcollections like /organizations/{orgId}/users.
// Keep this off until matching rules are explicitly added.
const USE_ORG_SUBCOLLECTIONS = false;

const orgCollection = (orgId: string, name: string) =>
  collection(db, COLLECTIONS.ORGANIZATIONS, orgId, name);

const orgDoc = (orgId: string, name: string, docId: string) =>
  doc(db, COLLECTIONS.ORGANIZATIONS, orgId, name, docId);

const getDocsWithFallback = async (primary: Query, fallback: Query) => {
  const primarySnap = await getDocs(primary);
  if (!primarySnap.empty) return primarySnap;
  return getDocs(fallback);
};

// Collection names
const COLLECTIONS = {
  ORGANIZATIONS: 'organizations',
  ORG_MEMBERS: 'orgMembers',
  DEPARTMENTS: 'departments',
  TEAMS: 'teams',
  COURSES: 'courses',
  LEARNING_PATHS: 'learningPaths',
  ENROLLMENTS: 'enrollments',
  PROGRESS: 'progress',
  MODULE_PROGRESS: 'moduleProgress',
  ASSESSMENT_RESULTS: 'assessmentResults',
  ASSIGNMENT_RULES: 'assignmentRules',
  CERTIFICATES: 'certificates',
  CERTIFICATE_APPROVALS: 'certificateApprovals',
  NOTIFICATIONS: 'lmsNotifications',
  AUDIT_LOGS: 'auditLogs',
  GENIE_PIPELINE_PROJECTS: 'geniePipelineProjects',
  COMPETENCY_SCORES: 'competencyScores',
  COMPETENCY_BADGES: 'competencyBadges',
  REMEDIATION_ASSIGNMENTS: 'remediationAssignments',
};

// ========== Organization Operations ==========

export const createOrganization = async (org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> => {
  const orgRef = doc(collection(db, COLLECTIONS.ORGANIZATIONS));
  const newOrg: Organization = {
    ...org,
    id: orgRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(orgRef, newOrg);
  return newOrg;
};

export const getOrganization = async (orgId: string): Promise<Organization | null> => {
  const orgDoc = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, orgId));
  return orgDoc.exists() ? (orgDoc.data() as Organization) : null;
};

export const getOrganizationBySlug = async (slug: string): Promise<Organization | null> => {
  const q = query(collection(db, COLLECTIONS.ORGANIZATIONS), where('slug', '==', slug));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : (snapshot.docs[0].data() as Organization);
};

export const updateOrganization = async (orgId: string, updates: Partial<Organization>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.ORGANIZATIONS, orgId), {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const updateOrganizationSettings = async (orgId: string, settings: Partial<OrganizationSettings>): Promise<void> => {
  const org = await getOrganization(orgId);
  if (!org) throw new Error('Organization not found');

  await updateDoc(doc(db, COLLECTIONS.ORGANIZATIONS, orgId), {
    settings: { ...org.settings, ...settings },
    updatedAt: Date.now(),
  });
};

// ========== Organization Members ==========

export const addOrgMember = async (member: Omit<OrgMember, 'id'>): Promise<OrgMember> => {
  const memberDocId = member.orgId && member.userId ? `${member.orgId}_${member.userId}` : undefined;
  const memberRef = memberDocId
    ? doc(db, COLLECTIONS.ORG_MEMBERS, memberDocId)
    : doc(collection(db, COLLECTIONS.ORG_MEMBERS));
  const newMember: OrgMember = {
    ...member,
    orgId: member.orgId || member.odId,
    id: memberRef.id,
  };
  await setDoc(memberRef, newMember);
  if (USE_ORG_SUBCOLLECTIONS && newMember.orgId) {
    const subDocId = newMember.userId || newMember.id;
    await setDoc(orgDoc(newMember.orgId, 'users', subDocId), newMember);
  }
  return newMember;
};

export const getOrgMember = async (memberId: string): Promise<OrgMember | null> => {
  const memberDoc = await getDoc(doc(db, COLLECTIONS.ORG_MEMBERS, memberId));
  return memberDoc.exists() ? (memberDoc.data() as OrgMember) : null;
};

export const getOrgMemberByEmail = async (orgId: string, email: string): Promise<OrgMember | null> => {
  const source = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'users'), where('email', '==', email))
    : query(
        collection(db, COLLECTIONS.ORG_MEMBERS),
        where('orgId', '==', orgId),
        where('email', '==', email)
      );
  const fallback = query(
    collection(db, COLLECTIONS.ORG_MEMBERS),
    where('orgId', '==', orgId),
    where('email', '==', email)
  );
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(source, fallback) : await getDocs(source);
  return snapshot.empty ? null : (snapshot.docs[0].data() as OrgMember);
};

export const getOrgMembers = async (orgId: string, options?: {
  role?: UserRole;
  departmentId?: string;
  teamId?: string;
  status?: 'active' | 'inactive' | 'pending';
  limit?: number;
}): Promise<OrgMember[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'users'))
    : query(collection(db, COLLECTIONS.ORG_MEMBERS), where('orgId', '==', orgId));
  const fallback = query(collection(db, COLLECTIONS.ORG_MEMBERS), where('orgId', '==', orgId));

  // Note: Firestore has limitations on compound queries
  // For complex filtering, we filter in memory
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  let members = snapshot.docs.map(doc => doc.data() as OrgMember);

  if (options?.role) {
    members = members.filter(m => m.role === options.role);
  }
  if (options?.departmentId) {
    members = members.filter(m => m.departmentId === options.departmentId);
  }
  if (options?.teamId) {
    members = members.filter(m => m.teamId === options.teamId);
  }
  if (options?.status) {
    members = members.filter(m => m.status === options.status);
  }
  if (options?.limit) {
    members = members.slice(0, options.limit);
  }

  return members;
};

export const getOrgMembershipsForUser = async (userId: string): Promise<OrgMember[]> => {
  const q = query(collection(db, COLLECTIONS.ORG_MEMBERS), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => docSnap.data() as OrgMember);
};

export const updateOrgMember = async (memberId: string, updates: Partial<OrgMember>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.ORG_MEMBERS, memberId), updates);
  if (USE_ORG_SUBCOLLECTIONS) {
    const memberDoc = await getDoc(doc(db, COLLECTIONS.ORG_MEMBERS, memberId));
    if (memberDoc.exists()) {
      const data = memberDoc.data() as OrgMember;
      if (data.orgId) {
        const subDocId = data.userId || data.id;
        await updateDoc(orgDoc(data.orgId, 'users', subDocId), updates);
      }
    }
  }
};

export const removeOrgMember = async (memberId: string): Promise<void> => {
  const memberDoc = await getDoc(doc(db, COLLECTIONS.ORG_MEMBERS, memberId));
  await deleteDoc(doc(db, COLLECTIONS.ORG_MEMBERS, memberId));
  if (USE_ORG_SUBCOLLECTIONS && memberDoc.exists()) {
    const data = memberDoc.data() as OrgMember;
    if (data.orgId) {
      const subDocId = data.userId || data.id;
      await deleteDoc(orgDoc(data.orgId, 'users', subDocId));
    }
  }
};

// ========== Departments ==========

export const createDepartment = async (dept: Omit<Department, 'id' | 'createdAt'>): Promise<Department> => {
  const deptRef = doc(collection(db, COLLECTIONS.DEPARTMENTS));
  const newDept: Department = {
    ...dept,
    id: deptRef.id,
    createdAt: Date.now(),
  };
  await setDoc(deptRef, stripUndefined(newDept));
  if (USE_ORG_SUBCOLLECTIONS) {
    await setDoc(orgDoc(newDept.orgId, 'departments', newDept.id), stripUndefined(newDept));
  }
  return newDept;
};

export const getDepartments = async (orgId: string): Promise<Department[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'departments'))
    : query(collection(db, COLLECTIONS.DEPARTMENTS), where('orgId', '==', orgId));
  const fallback = query(collection(db, COLLECTIONS.DEPARTMENTS), where('orgId', '==', orgId));
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Department);
};

export const updateDepartment = async (deptId: string, updates: Partial<Department>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId), stripUndefined(updates));
  if (USE_ORG_SUBCOLLECTIONS) {
    const deptDoc = await getDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId));
    if (deptDoc.exists()) {
      const data = deptDoc.data() as Department;
      await updateDoc(orgDoc(data.orgId, 'departments', deptId), stripUndefined(updates));
    }
  }
};

export const deleteDepartment = async (deptId: string): Promise<void> => {
  const deptDoc = await getDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId));
  await deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId));
  if (USE_ORG_SUBCOLLECTIONS && deptDoc.exists()) {
    const data = deptDoc.data() as Department;
    await deleteDoc(orgDoc(data.orgId, 'departments', deptId));
  }
};

// ========== Teams ==========

export const createTeam = async (team: Omit<Team, 'id' | 'createdAt'>): Promise<Team> => {
  const teamRef = doc(collection(db, COLLECTIONS.TEAMS));
  const newTeam: Team = {
    ...team,
    id: teamRef.id,
    createdAt: Date.now(),
  };
  await setDoc(teamRef, stripUndefined(newTeam));
  if (USE_ORG_SUBCOLLECTIONS) {
    await setDoc(orgDoc(newTeam.orgId, 'teams', newTeam.id), stripUndefined(newTeam));
  }
  return newTeam;
};

export const getTeams = async (orgId: string, departmentId?: string): Promise<Team[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'teams'))
    : query(collection(db, COLLECTIONS.TEAMS), where('orgId', '==', orgId));
  const fallback = query(collection(db, COLLECTIONS.TEAMS), where('orgId', '==', orgId));
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  let teams = snapshot.docs.map(doc => doc.data() as Team);

  if (departmentId) {
    teams = teams.filter(t => t.departmentId === departmentId);
  }

  return teams;
};

export const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), stripUndefined(updates));
  if (USE_ORG_SUBCOLLECTIONS) {
    const teamDoc = await getDoc(doc(db, COLLECTIONS.TEAMS, teamId));
    if (teamDoc.exists()) {
      const data = teamDoc.data() as Team;
      await updateDoc(orgDoc(data.orgId, 'teams', teamId), stripUndefined(updates));
    }
  }
};

export const deleteTeam = async (teamId: string): Promise<void> => {
  const teamDoc = await getDoc(doc(db, COLLECTIONS.TEAMS, teamId));
  await deleteDoc(doc(db, COLLECTIONS.TEAMS, teamId));
  if (USE_ORG_SUBCOLLECTIONS && teamDoc.exists()) {
    const data = teamDoc.data() as Team;
    await deleteDoc(orgDoc(data.orgId, 'teams', teamId));
  }
};

// ========== Course Operations ==========

export const createCourse = async (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Course> => {
  const courseRef = doc(collection(db, COLLECTIONS.COURSES));
  const newCourse: Course = {
    ...course,
    id: courseRef.id,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(courseRef, newCourse);
  if (USE_ORG_SUBCOLLECTIONS) {
    await setDoc(orgDoc(newCourse.orgId, 'courses', newCourse.id), newCourse);
  }
  return newCourse;
};

export const getCourse = async (courseId: string): Promise<Course | null> => {
  const courseDoc = await getDoc(doc(db, COLLECTIONS.COURSES, courseId));
  return courseDoc.exists() ? (courseDoc.data() as Course) : null;
};

export const getCourses = async (orgId: string, options?: {
  status?: 'draft' | 'published' | 'archived';
  category?: string;
  limit?: number;
}): Promise<Course[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'courses'))
    : query(collection(db, COLLECTIONS.COURSES), where('orgId', '==', orgId));
  const fallback = query(collection(db, COLLECTIONS.COURSES), where('orgId', '==', orgId));
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  let courses = snapshot.docs.map(doc => doc.data() as Course);

  if (options?.status) {
    courses = courses.filter(c => c.status === options.status);
  }
  if (options?.category) {
    courses = courses.filter(c => c.category === options.category);
  }
  if (options?.limit) {
    courses = courses.slice(0, options.limit);
  }

  return courses.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<void> => {
  const course = await getCourse(courseId);
  if (!course) throw new Error('Course not found');

  await updateDoc(doc(db, COLLECTIONS.COURSES, courseId), {
    ...updates,
    version: course.version + 1,
    updatedAt: Date.now(),
  });
  if (USE_ORG_SUBCOLLECTIONS) {
    await updateDoc(orgDoc(course.orgId, 'courses', courseId), {
      ...updates,
      version: course.version + 1,
      updatedAt: Date.now(),
    });
  }
};

export const publishCourse = async (courseId: string): Promise<void> => {
  const course = await getCourse(courseId);
  if (!course) throw new Error('Course not found');
  await updateDoc(doc(db, COLLECTIONS.COURSES, courseId), {
    status: 'published',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
  });
  if (USE_ORG_SUBCOLLECTIONS) {
    await updateDoc(orgDoc(course.orgId, 'courses', courseId), {
      status: 'published',
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
};

export const archiveCourse = async (courseId: string): Promise<void> => {
  const course = await getCourse(courseId);
  if (!course) throw new Error('Course not found');
  await updateDoc(doc(db, COLLECTIONS.COURSES, courseId), {
    status: 'archived',
    updatedAt: Date.now(),
  });
  if (USE_ORG_SUBCOLLECTIONS) {
    await updateDoc(orgDoc(course.orgId, 'courses', courseId), {
      status: 'archived',
      updatedAt: Date.now(),
    });
  }
};

// ========== Learning Path Operations ==========

export const createLearningPath = async (
  learningPath: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LearningPath> => {
  const pathRef = doc(collection(db, COLLECTIONS.LEARNING_PATHS));
  const newPath: LearningPath = {
    ...learningPath,
    id: pathRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(pathRef, newPath);
  if (USE_ORG_SUBCOLLECTIONS) {
    await setDoc(orgDoc(newPath.orgId, 'learningPaths', newPath.id), newPath);
  }
  return newPath;
};

export const getLearningPath = async (pathId: string): Promise<LearningPath | null> => {
  const pathDoc = await getDoc(doc(db, COLLECTIONS.LEARNING_PATHS, pathId));
  return pathDoc.exists() ? (pathDoc.data() as LearningPath) : null;
};

export const getLearningPaths = async (orgId: string, options?: {
  status?: 'draft' | 'published' | 'archived';
  limit?: number;
}): Promise<LearningPath[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'learningPaths'))
    : query(collection(db, COLLECTIONS.LEARNING_PATHS), where('orgId', '==', orgId));
  const fallback = query(collection(db, COLLECTIONS.LEARNING_PATHS), where('orgId', '==', orgId));
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  let paths = snapshot.docs.map(doc => doc.data() as LearningPath);

  if (options?.status) {
    paths = paths.filter(p => p.status === options.status);
  }
  if (options?.limit) {
    paths = paths.slice(0, options.limit);
  }
  return paths.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const updateLearningPath = async (pathId: string, updates: Partial<LearningPath>): Promise<void> => {
  const path = await getLearningPath(pathId);
  if (!path) throw new Error('Learning path not found');

  await updateDoc(doc(db, COLLECTIONS.LEARNING_PATHS, pathId), {
    ...updates,
    updatedAt: Date.now(),
  });
  if (USE_ORG_SUBCOLLECTIONS) {
    await updateDoc(orgDoc(path.orgId, 'learningPaths', pathId), {
      ...updates,
      updatedAt: Date.now(),
    });
  }
};

export const publishLearningPath = async (pathId: string): Promise<void> => {
  const path = await getLearningPath(pathId);
  if (!path) throw new Error('Learning path not found');
  await updateDoc(doc(db, COLLECTIONS.LEARNING_PATHS, pathId), {
    status: 'published',
    updatedAt: Date.now(),
  });
  if (USE_ORG_SUBCOLLECTIONS) {
    await updateDoc(orgDoc(path.orgId, 'learningPaths', pathId), {
      status: 'published',
      updatedAt: Date.now(),
    });
  }
};

export const archiveLearningPath = async (pathId: string): Promise<void> => {
  const path = await getLearningPath(pathId);
  if (!path) throw new Error('Learning path not found');
  await updateDoc(doc(db, COLLECTIONS.LEARNING_PATHS, pathId), {
    status: 'archived',
    updatedAt: Date.now(),
  });
  if (USE_ORG_SUBCOLLECTIONS) {
    await updateDoc(orgDoc(path.orgId, 'learningPaths', pathId), {
      status: 'archived',
      updatedAt: Date.now(),
    });
  }
};

export const deleteLearningPath = async (pathId: string): Promise<void> => {
  const path = await getLearningPath(pathId);
  await deleteDoc(doc(db, COLLECTIONS.LEARNING_PATHS, pathId));
  if (USE_ORG_SUBCOLLECTIONS && path) {
    await deleteDoc(orgDoc(path.orgId, 'learningPaths', pathId));
  }
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  const course = await getCourse(courseId);
  await deleteDoc(doc(db, COLLECTIONS.COURSES, courseId));
  if (USE_ORG_SUBCOLLECTIONS && course) {
    await deleteDoc(orgDoc(course.orgId, 'courses', courseId));
  }
};

// ========== Enrollment Operations ==========

export const createEnrollment = async (enrollment: Omit<Enrollment, 'id'>): Promise<Enrollment> => {
  const enrollmentRef = doc(collection(db, COLLECTIONS.ENROLLMENTS));
  const newEnrollment: Enrollment = {
    ...enrollment,
    orgId: enrollment.orgId || enrollment.odId,
    role: enrollment.role || 'student',
    id: enrollmentRef.id,
  };
  await setDoc(enrollmentRef, newEnrollment);
  if (USE_ORG_SUBCOLLECTIONS && newEnrollment.orgId) {
    await setDoc(orgDoc(newEnrollment.orgId, 'enrollments', newEnrollment.id), newEnrollment);
  }
  return newEnrollment;
};

export const getEnrollment = async (enrollmentId: string): Promise<Enrollment | null> => {
  const enrollmentDoc = await getDoc(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId));
  return enrollmentDoc.exists() ? (enrollmentDoc.data() as Enrollment) : null;
};

export const getUserEnrollments = async (orgId: string, userId: string): Promise<Enrollment[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(
        orgCollection(orgId, 'enrollments'),
        where('userId', '==', userId)
      )
    : query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where('orgId', '==', orgId),
        where('userId', '==', userId)
      );
  const fallback = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where('orgId', '==', orgId),
    where('userId', '==', userId)
  );
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Enrollment);
};

export const getCourseEnrollments = async (orgId: string, courseId: string): Promise<Enrollment[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(
        orgCollection(orgId, 'enrollments'),
        where('courseId', '==', courseId)
      )
    : query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where('orgId', '==', orgId),
        where('courseId', '==', courseId)
      );
  const fallback = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where('orgId', '==', orgId),
    where('courseId', '==', courseId)
  );
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Enrollment);
};

export const getEnrollmentsByStatus = async (orgId: string, status: EnrollmentStatus): Promise<Enrollment[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(
        orgCollection(orgId, 'enrollments'),
        where('status', '==', status)
      )
    : query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where('orgId', '==', orgId),
        where('status', '==', status)
      );
  const fallback = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where('orgId', '==', orgId),
    where('status', '==', status)
  );
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Enrollment);
};

export const getOrgEnrollments = async (orgId: string): Promise<Enrollment[]> => {
  const q = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'enrollments'))
    : query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where('orgId', '==', orgId)
      );
  const fallback = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where('orgId', '==', orgId)
  );
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(q, fallback) : await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Enrollment);
};

export const getOrgEnrollmentsPage = async (
  orgId: string,
  options: { limitCount: number; cursor?: any }
): Promise<{ enrollments: Enrollment[]; lastDoc?: any }> => {
  const baseQuery = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'enrollments'), orderBy('assignedAt', 'desc'))
    : query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where('orgId', '==', orgId),
        orderBy('assignedAt', 'desc')
      );
  const pagedQuery = options.cursor
    ? query(baseQuery, startAfter(options.cursor), limit(options.limitCount))
    : query(baseQuery, limit(options.limitCount));
  const fallback = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where('orgId', '==', orgId),
    orderBy('assignedAt', 'desc'),
    limit(options.limitCount)
  );
  const snapshot = USE_ORG_SUBCOLLECTIONS && !options.cursor
    ? await getDocsWithFallback(pagedQuery, fallback)
    : await getDocs(pagedQuery);
  const enrollments = snapshot.docs.map(doc => doc.data() as Enrollment);
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  return { enrollments, lastDoc };
};

export const updateEnrollment = async (enrollmentId: string, updates: Partial<Enrollment>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId), updates);
  if (USE_ORG_SUBCOLLECTIONS) {
    const enrollmentDoc = await getDoc(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId));
    if (enrollmentDoc.exists()) {
      const data = enrollmentDoc.data() as Enrollment;
      if (data.orgId) {
        await updateDoc(orgDoc(data.orgId, 'enrollments', enrollmentId), updates);
      }
    }
  }
};

export const updateEnrollmentProgress = async (
  enrollmentId: string,
  progress: number,
  moduleProgress?: Record<string, any>
): Promise<void> => {
  const existing = await getEnrollment(enrollmentId);
  if (!existing?.orgId) {
    await updateDoc(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId), {
      progress,
      lastAccessedAt: Date.now(),
      moduleProgress: moduleProgress ?? existing?.moduleProgress
    });
    return;
  }
  const updates: Partial<Enrollment> = {
    progress,
    lastAccessedAt: Date.now(),
  };

  if (moduleProgress) {
    updates.moduleProgress = moduleProgress;
  }

  if (progress === 100) {
    updates.status = 'completed';
    updates.completedAt = Date.now();
  } else if (progress > 0) {
    updates.status = 'in_progress';
    if (!updates.startedAt) {
      updates.startedAt = Date.now();
    }
  }

  await updateDoc(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId), updates);
  if (USE_ORG_SUBCOLLECTIONS && existing?.orgId) {
    await updateDoc(orgDoc(existing.orgId, 'enrollments', enrollmentId), updates);
  }
};

export const bulkEnroll = async (
  orgId: string,
  userIds: string[],
  courseId: string,
  assignedBy: string,
  options?: {
    dueDate?: number;
    priority?: 'required' | 'recommended' | 'optional';
    role?: 'student' | 'teacher';
    userAuthIdMap?: Record<string, string | undefined>;
  }
): Promise<Enrollment[]> => {
  const batch = writeBatch(db);
  const enrollments: Enrollment[] = [];

  for (const userId of userIds) {
    // Check if already enrolled
    const existing = await query(
      collection(db, COLLECTIONS.ENROLLMENTS),
      where('orgId', '==', orgId),
      where('userId', '==', userId),
      where('courseId', '==', courseId)
    );
    const existingSnap = await getDocs(existing);

    if (existingSnap.empty) {
      const enrollmentRef = doc(collection(db, COLLECTIONS.ENROLLMENTS));
      const enrollment: Enrollment = {
        id: enrollmentRef.id,
        odId: orgId,
        orgId,
        userId,
        userAuthId: options?.userAuthIdMap?.[userId],
        courseId,
        assignedBy,
        assignedAt: Date.now(),
        dueDate: options?.dueDate,
        role: options?.role || 'student',
        priority: options?.priority || 'required',
        status: 'not_started',
        progress: 0,
        attempts: 0,
        moduleProgress: {},
      };
      batch.set(enrollmentRef, enrollment);
      if (USE_ORG_SUBCOLLECTIONS) {
        batch.set(orgDoc(orgId, 'enrollments', enrollment.id), enrollment);
      }
      enrollments.push(enrollment);
    }
  }

  await batch.commit();
  return enrollments;
};

export const deleteEnrollment = async (enrollmentId: string): Promise<void> => {
  const enrollment = await getEnrollment(enrollmentId);
  await deleteDoc(doc(db, COLLECTIONS.ENROLLMENTS, enrollmentId));
  if (USE_ORG_SUBCOLLECTIONS && enrollment?.orgId) {
    await deleteDoc(orgDoc(enrollment.orgId, 'enrollments', enrollmentId));
  }
};

// ========== Lesson Progress ==========

export const upsertLessonProgress = async (
  record: Omit<LessonProgressRecord, 'id'> & { id?: string }
): Promise<LessonProgressRecord> => {
  const progressId = record.id || `${record.enrollmentId}_${record.lessonId}`;
  const progressRef = doc(db, COLLECTIONS.PROGRESS, progressId);
  const payload: LessonProgressRecord = {
    ...record,
    id: progressId,
  };
  await setDoc(progressRef, stripUndefined(payload), { merge: true });
  if (USE_ORG_SUBCOLLECTIONS && record.orgId) {
    await setDoc(orgDoc(record.orgId, 'progress', progressId), stripUndefined(payload), { merge: true });
  }
  return payload;
};

export const upsertModuleProgress = async (
  record: {
    orgId: string;
    enrollmentId: string;
    userId: string;
    userAuthId?: string;
    courseId: string;
    moduleId: string;
    status: 'completed';
    completedAt: number;
  }
): Promise<void> => {
  const docId = `${record.enrollmentId}_${record.moduleId}`;
  await setDoc(doc(db, COLLECTIONS.MODULE_PROGRESS, docId), stripUndefined({ id: docId, ...record }), { merge: true });
  if (USE_ORG_SUBCOLLECTIONS && record.orgId) {
    await setDoc(orgDoc(record.orgId, 'moduleProgress', docId), stripUndefined({ id: docId, ...record }), { merge: true });
  }
};

// ========== Assessment Results ==========

export const createAssessmentResult = async (
  result: Omit<AssessmentResult, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AssessmentResult> => {
  const resultRef = doc(collection(db, COLLECTIONS.ASSESSMENT_RESULTS));
  const newResult: AssessmentResult = {
    ...result,
    id: resultRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(resultRef, stripUndefined(newResult));
  if (USE_ORG_SUBCOLLECTIONS) {
    await setDoc(orgDoc(newResult.orgId, 'assessments', newResult.id), stripUndefined(newResult));
  }
  return newResult;
};

export const updateAssessmentResult = async (
  resultId: string,
  updates: Partial<AssessmentResult>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.ASSESSMENT_RESULTS, resultId), {
    ...stripUndefined(updates),
    updatedAt: Date.now(),
  });
  if (USE_ORG_SUBCOLLECTIONS) {
    const resultDoc = await getDoc(doc(db, COLLECTIONS.ASSESSMENT_RESULTS, resultId));
    if (resultDoc.exists()) {
      const data = resultDoc.data() as AssessmentResult;
      await updateDoc(orgDoc(data.orgId, 'assessments', resultId), {
        ...stripUndefined(updates),
        updatedAt: Date.now(),
      });
    }
  }
};

// ========== Audit Logs ==========

export const createAuditLog = async (
  log: Omit<AuditLog, 'id'>
): Promise<AuditLog> => {
  const logRef = doc(collection(db, COLLECTIONS.AUDIT_LOGS));
  const newLog: AuditLog = {
    ...log,
    id: logRef.id,
    timestamp: log.timestamp ?? Date.now(),
    createdAt: log.createdAt ?? Date.now(),
  };
  await setDoc(logRef, newLog);
  if (USE_ORG_SUBCOLLECTIONS) {
    await setDoc(orgDoc(newLog.orgId, 'auditLogs', newLog.id), newLog);
  }
  return newLog;
};

export const getAuditLogs = async (orgId: string, limitCount = 50): Promise<AuditLog[]> => {
  const q = query(
    collection(db, COLLECTIONS.AUDIT_LOGS),
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AuditLog);
};

// ========== Genie Reports ==========

export const getGenieReportSchedules = async (orgId: string): Promise<GenieReportSchedule[]> => {
  const q = query(
    collection(db, 'genieReportSchedules'),
    where('orgId', '==', orgId),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as GenieReportSchedule) }));
};

export const getGenieReportRuns = async (orgId: string, limitCount = 50): Promise<GenieReportRun[]> => {
  const q = query(
    collection(db, 'genieReportRuns'),
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as GenieReportRun) }));
};

export const createGenieReportRun = async (
  orgId: string,
  scheduleId: string,
  recipients: string
): Promise<GenieReportRun> => {
  const docRef = doc(collection(db, 'genieReportRuns'));
  const run: GenieReportRun = {
    id: docRef.id,
    orgId,
    scheduleId,
    recipients,
    status: 'queued',
    createdAt: Date.now()
  };
  await setDoc(docRef, run);
  return run;
};

export const createGenieReportSchedule = async (
  schedule: Omit<GenieReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt'>
): Promise<GenieReportSchedule> => {
  const docRef = doc(collection(db, 'genieReportSchedules'));
  const newSchedule: GenieReportSchedule = {
    ...schedule,
    id: docRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastRunAt: null
  };
  await setDoc(docRef, newSchedule);
  return newSchedule;
};

// ========== Genie Pipeline Projects ==========

export const createGeniePipelineProject = async (
  project: Omit<GeniePipelineProject, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GeniePipelineProject> => {
  const docRef = doc(collection(db, COLLECTIONS.GENIE_PIPELINE_PROJECTS));
  const newProject: GeniePipelineProject = {
    ...project,
    id: docRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await setDoc(docRef, newProject);
  return newProject;
};

export const updateGeniePipelineProject = async (
  projectId: string,
  updates: Partial<GeniePipelineProject>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.GENIE_PIPELINE_PROJECTS, projectId), {
    ...updates,
    updatedAt: Date.now()
  });
};

export const getGeniePipelineProject = async (projectId: string): Promise<GeniePipelineProject | null> => {
  const docSnap = await getDoc(doc(db, COLLECTIONS.GENIE_PIPELINE_PROJECTS, projectId));
  return docSnap.exists() ? (docSnap.data() as GeniePipelineProject) : null;
};

export const getGeniePipelineProjects = async (orgId: string, limitCount = 20): Promise<GeniePipelineProject[]> => {
  const q = query(
    collection(db, COLLECTIONS.GENIE_PIPELINE_PROJECTS),
    where('orgId', '==', orgId),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as GeniePipelineProject);
};

export const updateGenieReportSchedule = async (
  scheduleId: string,
  updates: Partial<GenieReportSchedule>
): Promise<void> => {
  await updateDoc(doc(db, 'genieReportSchedules', scheduleId), updates);
};

export const createManagerDigestRun = async (
  orgId: string,
  frequency: 'weekly' | 'monthly',
  roles: UserRole[]
): Promise<ManagerDigestRun> => {
  const docRef = doc(collection(db, 'managerDigestRuns'));
  const run: ManagerDigestRun = {
    id: docRef.id,
    orgId,
    status: 'queued',
    createdAt: Date.now(),
    frequency,
    roles
  };
  await setDoc(docRef, run);
  return run;
};

export const getManagerDigestRuns = async (orgId: string, limitCount = 20): Promise<ManagerDigestRun[]> => {
  const q = query(
    collection(db, 'managerDigestRuns'),
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as ManagerDigestRun) }));
};

// ========== Certificate Operations ==========

export const issueCertificate = async (
  orgId: string,
  userId: string,
  courseId: string,
  title: string,
  expiresAt?: number,
  evidence?: Certificate['evidence']
): Promise<Certificate> => {
  const certRef = doc(collection(db, COLLECTIONS.CERTIFICATES));
  const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const verificationCode = `VER-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
  const verificationUrl = `${window.location.origin}/verify/${certNumber}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verificationUrl)}`;

  const certificate: Certificate = {
    id: certRef.id,
    odId: orgId,
    orgId,
    userId,
    courseId,
    title,
    issuedAt: Date.now(),
    expiresAt,
    certificateNumber: certNumber,
    verificationCode,
    verificationUrl,
    qrImageUrl,
    evidence,
  };

  await setDoc(certRef, certificate);
  return certificate;
};

// ========== Competency Scores ==========

export const createCompetencyScore = async (
  score: Omit<CompetencyScore, 'id'>
): Promise<CompetencyScore> => {
  const scoreRef = doc(collection(db, COLLECTIONS.COMPETENCY_SCORES));
  const record: CompetencyScore = { id: scoreRef.id, ...score };
  await setDoc(scoreRef, record);
  if (USE_ORG_SUBCOLLECTIONS) {
    await setDoc(orgDoc(score.orgId, 'competencyScores', scoreRef.id), record);
  }
  return record;
};

export const getCompetencyScores = async (orgId: string, userId?: string): Promise<CompetencyScore[]> => {
  const source = USE_ORG_SUBCOLLECTIONS
    ? (userId
      ? query(orgCollection(orgId, 'competencyScores'), where('userId', '==', userId))
      : query(orgCollection(orgId, 'competencyScores')))
    : (userId
      ? query(collection(db, COLLECTIONS.COMPETENCY_SCORES), where('orgId', '==', orgId), where('userId', '==', userId))
      : query(collection(db, COLLECTIONS.COMPETENCY_SCORES), where('orgId', '==', orgId)));
  const fallback = userId
    ? query(collection(db, COLLECTIONS.COMPETENCY_SCORES), where('orgId', '==', orgId), where('userId', '==', userId))
    : query(collection(db, COLLECTIONS.COMPETENCY_SCORES), where('orgId', '==', orgId));
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(source, fallback) : await getDocs(source);
  return snapshot.docs.map(doc => doc.data() as CompetencyScore);
};

// ========== Competency Badges ==========

export const getCompetencyBadges = async (orgId: string, userId?: string): Promise<CompetencyBadge[]> => {
  const source = USE_ORG_SUBCOLLECTIONS
    ? (userId
      ? query(orgCollection(orgId, 'competencyBadges'), where('userId', '==', userId))
      : query(orgCollection(orgId, 'competencyBadges')))
    : (userId
      ? query(collection(db, COLLECTIONS.COMPETENCY_BADGES), where('orgId', '==', orgId), where('userId', '==', userId))
      : query(collection(db, COLLECTIONS.COMPETENCY_BADGES), where('orgId', '==', orgId)));
  const fallback = userId
    ? query(collection(db, COLLECTIONS.COMPETENCY_BADGES), where('orgId', '==', orgId), where('userId', '==', userId))
    : query(collection(db, COLLECTIONS.COMPETENCY_BADGES), where('orgId', '==', orgId));
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(source, fallback) : await getDocs(source);
  return snapshot.docs.map(doc => doc.data() as CompetencyBadge);
};

// ========== Remediation Assignments ==========

export const createRemediationAssignment = async (
  assignment: Omit<RemediationAssignment, 'id' | 'createdAt'>
): Promise<RemediationAssignment> => {
  const docRef = doc(collection(db, COLLECTIONS.REMEDIATION_ASSIGNMENTS));
  const record: RemediationAssignment = {
    id: docRef.id,
    createdAt: Date.now(),
    ...assignment
  };
  await setDoc(docRef, record);
  if (USE_ORG_SUBCOLLECTIONS) {
    await setDoc(orgDoc(record.orgId, 'remediationAssignments', record.id), record);
  }
  return record;
};

export const updateRemediationAssignment = async (
  assignmentId: string,
  updates: Partial<RemediationAssignment>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.REMEDIATION_ASSIGNMENTS, assignmentId), {
    ...stripUndefined(updates),
    updatedAt: Date.now()
  });
  if (USE_ORG_SUBCOLLECTIONS) {
    const docSnap = await getDoc(doc(db, COLLECTIONS.REMEDIATION_ASSIGNMENTS, assignmentId));
    if (docSnap.exists()) {
      const data = docSnap.data() as RemediationAssignment;
      await updateDoc(orgDoc(data.orgId, 'remediationAssignments', assignmentId), {
        ...stripUndefined(updates),
        updatedAt: Date.now()
      });
    }
  }
};

export const getRemediationAssignments = async (
  orgId: string,
  userId?: string
): Promise<RemediationAssignment[]> => {
  const source = USE_ORG_SUBCOLLECTIONS
    ? (userId
      ? query(orgCollection(orgId, 'remediationAssignments'), where('userId', '==', userId))
      : query(orgCollection(orgId, 'remediationAssignments')))
    : (userId
      ? query(collection(db, COLLECTIONS.REMEDIATION_ASSIGNMENTS), where('orgId', '==', orgId), where('userId', '==', userId))
      : query(collection(db, COLLECTIONS.REMEDIATION_ASSIGNMENTS), where('orgId', '==', orgId)));
  const fallback = userId
    ? query(collection(db, COLLECTIONS.REMEDIATION_ASSIGNMENTS), where('orgId', '==', orgId), where('userId', '==', userId))
    : query(collection(db, COLLECTIONS.REMEDIATION_ASSIGNMENTS), where('orgId', '==', orgId));
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(source, fallback) : await getDocs(source);
  return snapshot.docs.map(doc => doc.data() as RemediationAssignment);
};

// ========== Assessment Results ==========

export const getAssessmentResultsByEnrollment = async (
  orgId: string,
  enrollmentId: string
): Promise<AssessmentResult[]> => {
  const source = USE_ORG_SUBCOLLECTIONS
    ? query(orgCollection(orgId, 'assessments'), where('enrollmentId', '==', enrollmentId))
    : query(collection(db, COLLECTIONS.ASSESSMENT_RESULTS), where('orgId', '==', orgId), where('enrollmentId', '==', enrollmentId));
  const fallback = query(
    collection(db, COLLECTIONS.ASSESSMENT_RESULTS),
    where('orgId', '==', orgId),
    where('enrollmentId', '==', enrollmentId)
  );
  const snapshot = USE_ORG_SUBCOLLECTIONS ? await getDocsWithFallback(source, fallback) : await getDocs(source);
  return snapshot.docs.map(doc => doc.data() as AssessmentResult);
};

export const getAssessmentResultsByOrg = async (
  orgId: string,
  limitCount = 200
): Promise<AssessmentResult[]> => {
  const q = query(
    collection(db, COLLECTIONS.ASSESSMENT_RESULTS),
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AssessmentResult);
};

export const getUserCertificates = async (orgId: string, userId: string): Promise<Certificate[]> => {
  const q = query(
    collection(db, COLLECTIONS.CERTIFICATES),
    where('orgId', '==', orgId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs.map(doc => doc.data() as Certificate);
  }
  const legacyQuery = query(
    collection(db, COLLECTIONS.CERTIFICATES),
    where('odId', '==', orgId),
    where('userId', '==', userId)
  );
  const legacySnap = await getDocs(legacyQuery);
  return legacySnap.docs.map(doc => doc.data() as Certificate);
};

export const getOrgCertificates = async (orgId: string): Promise<Certificate[]> => {
  const q = query(
    collection(db, COLLECTIONS.CERTIFICATES),
    where('orgId', '==', orgId)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs.map(doc => doc.data() as Certificate);
  }
  const legacyQuery = query(
    collection(db, COLLECTIONS.CERTIFICATES),
    where('odId', '==', orgId)
  );
  const legacySnap = await getDocs(legacyQuery);
  return legacySnap.docs.map(doc => doc.data() as Certificate);
};

// ========== Certificate Approvals ==========

export const createCertificateApproval = async (
  approval: Omit<CertificateApproval, 'id'>
): Promise<CertificateApproval> => {
  const approvalRef = doc(collection(db, COLLECTIONS.CERTIFICATE_APPROVALS));
  const newApproval: CertificateApproval = {
    ...approval,
    id: approvalRef.id,
  };
  await setDoc(approvalRef, newApproval);
  return newApproval;
};

export const getCertificateApprovals = async (
  orgId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<CertificateApproval[]> => {
  const baseQuery = query(
    collection(db, COLLECTIONS.CERTIFICATE_APPROVALS),
    where('orgId', '==', orgId),
    orderBy('requestedAt', 'desc')
  );
  const q = status
    ? query(
        collection(db, COLLECTIONS.CERTIFICATE_APPROVALS),
        where('orgId', '==', orgId),
        where('status', '==', status),
        orderBy('requestedAt', 'desc')
      )
    : baseQuery;
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as CertificateApproval);
};

export const updateCertificateApproval = async (
  approvalId: string,
  updates: Partial<CertificateApproval>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.CERTIFICATE_APPROVALS, approvalId), updates);
};

export const verifyCertificate = async (certificateNumber: string): Promise<Certificate | null> => {
  const q = query(
    collection(db, COLLECTIONS.CERTIFICATES),
    where('certificateNumber', '==', certificateNumber)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : (snapshot.docs[0].data() as Certificate);
};

// ========== Admin Dashboard Stats ==========

export const getAdminDashboardStats = async (orgId: string): Promise<AdminDashboardStats> => {
  // Get all members
  const members = await getOrgMembers(orgId, { status: 'active' });
  const learners = members.filter(m => m.role === 'learner');

  // Get all courses
  const courses = await getCourses(orgId);
  const publishedCourses = courses.filter(c => c.status === 'published');

  // Get all enrollments
  const enrollmentsQuery = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where('orgId', '==', orgId)
  );
  const enrollmentsSnap = await getDocs(enrollmentsQuery);
  const enrollments = enrollmentsSnap.docs.map(doc => doc.data() as Enrollment);

  // Calculate stats
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  const overdueEnrollments = enrollments.filter(e =>
    e.status !== 'completed' && e.dueDate && e.dueDate < Date.now()
  );

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const activeLearners = new Set(
    enrollments
      .filter(e => e.lastAccessedAt && e.lastAccessedAt > thirtyDaysAgo)
      .map(e => e.userId)
  ).size;

  const totalScores = enrollments
    .filter(e => e.score !== undefined)
    .reduce((sum, e) => sum + (e.score || 0), 0);
  const scoredEnrollments = enrollments.filter(e => e.score !== undefined).length;

  // Get certificates this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const certsQuery = query(
    collection(db, COLLECTIONS.CERTIFICATES),
    where('orgId', '==', orgId),
    where('issuedAt', '>=', startOfMonth.getTime())
  );
  const certsSnap = await getDocs(certsQuery);

  return {
    totalLearners: learners.length,
    activeLearners,
    totalCourses: courses.length,
    publishedCourses: publishedCourses.length,
    totalEnrollments: enrollments.length,
    completionRate: enrollments.length > 0
      ? Math.round((completedEnrollments.length / enrollments.length) * 100)
      : 0,
    overdueCount: overdueEnrollments.length,
    averageScore: scoredEnrollments > 0
      ? Math.round(totalScores / scoredEnrollments)
      : 0,
    trainingHoursThisMonth: 0, // Would need time tracking
    certificatesIssued: certsSnap.size,
  };
};

export const getDepartmentStats = async (orgId: string): Promise<DepartmentStats[]> => {
  const departments = await getDepartments(orgId);
  const members = await getOrgMembers(orgId);

  const enrollmentsQuery = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where('orgId', '==', orgId)
  );
  const enrollmentsSnap = await getDocs(enrollmentsQuery);
  const enrollments = enrollmentsSnap.docs.map(doc => doc.data() as Enrollment);

  const stats: DepartmentStats[] = [];

  for (const dept of departments) {
    const deptMembers = members.filter(m => m.departmentId === dept.id);
    const deptMemberIds = new Set(deptMembers.map(m => m.id));
    const deptEnrollments = enrollments.filter(e => deptMemberIds.has(e.userId));
    const completedEnrollments = deptEnrollments.filter(e => e.status === 'completed');
    const overdueEnrollments = deptEnrollments.filter(e =>
      e.status !== 'completed' && e.dueDate && e.dueDate < Date.now()
    );

    const totalScores = deptEnrollments
      .filter(e => e.score !== undefined)
      .reduce((sum, e) => sum + (e.score || 0), 0);
    const scoredCount = deptEnrollments.filter(e => e.score !== undefined).length;

    stats.push({
      departmentId: dept.id,
      departmentName: dept.name,
      learnerCount: deptMembers.length,
      enrollmentCount: deptEnrollments.length,
      completionRate: deptEnrollments.length > 0
        ? Math.round((completedEnrollments.length / deptEnrollments.length) * 100)
        : 0,
      overdueCount: overdueEnrollments.length,
      averageScore: scoredCount > 0 ? Math.round(totalScores / scoredCount) : 0,
    });
  }

  return stats.sort((a, b) => b.completionRate - a.completionRate);
};

export const getCourseStats = async (orgId: string): Promise<CourseStats[]> => {
  const courses = await getCourses(orgId, { status: 'published' });

  const enrollmentsQuery = query(
    collection(db, COLLECTIONS.ENROLLMENTS),
    where('orgId', '==', orgId)
  );
  const enrollmentsSnap = await getDocs(enrollmentsQuery);
  const enrollments = enrollmentsSnap.docs.map(doc => doc.data() as Enrollment);

  const stats: CourseStats[] = [];

  for (const course of courses) {
    const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
    const completedEnrollments = courseEnrollments.filter(e => e.status === 'completed');

    const totalScores = courseEnrollments
      .filter(e => e.score !== undefined)
      .reduce((sum, e) => sum + (e.score || 0), 0);
    const scoredCount = courseEnrollments.filter(e => e.score !== undefined).length;

    stats.push({
      courseId: course.id,
      courseTitle: course.title,
      enrollmentCount: courseEnrollments.length,
      completionCount: completedEnrollments.length,
      completionRate: courseEnrollments.length > 0
        ? Math.round((completedEnrollments.length / courseEnrollments.length) * 100)
        : 0,
      averageScore: scoredCount > 0 ? Math.round(totalScores / scoredCount) : 0,
      averageTimeSpent: 0, // Would need time tracking
    });
  }

  return stats.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
};
