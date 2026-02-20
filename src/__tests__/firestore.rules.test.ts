/* @vitest-environment node */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'tuutta-rules-test';
const hasFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeWithEmulator = hasFirestoreEmulator ? describe : describe.skip;

describeWithEmulator('Firestore security rules (canonical model)', () => {
  let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  const seedDoc = async (path: string, data: Record<string, unknown>) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), path), data);
    });
  };

  const seedUser = async (uid: string, orgId: string, role: string) => {
    await seedDoc(`users/${uid}`, {
      uid,
      email: `${uid}@example.com`,
      displayName: uid,
      photoUrl: null,
      orgId,
      role,
      departmentId: null,
      teamId: null,
      managerId: null,
      isActive: true,
      xp: 0,
      level: 1,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
  };

  it('allows org manager to read users in same org but blocks cross-org reads', async () => {
    await seedUser('admin-1', 'org-a', 'admin');
    await seedUser('learner-a', 'org-a', 'learner');
    await seedUser('learner-b', 'org-b', 'learner');

    const adminDb = testEnv.authenticatedContext('admin-1').firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'users', 'learner-a')));
    await assertFails(getDoc(doc(adminDb, 'users', 'learner-b')));
  });

  it('blocks learner from reading cross-user enrollments in same org', async () => {
    await seedUser('manager-1', 'org-a', 'manager');
    await seedUser('learner-a', 'org-a', 'learner');
    await seedUser('learner-b', 'org-a', 'learner');
    await seedDoc('enrollments/org-a_learner-b_course-1', {
      id: 'org-a_learner-b_course-1',
      orgId: 'org-a',
      userId: 'learner-b',
      courseId: 'course-1',
      enrolledBy: 'manager-1',
      status: 'active',
      enrolledAt: Date.now(),
      completedAt: null,
      dueDate: null,
      certificateId: null,
    });

    const learnerDb = testEnv.authenticatedContext('learner-a').firestore();
    await assertFails(getDoc(doc(learnerDb, 'enrollments', 'org-a_learner-b_course-1')));
  });

  it('blocks broad writes to non-whitelisted org subcollections', async () => {
    await seedUser('learner-a', 'org-a', 'learner');
    const learnerDb = testEnv.authenticatedContext('learner-a').firestore();

    await assertFails(
      setDoc(doc(learnerDb, 'organizations/org-a/rogueCollection/doc-1'), {
        orgId: 'org-a',
        value: 'should be denied',
      })
    );
  });

  it('enforces strict progress ownership', async () => {
    await seedUser('admin-1', 'org-a', 'admin');
    await seedUser('learner-a', 'org-a', 'learner');
    await seedUser('learner-b', 'org-a', 'learner');

    await seedDoc('progress/learner-a_course-1', {
      id: 'learner-a_course-1',
      userId: 'learner-a',
      courseId: 'course-1',
      orgId: 'org-a',
      enrollmentId: 'org-a_learner-a_course-1',
      completedLessonIds: [],
      completedModuleIds: [],
      lastLessonId: null,
      percentComplete: 0,
      totalTimeSpentSeconds: 0,
      updatedAt: Date.now(),
    });

    const learnerADb = testEnv.authenticatedContext('learner-a').firestore();
    const learnerBDb = testEnv.authenticatedContext('learner-b').firestore();
    const adminDb = testEnv.authenticatedContext('admin-1').firestore();

    await assertSucceeds(getDoc(doc(learnerADb, 'progress', 'learner-a_course-1')));
    await assertFails(getDoc(doc(learnerBDb, 'progress', 'learner-a_course-1')));
    await assertSucceeds(getDoc(doc(adminDb, 'progress', 'learner-a_course-1')));
  });

  it('prevents broad assessmentResults access and allows instructor read only in-org', async () => {
    await seedUser('instructor-a', 'org-a', 'instructor');
    await seedUser('learner-a', 'org-a', 'learner');
    await seedUser('learner-b', 'org-a', 'learner');
    await seedUser('instructor-b', 'org-b', 'instructor');

    await seedDoc('assessmentResults/result-1', {
      id: 'result-1',
      orgId: 'org-a',
      userId: 'learner-a',
      courseId: 'course-1',
      assessmentId: 'assessment-1',
      enrollmentId: 'org-a_learner-a_course-1',
      attempt: 1,
      score: 88,
      passed: true,
      answers: [],
      startedAt: Date.now(),
      submittedAt: Date.now(),
    });

    const learnerBDb = testEnv.authenticatedContext('learner-b').firestore();
    const instructorADb = testEnv.authenticatedContext('instructor-a').firestore();
    const instructorBDb = testEnv.authenticatedContext('instructor-b').firestore();

    await assertFails(getDoc(doc(learnerBDb, 'assessmentResults', 'result-1')));
    await assertSucceeds(getDoc(doc(instructorADb, 'assessmentResults', 'result-1')));
    await assertFails(getDoc(doc(instructorBDb, 'assessmentResults', 'result-1')));
  });
});
