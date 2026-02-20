// Enterprise Learning System Types

// Phase Types
export interface Phase {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: 'pending' | 'in-progress' | 'completed';
  progress: number;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  skills: Skill[];
  progress: number;
  lastActive: Date;
}

export interface Skill {
  id: string;
  name: string;
  level: number; // 0-100
  category: string;
}

// Content Types
export interface UploadedFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'audio' | 'video';
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  extractedContent?: string;
  tags: string[];
  uploadedAt: Date;
}

// Course Types
export interface Course {
  id: string;
  title: string;
  description: string;
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  units: Unit[];
  order: number;
}

export interface Unit {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'video' | 'audio' | 'interactive';
  duration: number; // minutes
  order: number;
}

export interface LearningOutcome {
  id: string;
  description: string;
  taxonomy: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  measurable: boolean;
}

// Assessment Types
export interface Assessment {
  id: string;
  title: string;
  type: 'mcq' | 'listening' | 'reading' | 'math' | 'speaking';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questions: Question[];
  timeLimit?: number; // minutes
}

export interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'listening' | 'reading' | 'math' | 'speaking';
  options?: string[];
  correctAnswer?: string | number;
  points: number;
}

// Analytics Types
export interface Analytics {
  completionRate: number;
  averageScore: number;
  totalLearners: number;
  activeLearners: number;
  engagementMetrics: EngagementMetric[];
  timeSeriesData: TimeSeriesData[];
}

export interface EngagementMetric {
  metric: string;
  value: number;
  change: number;
}

export interface TimeSeriesData {
  date: string;
  completions: number;
  activeUsers: number;
  averageScore: number;
}

// Compliance Types
export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  deadline: Date;
  assignedRoles: string[];
  completionRate: number;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

// Learning Path Types
export interface LearningPath {
  id: string;
  userId: string;
  nodes: PathNode[];
  currentNodeId: string;
  completedNodes: string[];
}

export interface PathNode {
  id: string;
  title: string;
  type: 'module' | 'assessment' | 'refresher';
  dependencies: string[];
  estimatedTime: number;
  completed: boolean;
}

// AI Generation Types
export interface AIGenerationRequest {
  type: 'lesson' | 'slides' | 'audio' | 'assessment';
  prompt: string;
  parameters: Record<string, any>;
}

export interface AIGenerationResponse {
  content: string;
  metadata: Record<string, any>;
  confidence: number;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details: Record<string, any>;
}

// Dashboard Stats
export interface DashboardStats {
  activeCourses: number;
  totalLearners: number;
  completionRate: number;
  complianceScore: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  user: User;
  action: string;
  target: string;
  timestamp: Date;
}

// ELS Phase Components Props
export interface PhaseComponentProps {
  isActive?: boolean;
  onComplete?: () => void;
}

// ============================================================================
// FIREBASE INTEGRATION TYPES
// ============================================================================

// ELS Phase Types
export type ELSPhase = 
  | 'ingest' 
  | 'analyze' 
  | 'design' 
  | 'develop' 
  | 'implement' 
  | 'evaluate' 
  | 'personalize' 
  | 'portal' 
  | 'govern';

export interface ELSPhaseStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  data?: any;
}

// Main ELS Project Type
export interface ELSProject {
  id: string;
  orgId: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived' | 'completed';
  
  // Phase tracking
  phases: Record<ELSPhase, ELSPhaseStatus>;
  currentPhase: ELSPhase;
  
  // References to created resources
  createdCourseIds: string[];
  createdLearningPathIds: string[];
  createdAssessmentIds: string[];
  
  // Audit
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  lastModifiedBy: string;
}

// ELS Content (Content Ingestion Phase)
export interface ELSContent {
  id: string;
  orgId: string;
  projectId: string;
  
  // File metadata
  name: string;
  type: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'audio' | 'video';
  size: number;
  fileUrl: string;
  storagePath?: string;
  
  // Processing
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  processingOptions: {
    nlp: boolean;
    ocr: boolean;
    tagging: boolean;
  };
  processingError?: string;
  
  // Extracted data
  extractedContent?: string;
  extractedMetadata?: {
    title?: string;
    author?: string;
    keywords?: string[];
    summary?: string;
    pageCount?: number;
    language?: string;
  };
  tags: string[];
  
  // AI analysis
  aiAnalysis?: {
    topics: string[];
    keyConcepts: string[];
    suggestedLearningOutcomes: string[];
    contentGaps: string[];
    complexityScore?: number;
    readingTime?: number;
  };
  
  uploadedBy: string;
  uploadedAt: number;
}

// ELS Needs Analysis (Analyze Phase)
export interface ELSNeedsAnalysis {
  id: string;
  orgId: string;
  projectId: string;
  
