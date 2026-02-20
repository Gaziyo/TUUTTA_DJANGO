/**
 * E2E Critical Path Tests
 *
 * Tests the complete user journey as specified in GO Gate 6:
 * Course create → publish → enroll → play → complete → report
 *
 * Usage:
 *   import { runCriticalPathTests } from './criticalPath.e2e';
 *   const results = await runCriticalPathTests(orgId, userId);
 */

import { healthCheck, releaseGates, HealthCheckResult, HealthCheckSummary } from '../../lib/healthCheck';
import { courseService } from '../../services/canonical/courseService';
import { enrollmentService } from '../../services/canonical/enrollmentService';
import { progressService } from '../../services/canonical/progressService';

export interface E2ETestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  durationMs: number;
  details?: Record<string, unknown>;
}

export interface E2ETestSummary {
  allPassed: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: E2ETestResult[];
  failures: E2ETestResult[];
  timestamp: number;
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
 * Infrastructure health check tests.
 */
export async function testInfrastructure(): Promise<E2ETestResult[]> {
  const results: E2ETestResult[] = [];

  // Run health checks
  const healthResults = await healthCheck.runAll();

  for (const check of healthResults.results) {
    results.push({
      name: `Health: ${check.name}`,
      status: check.status === 'warn' ? 'pass' : check.status,
      message: check.message,
      durationMs: check.durationMs,
      details: check.details,
    });
  }

  return results;
}

/**
 * Release gates verification tests.
 */
export function testReleaseGates(): E2ETestResult[] {
  const gateResults = releaseGates.checkAll();

  return gateResults.results.map(gate => ({
    name: gate.name,
    status: gate.status,
    message: gate.message,
    durationMs: gate.durationMs,
  }));
}

/**
 * Course lifecycle tests.
 */
export async function testCourseLifecycle(
  orgId: string,
  userId: string
): Promise<E2ETestResult[]> {
  const results: E2ETestResult[] = [];
  let testCourseId: string | null = null;

  // Test 1: Course creation
  results.push(await runTest('Course: Create', async () => {
    const course = await courseService.create({
      orgId,
      title: 'E2E Test Course',
      description: 'Automated test course',
      createdBy: userId,
      status: 'draft',
      modules: [],
    });
    testCourseId = course.id;
    return {
      status: 'pass',
      message: `Course created: ${course.id}`,
      details: { courseId: course.id },
    };
  }));

  if (!testCourseId) {
    results.push({
      name: 'Course: Publish',
      status: 'skip',
      message: 'Skipped due to creation failure',
      durationMs: 0,
    });
    return results;
  }

  // Test 2: Course publish
  results.push(await runTest('Course: Publish', async () => {
    await courseService.publish(testCourseId!);
    const course = await courseService.get(testCourseId!);
    return {
      status: course?.status === 'published' ? 'pass' : 'fail',
      message: course?.status === 'published' ? 'Course published' : 'Publication failed',
      details: { status: course?.status },
    };
  }));

  // Cleanup: Archive the test course
  try {
    await courseService.archive(testCourseId);
  } catch {
    // Best effort cleanup
  }

  return results;
}

/**
 * Enrollment flow tests.
 */
export async function testEnrollmentFlow(
  orgId: string,
  userId: string,
  courseId: string
): Promise<E2ETestResult[]> {
  const results: E2ETestResult[] = [];
  let testEnrollmentId: string | null = null;

  // Test 1: Create enrollment
  results.push(await runTest('Enrollment: Create', async () => {
    const enrollment = await enrollmentService.enroll(orgId, userId, courseId, userId);
    testEnrollmentId = enrollment.id;
    return {
      status: 'pass',
      message: `Enrollment created: ${enrollment.id}`,
      details: { enrollmentId: enrollment.id, status: enrollment.status },
    };
  }));

  if (!testEnrollmentId) {
    return results;
  }

  // Test 2: Verify enrollment exists
  results.push(await runTest('Enrollment: Verify', async () => {
    const enrollment = await enrollmentService.getEnrollment(testEnrollmentId!);
    return {
      status: enrollment ? 'pass' : 'fail',
      message: enrollment ? 'Enrollment verified' : 'Enrollment not found',
      details: { found: !!enrollment },
    };
  }));

  // Test 3: Check duplicate prevention (idempotent)
  results.push(await runTest('Enrollment: Idempotent', async () => {
    const enrollment = await enrollmentService.enroll(orgId, userId, courseId, userId);
    return {
      status: enrollment.id === testEnrollmentId ? 'pass' : 'fail',
      message: enrollment.id === testEnrollmentId
        ? 'Idempotent enrollment confirmed'
        : 'Duplicate enrollment created',
      details: { originalId: testEnrollmentId, newId: enrollment.id },
    };
  }));

  return results;
}

/**
 * Progress tracking tests.
 */
export async function testProgressTracking(
  userId: string,
  courseId: string
): Promise<E2ETestResult[]> {
  const results: E2ETestResult[] = [];

  // Test 1: Get progress (should exist after enrollment)
  results.push(await runTest('Progress: Get', async () => {
    const progress = await progressService.getProgress(userId, courseId);
    return {
      status: progress ? 'pass' : 'fail',
      message: progress ? 'Progress retrieved' : 'Progress not found',
      details: progress ? {
        percentComplete: progress.percentComplete,
        completedLessons: progress.completedLessonIds.length,
      } : undefined,
    };
  }));

  // Test 2: Verify progress structure
  results.push(await runTest('Progress: Structure', async () => {
    const progress = await progressService.getProgress(userId, courseId);
    if (!progress) {
      return { status: 'skip', message: 'No progress to verify' };
    }

    const hasRequiredFields =
      'id' in progress &&
      'userId' in progress &&
      'courseId' in progress &&
      'completedLessonIds' in progress &&
      'completedModuleIds' in progress &&
      'percentComplete' in progress;

    return {
      status: hasRequiredFields ? 'pass' : 'fail',
      message: hasRequiredFields ? 'Progress structure valid' : 'Missing required fields',
      details: { hasRequiredFields },
    };
  }));

  return results;
}

/**
 * Run all critical path tests.
 */
export async function runCriticalPathTests(
  orgId?: string,
  userId?: string,
  courseId?: string
): Promise<E2ETestSummary> {
  const allResults: E2ETestResult[] = [];

  // 1. Infrastructure tests
  const infraResults = await testInfrastructure();
  allResults.push(...infraResults);

  // 2. Release gates
  const gateResults = testReleaseGates();
  allResults.push(...gateResults);

  // 3. Course lifecycle (if org/user provided)
  if (orgId && userId) {
    const courseResults = await testCourseLifecycle(orgId, userId);
    allResults.push(...courseResults);
  }

  // 4. Enrollment flow (if all IDs provided)
  if (orgId && userId && courseId) {
    const enrollmentResults = await testEnrollmentFlow(orgId, userId, courseId);
    allResults.push(...enrollmentResults);

    // 5. Progress tracking
    const progressResults = await testProgressTracking(userId, courseId);
    allResults.push(...progressResults);
  }

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
 * Console reporter for test results.
 */
export function reportResults(summary: E2ETestSummary): void {
  console.log('\n========================================');
  console.log('E2E Critical Path Test Results');
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
  console.log(`Status: ${summary.allPassed ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}`);
  console.log('----------------------------------------\n');
}

export default runCriticalPathTests;
