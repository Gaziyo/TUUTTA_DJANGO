/**
 * E2E Tests — Barrel Export
 */

export {
  runCriticalPathTests,
  testInfrastructure,
  testReleaseGates,
  testCourseLifecycle,
  testEnrollmentFlow,
  testProgressTracking,
  reportResults,
  type E2ETestResult,
  type E2ETestSummary,
} from './criticalPath.e2e';

export {
  runSecurityTests,
  reportSecurityResults,
  securityTests,
  testCrossOrgCourseIsolation,
  testCrossOrgEnrollmentIsolation,
  testLearnerCannotPublishCourse,
  testCannotModifyOtherUserProgress,
  testCanReadOwnProgress,
  testCanReadOwnEnrollments,
  testCertificateIssuanceRestriction,
  testActivityLogImmutability,
} from './security.e2e';
