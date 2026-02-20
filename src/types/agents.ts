// Agent Types & Interfaces for Tuutta Agentic Architecture

// ============================================================================
// CORE AGENT TYPES
// ============================================================================

export type AgentType =
  | 'content-ingestion'
  | 'learning-design'
  | 'assessment'
  | 'tutor'
  | 'outcome-analytics'
  | 'quality-assurance';

export type AgentStatus =
  | 'idle'
  | 'processing'
  | 'waiting-approval'
  | 'completed'
  | 'failed'
  | 'paused';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus =
  | 'queued'
  | 'in-progress'
  | 'awaiting-review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'failed';

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface AgentConfig {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  enabled: boolean;
  autoApprove: boolean; // If false, requires human review
  maxConcurrentTasks: number;
  retryAttempts: number;
  timeoutMs: number;
  modelConfig?: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

export interface AgentState {
  agentId: string;
  type: AgentType;
  status: AgentStatus;
  currentTaskId: string | null;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  lastActivity: Date;
  metrics: AgentMetrics;
}

export interface AgentMetrics {
  avgProcessingTimeMs: number;
  successRate: number;
  tasksPerHour: number;
  tokensUsed: number;
  costEstimate: number;
}

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

export interface AgentTask {
  id: string;
  agentType: AgentType;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  input: TaskInput;
  output?: TaskOutput;
  error?: TaskError;
  reviewStatus?: ReviewStatus;
  metadata: TaskMetadata;
}

export interface TaskInput {
  type: string;
  data: Record<string, unknown>;
  context?: TaskContext;
}

export interface TaskOutput {
  type: string;
  data: Record<string, unknown>;
  confidence: number; // 0-1 confidence score
  artifacts: Artifact[];
}

export interface TaskContext {
  organizationId: string;
  userId: string;
  relatedTaskIds?: string[];
  parentTaskId?: string;
  tags?: string[];
}

export interface TaskMetadata {
  processingTimeMs?: number;
  tokensUsed?: number;
  modelUsed?: string;
  retryCount: number;
  version: number;
}

export interface TaskError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

export interface ReviewStatus {
  status: 'pending' | 'approved' | 'rejected' | 'revision-requested';
  reviewerId?: string;
  reviewedAt?: Date;
  comments?: string;
  changes?: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  type: 'course' | 'module' | 'lesson' | 'quiz' | 'assessment' | 'report' | 'knowledge-graph';
  name: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// CONTENT INGESTION AGENT TYPES
// ============================================================================

export interface ContentIngestionInput extends TaskInput {
  type: 'content-ingestion';
  data: {
    documentId: string;
    documentType: 'pdf' | 'docx' | 'pptx' | 'html' | 'txt' | 'video' | 'audio';
    documentUrl: string;
    documentName: string;
    extractionMode: 'full' | 'summary' | 'key-points';
    targetAudience?: string;
    complianceContext?: string[];
  };
}

export interface ContentIngestionOutput extends TaskOutput {
  type: 'content-ingestion';
  data: {
    documentId: string;
    extractedContent: ExtractedContent;
    knowledgeGraph: KnowledgeGraph;
    suggestedTopics: Topic[];
    complianceTags: ComplianceTag[];
    estimatedLearningTime: number; // minutes
  };
}

export interface ExtractedContent {
  title: string;
  summary: string;
  sections: ContentSection[];
  keyTerms: KeyTerm[];
  learningObjectives: string[];
  prerequisites: string[];
}

export interface ContentSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'list' | 'table' | 'image' | 'diagram';
  importance: 'critical' | 'important' | 'supplementary';
  relatedSections: string[];
}

export interface KeyTerm {
  term: string;
  definition: string;
  context: string;
  relatedTerms: string[];
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  parentTopicId?: string;
  relatedTopicIds: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface ComplianceTag {
  category: string;
  requirement: string;
  regulation?: string;
  priority: 'mandatory' | 'recommended' | 'optional';
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'skill' | 'fact' | 'procedure' | 'principle';
  label: string;
  description: string;
  weight: number;
  metadata: Record<string, unknown>;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: 'requires' | 'related-to' | 'part-of' | 'leads-to' | 'contrasts';
  weight: number;
}

// ============================================================================
// LEARNING DESIGN AGENT TYPES
// ============================================================================

export interface LearningDesignInput extends TaskInput {
  type: 'learning-design';
  data: {
    contentIngestionTaskId: string;
    targetAudience: AudienceProfile;
    learningGoals: string[];
    timeConstraint?: number; // max hours
    deliveryFormat: 'self-paced' | 'instructor-led' | 'blended';
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  };
}

export interface LearningDesignOutput extends TaskOutput {
  type: 'learning-design';
  data: {
    courseStructure: CourseDesign;
    learningPath: LearningPathDesign;
    assessmentStrategy: AssessmentStrategy;
    estimatedDuration: number;
    prerequisites: PrerequisiteRequirement[];
  };
}

export interface AudienceProfile {
  roles: string[];
  departments?: string[];
  experienceLevel: 'novice' | 'intermediate' | 'expert';
  learningPreferences?: string[];
  accessibilityNeeds?: string[];
}

export interface CourseDesign {
  id: string;
  title: string;
  description: string;
  objectives: LearningObjective[];
  modules: ModuleDesign[];
  estimatedHours: number;
  certificationAvailable: boolean;
}

export interface LearningObjective {
  id: string;
  statement: string;
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  measurable: boolean;
  assessmentCriteria: string[];
}

export interface ModuleDesign {
  id: string;
  title: string;
  description: string;
  objectives: string[]; // references to LearningObjective ids
  lessons: LessonDesign[];
  estimatedMinutes: number;
  sequenceOrder: number;
  prerequisites: string[]; // other module ids
}

export interface LessonDesign {
  id: string;
  title: string;
  description: string;
  contentType: 'video' | 'text' | 'interactive' | 'simulation' | 'discussion';
  content: LessonContent;
  activities: LearningActivity[];
  estimatedMinutes: number;
  sequenceOrder: number;
}

export interface LessonContent {
  mainContent: string;
  keyPoints: string[];
  examples: Example[];
  resources: Resource[];
}

export interface Example {
  title: string;
  description: string;
  type: 'scenario' | 'case-study' | 'demonstration' | 'worked-example';
}

export interface Resource {
  title: string;
  type: 'article' | 'video' | 'document' | 'tool' | 'reference';
  url?: string;
  description: string;
}

export interface LearningActivity {
  id: string;
  type: 'quiz' | 'exercise' | 'discussion' | 'project' | 'reflection';
  title: string;
  instructions: string;
  estimatedMinutes: number;
  gradedWeight?: number;
}

export interface LearningPathDesign {
  id: string;
  name: string;
  description: string;
  milestones: Milestone[];
  alternativePaths: AlternativePath[];
}

export interface Milestone {
  id: string;
  name: string;
  requirements: string[];
  reward?: string;
  estimatedCompletion: number; // hours
}

export interface AlternativePath {
  condition: string;
  targetMilestoneId: string;
  reason: string;
}

export interface AssessmentStrategy {
  formativeAssessments: AssessmentPlan[];
  summativeAssessments: AssessmentPlan[];
  passingThreshold: number;
  retakePolicy: RetakePolicy;
}

export interface AssessmentPlan {
  id: string;
  name: string;
  type: 'quiz' | 'exam' | 'project' | 'practical' | 'peer-review';
  weight: number;
  placementAfter: string; // lesson or module id
  objectivesCovered: string[];
}

export interface RetakePolicy {
  maxAttempts: number;
  cooldownHours: number;
  scorePolicy: 'highest' | 'latest' | 'average';
}

export interface PrerequisiteRequirement {
  type: 'course' | 'skill' | 'certification' | 'experience';
  id: string;
  name: string;
  required: boolean;
}

// ============================================================================
// ASSESSMENT AGENT TYPES
// ============================================================================

export interface AssessmentAgentInput extends TaskInput {
  type: 'assessment';
  data: {
    learningDesignTaskId: string;
    assessmentPlanId: string;
    questionCount: number;
    questionTypes: QuestionType[];
    difficultyDistribution: DifficultyDistribution;
    includeRubrics: boolean;
  };
}

export interface AssessmentAgentOutput extends TaskOutput {
  type: 'assessment';
  data: {
    assessmentId: string;
    questions: GeneratedQuestion[];
    rubrics: Rubric[];
    answerKey: AnswerKey;
    estimatedCompletionMinutes: number;
  };
}

export type QuestionType =
  | 'multiple-choice'
  | 'multiple-select'
  | 'true-false'
  | 'short-answer'
  | 'essay'
  | 'matching'
  | 'ordering'
  | 'fill-blank'
  | 'scenario-based'
  | 'practical';

export interface DifficultyDistribution {
  easy: number; // percentage
  medium: number;
  hard: number;
}

export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  objectiveId: string;
  bloomLevel: string;
  options?: QuestionOption[];
  correctAnswer: string | string[];
  explanation: string;
  hints?: string[];
  points: number;
  timeLimit?: number; // seconds
  tags: string[];
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

export interface Rubric {
  id: string;
  questionId: string;
  criteria: RubricCriterion[];
  maxScore: number;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  levels: RubricLevel[];
  weight: number;
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
  examples?: string[];
}

export interface AnswerKey {
  assessmentId: string;
  answers: AnswerKeyItem[];
  gradingNotes: string;
}

export interface AnswerKeyItem {
  questionId: string;
  correctAnswer: string | string[];
  acceptableVariations?: string[];
  partialCreditRules?: PartialCreditRule[];
}

export interface PartialCreditRule {
  condition: string;
  creditPercentage: number;
}

// ============================================================================
// TUTOR AGENT TYPES
// ============================================================================

export interface TutorAgentInput extends TaskInput {
  type: 'tutor';
  data: {
    learnerId: string;
    context: TutorContext;
    interaction: TutorInteraction;
  };
}

export interface TutorAgentOutput extends TaskOutput {
  type: 'tutor';
  data: {
    response: TutorResponse;
    learnerStateUpdate: LearnerStateUpdate;
    recommendedActions: RecommendedAction[];
  };
}

export interface TutorContext {
  courseId: string;
  moduleId: string;
  lessonId: string;
  learnerProfile: LearnerProfile;
  recentInteractions: TutorInteraction[];
  currentProgress: LearnerProgress;
}

export interface LearnerProfile {
  id: string;
  learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  pacePreference: 'slow' | 'medium' | 'fast';
  knowledgeLevel: Record<string, number>; // topic -> proficiency 0-1
  strengths: string[];
  weaknesses: string[];
  motivationFactors: string[];
}

export interface LearnerProgress {
  completedLessons: string[];
  currentLesson: string;
  assessmentScores: Record<string, number>;
  timeSpent: number; // minutes
  lastActivity: Date;
  strugglingTopics: string[];
}

export interface TutorInteraction {
  type: 'question' | 'confusion' | 'request-example' | 'request-hint' | 'submit-answer' | 'feedback';
  content: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface TutorResponse {
  type: 'explanation' | 'hint' | 'example' | 'encouragement' | 'correction' | 'socratic-question';
  content: string;
  visualAids?: VisualAid[];
  followUpQuestions?: string[];
  resources?: Resource[];
  adaptations: ResponseAdaptation[];
}

export interface VisualAid {
  type: 'diagram' | 'chart' | 'animation' | 'image';
  url?: string;
  description: string;
  altText: string;
}

export interface ResponseAdaptation {
  reason: string;
  adaptation: string;
}

export interface LearnerStateUpdate {
  knowledgeUpdates: Record<string, number>;
  engagementLevel: number;
  frustrationIndicators: string[];
  recommendedPace: 'slow-down' | 'maintain' | 'speed-up';
}

export interface RecommendedAction {
  type: 'review-topic' | 'practice-more' | 'move-forward' | 'take-break' | 'seek-help';
  priority: 'low' | 'medium' | 'high';
  reason: string;
  targetContent?: string;
}

// ============================================================================
// OUTCOME ANALYTICS AGENT TYPES
// ============================================================================

export interface OutcomeAnalyticsInput extends TaskInput {
  type: 'outcome-analytics';
  data: {
    analysisType: AnalysisType;
    scope: AnalysisScope;
    timeRange: TimeRange;
    filters?: AnalysisFilters;
  };
}

export interface OutcomeAnalyticsOutput extends TaskOutput {
  type: 'outcome-analytics';
  data: {
    analysisId: string;
    insights: Insight[];
    predictions: Prediction[];
    recommendations: AnalyticsRecommendation[];
    alerts: AnalyticsAlert[];
    visualizations: VisualizationData[];
  };
}

export type AnalysisType =
  | 'skill-gap'
  | 'readiness-forecast'
  | 'compliance-risk'
  | 'learning-effectiveness'
  | 'engagement-trends'
  | 'performance-prediction';

export interface AnalysisScope {
  level: 'individual' | 'team' | 'department' | 'organization';
  entityIds?: string[];
  courseIds?: string[];
  skillIds?: string[];
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'day' | 'week' | 'month' | 'quarter';
}

export interface AnalysisFilters {
  departments?: string[];
  roles?: string[];
  locations?: string[];
  complianceCategories?: string[];
}

export interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'benchmark';
  title: string;
  description: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  dataPoints: DataPoint[];
  affectedEntities: string[];
}

export interface DataPoint {
  label: string;
  value: number;
  unit: string;
  change?: number;
  changeDirection?: 'up' | 'down' | 'stable';
}

export interface Prediction {
  id: string;
  type: 'completion' | 'performance' | 'risk' | 'engagement';
  target: string;
  predictedValue: number;
  confidence: number;
  factors: PredictionFactor[];
  timeframe: string;
}

export interface PredictionFactor {
  name: string;
  impact: number; // -1 to 1
  description: string;
}

export interface AnalyticsRecommendation {
  id: string;
  type: 'intervention' | 'optimization' | 'resource-allocation' | 'content-update';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  targetEntities: string[];
  actions: string[];
}

export interface AnalyticsAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'compliance-deadline' | 'performance-drop' | 'engagement-decline' | 'skill-gap';
  title: string;
  message: string;
  affectedCount: number;
  deadline?: Date;
  suggestedAction: string;
}

export interface VisualizationData {
  id: string;
  type: 'line-chart' | 'bar-chart' | 'pie-chart' | 'heatmap' | 'scatter' | 'sankey';
  title: string;
  data: Record<string, unknown>;
  config: Record<string, unknown>;
}

// ============================================================================
// QUALITY ASSURANCE AGENT TYPES
// ============================================================================

export interface QualityAssuranceInput extends TaskInput {
  type: 'quality-assurance';
  data: {
    sourceTaskId: string;
    sourceAgentType: AgentType;
    contentToReview: Record<string, unknown>;
    qualityStandards: QualityStandard[];
  };
}

export interface QualityAssuranceOutput extends TaskOutput {
  type: 'quality-assurance';
  data: {
    overallScore: number;
    passed: boolean;
    criteriaResults: CriteriaResult[];
    issues: QualityIssue[];
    suggestions: QualitySuggestion[];
    certificationReady: boolean;
  };
}

export interface QualityStandard {
  id: string;
  name: string;
  category: 'accuracy' | 'completeness' | 'clarity' | 'accessibility' | 'compliance' | 'pedagogy';
  weight: number;
  passingThreshold: number;
  criteria: QualityCriterion[];
}

export interface QualityCriterion {
  id: string;
  name: string;
  description: string;
  checkType: 'automated' | 'ai-review' | 'manual-required';
}

export interface CriteriaResult {
  criterionId: string;
  score: number;
  passed: boolean;
  details: string;
  evidence?: string[];
}

export interface QualityIssue {
  id: string;
  severity: 'minor' | 'major' | 'critical';
  category: string;
  location: string;
  description: string;
  suggestedFix?: string;
  autoFixable: boolean;
}

export interface QualitySuggestion {
  id: string;
  type: 'enhancement' | 'clarification' | 'addition' | 'removal';
  description: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// ORCHESTRATOR TYPES
// ============================================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  errorHandling: ErrorHandlingConfig;
  notifications: NotificationConfig;
}

export interface WorkflowTrigger {
  type: 'manual' | 'document-upload' | 'schedule' | 'event';
  config: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentType: AgentType;
  inputMapping: Record<string, string>; // maps workflow context to agent input
  outputMapping: Record<string, string>; // maps agent output to workflow context
  conditions?: StepCondition[];
  humanReviewRequired: boolean;
  timeout: number;
  retryConfig: RetryConfig;
}

export interface StepCondition {
  field: string;
  operator: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'contains';
  value: unknown;
  action: 'skip' | 'fail' | 'branch';
  branchTo?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface ErrorHandlingConfig {
  onStepFailure: 'stop' | 'continue' | 'retry' | 'branch';
  fallbackStep?: string;
  notifyOnFailure: boolean;
}

export interface NotificationConfig {
  onStart: boolean;
  onComplete: boolean;
  onFailure: boolean;
  onHumanReviewRequired: boolean;
  channels: ('email' | 'in-app' | 'webhook')[];
  recipients: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  currentStepId: string;
  context: Record<string, unknown>;
  stepResults: StepResult[];
  error?: WorkflowError;
}

export interface StepResult {
  stepId: string;
  taskId: string;
  status: TaskStatus;
  startedAt: Date;
  completedAt?: Date;
  output?: Record<string, unknown>;
  error?: TaskError;
}

export interface WorkflowError {
  stepId: string;
  error: TaskError;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
}