  // Learner profiles
  targetAudience: {
    departments: string[];
    roles: string[];
    teams: string[];
    individualUsers: string[];
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
    estimatedLearners: number;
  };
  
  // Skill gap analysis
  skillGaps: ELSSkillGap[];
  
  // Compliance requirements
  complianceRequirements: ELSComplianceRequirement[];
  
  // Generated objectives
  learningObjectives: ELSLearningObjective[];
  
  createdAt: number;
  updatedAt: number;
}

export interface ELSSkillGap {
  skillId: string;
  skillName: string;
  category: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  affectedDepartments: string[];
  affectedUsers: string[];
}

export interface ELSComplianceRequirement {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: number;
  regulationRef?: string;
  applicableRoles: string[];
  applicableDepartments: string[];
}

export interface ELSLearningObjective {
  id: string;
  description: string;
  taxonomy: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  measurable: boolean;
  measurementCriteria?: string;
  linkedContentIds: string[];
}

// ELS Course Design (Design Phase)
export interface ELSCourseDesign {
  id: string;
  orgId: string;
  projectId: string;
  analysisId: string;
  
  // Blueprint
  title: string;
  description: string;
  shortDescription?: string;
  estimatedDuration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  tags: string[];
  
  // Structure
  modules: ELSModule[];
  
  // Learning outcomes (linked to NeedsAnalysis)
  learningObjectiveIds: string[];
  
  // Instructional design
  instructionalStrategies: {
    practiceActivities: boolean;
    groupDiscussions: boolean;
    teachBackTasks: boolean;
    caseStudies: boolean;
    simulations: boolean;
  };
  
  // Adult learning principles
  adultLearningPrinciples: {
    practicalRelevance: boolean;
    selfDirected: boolean;
    experiential: boolean;
    problemCentered: boolean;
  };
  
  // Bloom's taxonomy distribution
  taxonomyDistribution: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
    create: number;
  };
  
  // Prerequisites
  prerequisiteCourseIds: string[];
  requiredSkills: string[];
  
  createdAt: number;
  updatedAt: number;
}

export interface ELSModule {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedDuration: number;
  units: ELSUnit[];
}

export interface ELSUnit {
  id: string;
  title: string;
  description?: string;
  type: 'text' | 'video' | 'audio' | 'interactive' | 'quiz' | 'assignment';
  duration: number; // minutes
  content?: string;
  order: number;
  isRequired: boolean;
  resources: ELSResource[];
}

export interface ELSResource {
  id: string;
  name: string;
  type: 'file' | 'link' | 'embed';
  url: string;
  contentId?: string; // Reference to ELSContent
}

// ELS AI Generation (Develop Phase)
export interface ELSAIGeneration {
  id: string;
  orgId: string;
  projectId: string;
  designId: string;
  
  // Generation requests and outputs
  generations: ELSGenerationItem[];
  
  // Generated assessments
  assessments: ELSGeneratedAssessment[];
  
  createdAt: number;
  updatedAt: number;
}

export interface ELSGenerationItem {
  id: string;
  type: 'lesson' | 'slides' | 'audio' | 'interactive' | 'video_script';
  targetModuleId?: string;
  targetUnitId?: string;
  prompt: string;
  parameters: Record<string, any>;
  status: 'pending' | 'generating' | 'completed' | 'error';
  output?: string;
  outputMetadata?: {
    tokensUsed: number;
    model: string;
    confidence: number;
    generationTime: number;
  };
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
  completedAt?: number;
}

export interface ELSGeneratedAssessment {
  id: string;
  type: 'mcq' | 'listening' | 'reading' | 'math' | 'speaking' | 'true_false' | 'matching';
  title: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questions: ELSGeneratedQuestion[];
  timeLimit?: number; // minutes
  passingScore: number;
  maxAttempts: number;
  linkedModuleId?: string;
  linkedUnitId?: string;
}

export interface ELSGeneratedQuestion {
  id: string;
  text: string;
  type: 'mcq' | 'listening' | 'reading' | 'math' | 'speaking' | 'true_false' | 'matching';
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  explanation?: string;
  topicTag?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ELS Implementation (Implement Phase)
export interface ELSImplementation {
  id: string;
  orgId: string;
  projectId: string;
  designId: string;
  courseId?: string;
  learningPathId?: string;
  
  // Enrollment rules
  enrollmentRules: ELSEnrollmentRule[];
  
  // Schedule
  schedule: {
    startDate?: number;
    endDate?: number;
    selfEnrollment: boolean;
    allowLateEnrollment: boolean;
    enrollmentDeadline?: number;
  };
  
  // Notifications
  notifications: {
    enrollmentNotification: boolean;
    reminderDays: number[];
    completionNotification: boolean;
    overdueAlerts: boolean;
    managerNotifications: boolean;
  };
  
  // Tutor assignment
  assignedTutors: string[]; // User IDs
  
