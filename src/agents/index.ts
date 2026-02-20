// Agent Orchestrator
export {
  AgentOrchestrator,
  getOrchestrator,
  resetOrchestrator
} from './AgentOrchestrator';
export type { AgentHandler, OrchestratorConfig, OrchestratorMetrics } from './AgentOrchestrator';

// Content Ingestion Agent
export {
  ContentIngestionAgent,
  contentIngestionAgentConfig,
  createContentIngestionAgent
} from './ContentIngestionAgent';

// Learning Design Agent
export {
  LearningDesignAgent,
  learningDesignAgentConfig,
  createLearningDesignAgent
} from './LearningDesignAgent';

// Assessment Agent
export {
  AssessmentAgent,
  assessmentAgentConfig,
  createAssessmentAgent
} from './AssessmentAgent';

// Tutor Agent
export {
  TutorAgent,
  tutorAgentConfig,
  createTutorAgent
} from './TutorAgent';

// Outcome Analytics Agent
export {
  OutcomeAnalyticsAgent,
  outcomeAnalyticsAgentConfig,
  createOutcomeAnalyticsAgent
} from './OutcomeAnalyticsAgent';

// ============================================================================
// AGENT INITIALIZATION HELPER
// ============================================================================

import { getOrchestrator } from './AgentOrchestrator';
import { createContentIngestionAgent } from './ContentIngestionAgent';
import { createLearningDesignAgent } from './LearningDesignAgent';
import { createAssessmentAgent } from './AssessmentAgent';
import { createTutorAgent } from './TutorAgent';
import { createOutcomeAnalyticsAgent } from './OutcomeAnalyticsAgent';

/**
 * Initialize the agent orchestrator with all agents
 */
export const initializeAgents = () => {
  const orchestrator = getOrchestrator();

  // Register Content Ingestion Agent
  const contentAgent = createContentIngestionAgent();
  orchestrator.registerAgent(contentAgent.handler, contentAgent.config);

  // Register Learning Design Agent
  const designAgent = createLearningDesignAgent();
  orchestrator.registerAgent(designAgent.handler, designAgent.config);

  // Register Assessment Agent
  const assessmentAgent = createAssessmentAgent();
  orchestrator.registerAgent(assessmentAgent.handler, assessmentAgent.config);

  // Register Tutor Agent
  const tutorAgent = createTutorAgent();
  orchestrator.registerAgent(tutorAgent.handler, tutorAgent.config);

  // Register Outcome Analytics Agent
  const outcomeAgent = createOutcomeAnalyticsAgent();
  orchestrator.registerAgent(outcomeAgent.handler, outcomeAgent.config);

  return orchestrator;
};

/**
 * Get all agent configurations
 */
export const getAllAgentConfigs = () => [
  createContentIngestionAgent().config,
  createLearningDesignAgent().config,
  createAssessmentAgent().config,
  createTutorAgent().config,
  createOutcomeAnalyticsAgent().config
];
