// ELS (Enterprise Learning System) Services
// This module provides Firebase integration for the ELS Studio

export { elsProjectService } from './elsProjectService';
export { elsContentService } from './elsContentService';
export { elsAnalysisService } from './elsAnalysisService';
export { elsDesignService } from './elsDesignService';
export { elsAIGenerationService } from './elsAIGenerationService';
export { elsImplementationService } from './elsImplementationService';
export { elsAnalyticsService } from './elsAnalyticsService';
export { elsGovernanceService } from './elsGovernanceService';

// Re-export types
export type {
  ELSProject,
  ELSPhase,
  ELSContent,
  ELSNeedsAnalysis,
  ELSCourseDesign,
  ELSAIGeneration,
  ELSImplementation,
  ELSAnalytics,
  ELSGovernance,
  ELSPhaseStatus
} from '@/types/els';