  // Personalization settings
  personalisation?: {
    adaptivePacing: boolean;
    prerequisiteEnforcement: boolean;
    remedialPaths: boolean;
    advancedPaths: boolean;
  };

  // Enrollment tracking
  enrollmentStats: {
    enrolledCount: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    overdueCount: number;
  };
  
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface ELSEnrollmentRule {
  id: string;
  type: 'role' | 'department' | 'team' | 'individual' | 'all';
  targetId: string;
  targetName: string;
  dueDate?: number;
  priority: 'required' | 'recommended' | 'optional';
  autoEnroll: boolean;
}

// ELS Analytics (Evaluate Phase)
export interface ELSAnalytics {
  id: string;
  orgId: string;
  projectId: string;
  courseId?: string;
  implementationId: string;
  
  // Overview metrics
  metrics: ELSMetrics;
  
  // Time series data
  timeSeriesData: ELSTimeSeriesPoint[];
  
  // Engagement metrics
  engagementMetrics: ELSEngagementMetric[];
  
  // Compliance tracking
  complianceMetrics: ELSComplianceMetric[];
  
  // Skill improvement
  skillImprovement: ELSSkillImprovement[];
  
  // Department breakdown
  departmentStats: ELSDepartmentStat[];
  
  // Individual learner stats
  learnerStats: ELSLearnerStat[];
  
  updatedAt: number;
}

export interface ELSMetrics {
  totalLearners: number;
  activeLearners: number;
  completionRate: number;
  averageScore: number;
  averageTimeToComplete: number; // minutes
  dropoutRate: number;
  satisfactionScore?: number; // 1-5
}

export interface ELSTimeSeriesPoint {
  date: string; // ISO date
  completions: number;
  activeUsers: number;
  averageScore: number;
  newEnrollments: number;
  dropoffs: number;
}

export interface ELSEngagementMetric {
  metric: string;
  value: number;
  change: number; // Percentage change from previous period
  period: string;
}

export interface ELSComplianceMetric {
  requirementId: string;
  requirementName: string;
  completionRate: number;
  completedCount: number;
  totalCount: number;
  overdueCount: number;
  atRiskUsers: string[];
}

export interface ELSSkillImprovement {
  skillId: string;
  skillName: string;
  beforeAverage: number;
  afterAverage: number;
  improvement: number;
  sampleSize: number;
}

export interface ELSDepartmentStat {
  departmentId: string;
  departmentName: string;
  learnerCount: number;
  completionRate: number;
  averageScore: number;
  averageTimeSpent: number;
}

export interface ELSLearnerStat {
  userId: string;
  userName: string;
  departmentId?: string;
  enrolledAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  score?: number;
  timeSpent: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
}

// ELS Governance (Govern Phase)
export interface ELSGovernance {
  id: string;
  orgId: string;
  projectId: string;
  
  // Data privacy
  privacySettings: ELSPrivacySettings;
  
  // Security
  securitySettings: ELSSecuritySettings;
  
  // Model monitoring (for AI-generated content)
  aiMonitoring: ELSAIMonitoring;
  
  // Approval workflow
  approvalWorkflow: ELSApprovalWorkflow;
  
  // Retention policy
  retentionPolicy: ELSRetentionPolicy;
  
  updatedAt: number;
}

export interface ELSPrivacySettings {
  dataRetentionPeriod: number; // days
  anonymizeAfterCompletion: boolean;
  allowDataExport: boolean;
  gdprCompliant: boolean;
  dataProcessingAgreement?: string;
  privacyOfficer?: string;
}

export interface ELSSecuritySettings {
  requireApprovalForPublishing: boolean;
  approverRoles: string[];
  contentReviewRequired: boolean;
  automaticArchiving: boolean;
  archiveAfterDays: number;
  encryptionEnabled: boolean;
  accessLogEnabled: boolean;
}

export interface ELSAIMonitoring {
  contentReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: number;
  biasCheckCompleted: boolean;
  accuracyScore?: number;
  fairnessScore?: number;
  contentQualityScore?: number;
}

export interface ELSApprovalWorkflow {
  enabled: boolean;
  stages: ELSApprovalStage[];
}

export interface ELSApprovalStage {
  id: string;
  name: string;
  order: number;
  requiredRoles: string[];
  approvedBy?: string;
  approvedAt?: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface ELSRetentionPolicy {
  learnerDataRetention: number; // days
  assessmentDataRetention: number;
  auditLogRetention: number;
  contentVersionRetention: number;
  action: 'archive' | 'delete' | 'anonymize';
}

// ELS Audit Log Entry
export interface ELSAuditLogEntry {
  id: string;
  orgId: string;
  projectId?: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: 'project' | 'content' | 'analysis' | 'design' | 'generation' | 'implementation' | 'analytics' | 'governance';
  entityId: string;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
