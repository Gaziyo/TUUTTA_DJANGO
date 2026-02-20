/**
 * E2E Security Tests
 *
 * Tests cross-org isolation and permission boundaries.
 * These tests verify that Firestore rules correctly prevent unauthorized access.
 *
 * Usage:
 *   import { runSecurityTests } from './security.e2e';
 *   const results = await runSecurityTests({ orgId, userId, role });
 */

import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import type { E2ETestResult, E2ETestSummary } from './criticalPath.e2e';
import type { UserRole } from '../../types/schema';

interface SecurityTestContext {
  /** Current user's org ID */
  orgId: string;
  /** Current user's ID */
  userId: string;
  /** Current user's role */
  role: UserRole;
  /** Another org's ID for cross-org tests (optional) */
  otherOrgId?: string;
}

/**
 * Run a single test with timing and error handling.
 */
async function runTest(
  name: string,
  testFn: () => Promise<{ status: 'pass' | 'fail' | 'skip'; message: string; details?: Record<string, unknown> }>
): Promise<E2ETestResult> {
  const start = performance.now();
  try {
    const result = await testFn();
    return {
      name,
      ...result,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      name,
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Math.round(performance.now() - start),
    };
  }
}

/**
 * Test that user cannot read courses from another org.
 */
export async function testCrossOrgCourseIsolation(
  ctx: SecurityTestContext
): Promise<E2ETestResult> {
  if (!ctx.otherOrgId) {
    return {
      name: 'Security: Cross-Org Course Isolation',
      status: 'skip',
      message: 'No other org ID provided for cross-org test',
      durationMs: 0,
    };
  }

  return runTest('Security: Cross-Org Course Isolation', async () => {
    try {
      // Try to read courses from another org
      const q = query(
        collection(db, 'courses'),
        where('orgId', '==', ctx.otherOrgId)
      );
      const snapshot = await getDocs(q);

      // If we can read courses from another org, that's a security failure
      if (snapshot.size > 0) {
        return {
          status: 'fail',
          message: `User could read ${snapshot.size} courses from another org`,
          details: { otherOrgId: ctx.otherOrgId, coursesFound: snapshot.size },
        };
      }

      return {
        status: 'pass',
        message: 'Cross-org course access correctly denied (empty result)',
        details: { otherOrgId: ctx.otherOrgId },
      };
    } catch (error) {
      // Permission denied error is expected and correct
      const isPermissionDenied = error instanceof Error &&
        (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED'));

      return {
        status: isPermissionDenied ? 'pass' : 'fail',
        message: isPermissionDenied
          ? 'Cross-org course access correctly denied by Firestore rules'
          : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
        details: { otherOrgId: ctx.otherOrgId },
      };
    }
  });
}

/**
 * Test that user cannot read enrollments from another org.
 */
export async function testCrossOrgEnrollmentIsolation(
  ctx: SecurityTestContext
): Promise<E2ETestResult> {
  if (!ctx.otherOrgId) {
    return {
      name: 'Security: Cross-Org Enrollment Isolation',
      status: 'skip',
      message: 'No other org ID provided for cross-org test',
      durationMs: 0,
    };
  }

  return runTest('Security: Cross-Org Enrollment Isolation', async () => {
    try {
      const q = query(
        collection(db, 'enrollments'),
        where('orgId', '==', ctx.otherOrgId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.size > 0) {
        return {
          status: 'fail',
          message: `User could read ${snapshot.size} enrollments from another org`,
          details: { otherOrgId: ctx.otherOrgId },
        };
      }

      return {
        status: 'pass',
        message: 'Cross-org enrollment access correctly denied',
      };
    } catch (error) {
      const isPermissionDenied = error instanceof Error &&
        (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED'));

      return {
        status: isPermissionDenied ? 'pass' : 'fail',
        message: isPermissionDenied
          ? 'Cross-org enrollment access correctly denied by Firestore rules'
          : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  });
}

/**
 * Test that learner cannot publish a course.
 */
export async function testLearnerCannotPublishCourse(
  ctx: SecurityTestContext
): Promise<E2ETestResult> {
  if (ctx.role !== 'learner') {
    return {
      name: 'Security: Learner Cannot Publish Course',
      status: 'skip',
      message: `User role is ${ctx.role}, not learner`,
      durationMs: 0,
    };
  }

  return runTest('Security: Learner Cannot Publish Course', async () => {
    try {
      // Try to create a course (which should be denied for learners)
      const testCourseId = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const courseRef = doc(db, 'courses', testCourseId);

      await setDoc(courseRef, {
        id: testCourseId,
        orgId: ctx.orgId,
        title: 'Security Test Course',
        description: 'This should not be created',
        status: 'published',
        createdBy: ctx.userId,
        instructorId: null,
        thumbnailUrl: null,
        estimatedDuration: 0,
        tags: [],
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // If we got here, the write succeeded - that's a failure
      // Try to clean up
      try {
        await deleteDoc(courseRef);
      } catch {
        // Ignore cleanup errors
      }

      return {
        status: 'fail',
        message: 'Learner was able to create a course (should be denied)',
      };
    } catch (error) {
      const isPermissionDenied = error instanceof Error &&
        (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED'));

      return {
        status: isPermissionDenied ? 'pass' : 'fail',
        message: isPermissionDenied
          ? 'Course creation correctly denied for learner role'
          : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  });
}

/**
 * Test that learner cannot modify another user's progress.
 */
export async function testCannotModifyOtherUserProgress(
  ctx: SecurityTestContext
): Promise<E2ETestResult> {
  return runTest('Security: Cannot Modify Other User Progress', async () => {
    try {
      // Try to create a progress doc for a different user
      const fakeUserId = 'fake_user_' + Date.now();
      const fakeProgressId = `${fakeUserId}_fake_course_123`;
      const progressRef = doc(db, 'progress', fakeProgressId);

      await setDoc(progressRef, {
        id: fakeProgressId,
        userId: fakeUserId,
        courseId: 'fake_course_123',
        orgId: ctx.orgId,
        enrollmentId: 'fake_enrollment',
        completedLessonIds: [],
        completedModuleIds: [],
        lastLessonId: null,
        percentComplete: 100, // Trying to fake completion
        totalTimeSpentSeconds: 0,
        updatedAt: new Date(),
      });

      // If we got here, the write succeeded - that's a failure
      try {
        await deleteDoc(progressRef);
      } catch {
        // Ignore cleanup errors
      }

      return {
        status: 'fail',
        message: 'User was able to create progress for another user',
      };
    } catch (error) {
      const isPermissionDenied = error instanceof Error &&
        (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED'));

      return {
        status: isPermissionDenied ? 'pass' : 'fail',
        message: isPermissionDenied
          ? 'Progress modification for other user correctly denied'
          : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  });
}

/**
 * Test that user can read their own progress.
 */
export async function testCanReadOwnProgress(
  ctx: SecurityTestContext
): Promise<E2ETestResult> {
  return runTest('Security: Can Read Own Progress', async () => {
    try {
      // Try to read any progress doc for the current user
      const q = query(
        collection(db, 'progress'),
        where('userId', '==', ctx.userId)
      );
      const snapshot = await getDocs(q);

      return {
        status: 'pass',
        message: `User can read their own progress (${snapshot.size} docs found)`,
        details: { progressCount: snapshot.size },
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `User cannot read own progress: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  });
}

/**
 * Test that user can read their own enrollments.
 */
export async function testCanReadOwnEnrollments(
  ctx: SecurityTestContext
): Promise<E2ETestResult> {
  return runTest('Security: Can Read Own Enrollments', async () => {
    try {
      const q = query(
        collection(db, 'enrollments'),
        where('userId', '==', ctx.userId)
      );
      const snapshot = await getDocs(q);

      return {
        status: 'pass',
        message: `User can read their own enrollments (${snapshot.size} found)`,
        details: { enrollmentCount: snapshot.size },
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `User cannot read own enrollments: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  });
}

/**
 * Test that certificates cannot be issued by non-instructors.
 */
export async function testCertificateIssuanceRestriction(
  ctx: SecurityTestContext
): Promise<E2ETestResult> {
  if (ctx.role === 'instructor' || ctx.role === 'admin' || ctx.role === 'manager' || ctx.role === 'superadmin') {
    return {
      name: 'Security: Certificate Issuance Restriction',
      status: 'skip',
      message: `User role ${ctx.role} is allowed to issue certificates`,
      durationMs: 0,
    };
  }

  return runTest('Security: Certificate Issuance Restriction', async () => {
    try {
      const testCertId = `test_cert_${Date.now()}`;
      const certRef = doc(db, 'certificates', testCertId);

      await setDoc(certRef, {
        id: testCertId,
        orgId: ctx.orgId,
        userId: 'some_other_user',
        courseId: 'some_course',
        issuedBy: ctx.userId,
        issuedAt: new Date(),
        title: 'Fake Certificate',
      });

      // If we got here, that's a failure
      try {
        await deleteDoc(certRef);
      } catch {
        // Ignore cleanup
      }

      return {
        status: 'fail',
        message: 'Non-instructor was able to issue a certificate',
      };
    } catch (error) {
      const isPermissionDenied = error instanceof Error &&
        (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED'));

      return {
        status: isPermissionDenied ? 'pass' : 'fail',
        message: isPermissionDenied
          ? 'Certificate issuance correctly denied for non-instructor'
          : `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  });
}

/**
 * Test that activity logs are append-only.
 */
export async function testActivityLogImmutability(
  ctx: SecurityTestContext
): Promise<E2ETestResult> {
  return runTest('Security: Activity Log Immutability', async () => {
    // First, try to find an existing activity log to modify
    try {
      const logsRef = collection(db, 'activityLog', ctx.orgId, 'events');
      const q = query(logsRef);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          status: 'skip',
          message: 'No activity logs to test immutability',
        };
      }

      // Try to update an existing log
      const existingLog = snapshot.docs[0];
      const logRef = doc(db, 'activityLog', ctx.orgId, 'events', existingLog.id);

      try {
        await setDoc(logRef, { ...existingLog.data(), tamperedField: 'hacked' }, { merge: true });

        return {
          status: 'fail',
          message: 'Activity log could be modified (should be immutable)',
        };
      } catch (updateError) {
        const isPermissionDenied = updateError instanceof Error &&
          (updateError.message.includes('permission') || updateError.message.includes('PERMISSION_DENIED'));

        return {
          status: isPermissionDenied ? 'pass' : 'fail',
          message: isPermissionDenied
            ? 'Activity logs are correctly immutable'
            : `Unexpected error: ${updateError instanceof Error ? updateError.message : 'Unknown'}`,
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Could not test activity log immutability: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  });
}

/**
 * Run all security tests.
 */
export async function runSecurityTests(
  ctx: SecurityTestContext
): Promise<E2ETestSummary> {
  // Verify user is authenticated
  if (!auth.currentUser) {
    return {
      allPassed: false,
      totalTests: 0,
      passed: 0,
      failed: 1,
      skipped: 0,
      results: [{
        name: 'Security: Authentication Required',
        status: 'fail',
        message: 'User must be authenticated to run security tests',
        durationMs: 0,
      }],
      failures: [{
        name: 'Security: Authentication Required',
        status: 'fail',
        message: 'User must be authenticated to run security tests',
        durationMs: 0,
      }],
      timestamp: Date.now(),
    };
  }

  const allResults: E2ETestResult[] = [];

  // Run all security tests
  allResults.push(await testCrossOrgCourseIsolation(ctx));
  allResults.push(await testCrossOrgEnrollmentIsolation(ctx));
  allResults.push(await testLearnerCannotPublishCourse(ctx));
  allResults.push(await testCannotModifyOtherUserProgress(ctx));
  allResults.push(await testCanReadOwnProgress(ctx));
  allResults.push(await testCanReadOwnEnrollments(ctx));
  allResults.push(await testCertificateIssuanceRestriction(ctx));
  allResults.push(await testActivityLogImmutability(ctx));

  const passed = allResults.filter(r => r.status === 'pass').length;
  const failed = allResults.filter(r => r.status === 'fail').length;
  const skipped = allResults.filter(r => r.status === 'skip').length;

  return {
    allPassed: failed === 0,
    totalTests: allResults.length,
    passed,
    failed,
    skipped,
    results: allResults,
    failures: allResults.filter(r => r.status === 'fail'),
    timestamp: Date.now(),
  };
}

/**
 * Console reporter for security test results.
 */
export function reportSecurityResults(summary: E2ETestSummary): void {
  console.log('\n========================================');
  console.log('Security Test Results');
  console.log('========================================\n');

  for (const result of summary.results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message} (${result.durationMs}ms)`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }
  }

  console.log('\n----------------------------------------');
  console.log(`Total: ${summary.totalTests} | Pass: ${summary.passed} | Fail: ${summary.failed} | Skip: ${summary.skipped}`);
  console.log(`Status: ${summary.allPassed ? '✅ ALL SECURITY TESTS PASSED' : '❌ SECURITY VULNERABILITIES DETECTED'}`);
  console.log('----------------------------------------\n');
}

export const securityTests = {
  runAll: runSecurityTests,
  report: reportSecurityResults,
  testCrossOrgCourseIsolation,
  testCrossOrgEnrollmentIsolation,
  testLearnerCannotPublishCourse,
  testCannotModifyOtherUserProgress,
  testCanReadOwnProgress,
  testCanReadOwnEnrollments,
  testCertificateIssuanceRestriction,
  testActivityLogImmutability,
};

export default securityTests;
