// ELS (Enterprise Learning System) Hooks
// React Query hooks for ELS Firebase integration

// Project hooks
export {
  useELSProjects,
  useELSProject,
  useCreateELSProject,
  useUpdateELSProject,
  useDeleteELSProject,
  useUpdateELSPhase,
  useStartELSPhase,
  useCompleteELSPhase,
  useArchiveELSProject,
  useActivateELSProject
} from './useELSProject';

// Content hooks
export {
  useELSContent,
  useELSContentItem,
  useCreateELSContent,
  useUpdateELSContent,
  useDeleteELSContent
} from './useELSContent';

// Analysis hooks
export {
  useELSAnalysis,
  useUpdateELSAnalysis,
  useAddSkillGap,
  useUpdateSkillGap,
  useRemoveSkillGap,
  useAddComplianceRequirement,
  useUpdateComplianceRequirement,
  useRemoveComplianceRequirement,
  useAddLearningObjective,
  useUpdateLearningObjective,
  useRemoveLearningObjective,
  useGenerateObjectives
} from './useELSAnalysis';

// Design hooks
export {
  useELSDesign,
  useUpdateELSDesign,
  useAddELSModule,
  useUpdateELSModule,
  useRemoveELSModule,
  useReorderELSModules,
  useAddELSUnit,
  useUpdateELSUnit,
  useRemoveELSUnit
} from './useELSDesign';

// AI Generation hooks
export {
  useELSAIGeneration,
  useCreateGeneration,
  useUpdateGenerationStatus,
  useReviewGeneration,
  useCreateAssessment,
  useUpdateAssessment,
  useRemoveAssessment
} from './useELSAIGeneration';

// Implementation hooks
export {
  useELSImplementation,
  useUpdateELSImplementation,
  useAddEnrollmentRule,
  useUpdateEnrollmentRule,
  useRemoveEnrollmentRule,
  useActivateImplementation,
  usePauseImplementation,
  useCompleteImplementation,
  useLinkCourse,
  useLinkLearningPath
} from './useELSImplementation';

// Analytics hooks
export {
  useELSAnalytics,
  useUpdateELSAnalytics,
  useUpdateELSMetrics,
  useAddTimeSeriesPoint,
  useComputeFromEnrollments,
  useELSDashboardSummary
} from './useELSAnalytics';

// Governance hooks
export {
  useELSGovernance,
  useUpdateELSGovernance,
  useUpdatePrivacySettings,
  useUpdateSecuritySettings,
  useUpdateAIMonitoring,
  useApproveStage,
  useRejectStage,
  useCreateAuditLog,
  useELSAuditLogs
} from './useELSGovernance';

// Combined/utility hooks
export { useELSProjectData } from './useELSProjectData';
