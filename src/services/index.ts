// Migration adapters (use legacy types, call canonical services)
export { courseService } from './courseService';
export { learningPathService } from './learningPathService';
export { enrollmentService } from './enrollmentService';
export { progressService } from './progressService';
export { userService } from './userService';
export { assessmentService } from './assessmentService';
export { competencyService } from './competencyService';
export { competencyBadgeService } from './competencyBadgeService';
export { remediationService } from './remediationService';
export { organizationService } from './organizationService';
export { departmentService } from './departmentService';
export { teamService } from './teamService';
export { auditService } from './auditService';
export { reportService } from './reportService';
export { certificateService } from './certificateService';
export { pipelineService } from './pipelineService';
export { statsService } from './statsService';
export { announcementService } from './announcementService';
export { observabilityService } from './observabilityService';
export * as guidedService from './guidedService';

// Canonical services (direct Firestore access with schema.ts types)
export * as canonical from './canonical';
