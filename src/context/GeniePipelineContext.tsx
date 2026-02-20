import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { GenieSource, GenieCourseDraft } from '../types/lms';

// Pipeline stage definitions
export type PipelineStage =
  | 'ingest'
  | 'analyze'
  | 'design'
  | 'develop'
  | 'implement'
  | 'evaluate';

export interface StageConfig {
  id: PipelineStage;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

export const PIPELINE_STAGES: StageConfig[] = [
  {
    id: 'ingest',
    label: 'Content Ingestion',
    shortLabel: 'Ingest',
    description: 'Upload policies, SOPs, and training materials',
    icon: 'folder-open'
  },
  {
    id: 'analyze',
    label: 'Analyze (ADDIE)',
    shortLabel: 'Analyze',
    description: 'Identify learning needs and skill gaps',
    icon: 'bar-chart-2'
  },
  {
    id: 'design',
    label: 'Design',
    shortLabel: 'Design',
    description: 'Create learning objectives and course structure',
    icon: 'layout'
  },
  {
    id: 'develop',
    label: 'Develop',
    shortLabel: 'Develop',
    description: 'Generate AI-powered content and assessments',
    icon: 'edit-3'
  },
  {
    id: 'implement',
    label: 'Implement',
    shortLabel: 'Implement',
    description: 'Deploy, enroll learners, and schedule',
    icon: 'play-circle'
  },
  {
    id: 'evaluate',
    label: 'Evaluate',
    shortLabel: 'Evaluate',
    description: 'Track outcomes and iterate improvements',
    icon: 'trending-up'
  }
];

// Project data structure for the pipeline
export interface PipelineProject {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // Stage 1: Ingest
  sourceIds: string[];
  sources: GenieSource[];

  // Stage 2: Analyze
  analysis?: {
    targetAudience: string;
    learningNeeds: string[];
    skillGaps: string[];
    constraints: string[];
    context: string;
    learnerProfiles?: {
      roles: Array<{ label: string; count: number }>;
      departments: Array<{ label: string; count: number }>;
      teams: Array<{ label: string; count: number }>;
    };
    complianceMapping?: {
      sources: string[];
      tags: string[];
      suggestedRoles: string[];
    };
    contentGaps?: string[];
    learningObjectives?: string[];
  };

  // Stage 3: Design
  design?: {
    courseTitle: string;
    learningObjectives: string[];
    moduleStructure: Array<{
      title: string;
      description: string;
      topics: string[];
    }>;
    instructionalStrategies?: Array<{
      moduleIndex: number;
      activeLearning: string[];
      multimedia: string[];
    }>;
    adultLearningChecklist?: {
      practicalRelevance: boolean;
      selfDirected: boolean;
      reflectiveActivities: boolean;
    };
    assessmentStrategy: string;
    deliveryMethod: string;
  };

  // Stage 4: Develop
  draft?: GenieCourseDraft;

  // Stage 5: Implement
  implementation?: {
    courseId?: string;
    enrollmentRules: Array<{
      type: 'role' | 'team' | 'department' | 'all';
      targetId?: string;
      targetName: string;
    }>;
    startDate?: Date;
    endDate?: Date;
    notifications: boolean;
  };

  // Stage 6: Evaluate
  evaluation?: {
    metrics: string[];
    feedbackEnabled: boolean;
    reportSchedule?: 'daily' | 'weekly' | 'monthly';
  };

  // Stage completion tracking
  stageStatus: Record<PipelineStage, 'pending' | 'in_progress' | 'completed'>;

  // Approval tracking
  stageApprovals: Record<PipelineStage, 'pending' | 'approved' | 'rejected'>;
  approvalHistory: Array<{
    stage: PipelineStage;
    status: 'approved' | 'rejected';
    approvedBy?: { id: string; name: string };
    approvedAt: Date;
    notes?: string;
  }>;
  copilot?: {
    prompts: Partial<Record<PipelineStage, string[]>>;
    history: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: Date;
    }>;
    actionsTaken?: Array<{
      id: string;
      stage: PipelineStage;
      action: string;
      status?: 'pending' | 'success' | 'error';
      error?: string;
      createdAt: Date;
    }>;
    suggestions?: Array<{
      id: string;
      stage: PipelineStage;
      message: string;
      createdAt: Date;
      followed?: boolean;
      action?: string;
    }>;
  };
}

// Context state
interface GeniePipelineState {
  currentStage: PipelineStage;
  project: PipelineProject | null;
  isLoading: boolean;
  error: string | null;
  autopilotStatus: 'idle' | 'running' | 'blocked';
  autopilotProgress: { current: number; total: number } | null;
}

// Context actions
interface GeniePipelineActions {
  setStage: (stage: PipelineStage) => void;
  nextStage: () => void;
  prevStage: () => void;
  canAdvance: () => boolean;
  canGoBack: () => boolean;

  createProject: (name: string, description?: string) => PipelineProject;
  updateProject: (updates: Partial<PipelineProject>) => void;
  loadProject: (project: PipelineProject) => void;
  registerStageActions: (stage: PipelineStage, actions: Record<string, (payload?: unknown) => void | Promise<void>>) => void;
  invokeStageAction: (stage: PipelineStage, action: string, payload?: unknown) => Promise<void>;
  autopilotEnabled: boolean;
  setAutopilotEnabled: (enabled: boolean) => void;
  setAutopilotStatus: (status: 'idle' | 'running' | 'blocked') => void;
  setAutopilotProgress: (progress: { current: number; total: number } | null) => void;
  clearProject: () => void;

  markStageComplete: (stage: PipelineStage) => void;
  markStageInProgress: (stage: PipelineStage) => void;
  approveStage: (stage: PipelineStage, actor?: { id: string; name: string }, notes?: string) => void;
  rejectStage: (stage: PipelineStage, actor?: { id: string; name: string }, notes?: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  getStageIndex: (stage: PipelineStage) => number;
  getStageConfig: (stage: PipelineStage) => StageConfig | undefined;
  isStageComplete: (stage: PipelineStage) => boolean;
  isStageApproved: (stage: PipelineStage) => boolean;
  isStageAccessible: (stage: PipelineStage) => boolean;
}

type GeniePipelineContextType = GeniePipelineState & GeniePipelineActions;

const GeniePipelineContext = createContext<GeniePipelineContextType | null>(null);

// Create initial project
function createInitialProject(name: string, description?: string): PipelineProject {
  return {
    id: `project_${Date.now()}`,
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceIds: [],
    sources: [],
    stageStatus: {
      ingest: 'pending',
      analyze: 'pending',
      design: 'pending',
      develop: 'pending',
      implement: 'pending',
      evaluate: 'pending'
    },
    stageApprovals: {
      ingest: 'pending',
      analyze: 'pending',
      design: 'pending',
      develop: 'pending',
      implement: 'pending',
      evaluate: 'pending'
    },
    approvalHistory: []
  };
}

interface GeniePipelineProviderProps {
  children: ReactNode;
  initialStage?: PipelineStage;
}

export function GeniePipelineProvider({ children, initialStage = 'ingest' }: GeniePipelineProviderProps) {
  const [currentStage, setCurrentStage] = useState<PipelineStage>(initialStage);
  const [project, setProject] = useState<PipelineProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageActions, setStageActions] = useState<Record<string, Record<string, (payload?: unknown) => void>>>({});
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [autopilotStatus, setAutopilotStatus] = useState<'idle' | 'running' | 'blocked'>('idle');
  const [autopilotProgress, setAutopilotProgress] = useState<{ current: number; total: number } | null>(null);

  const getStageIndex = useCallback((stage: PipelineStage) => {
    return PIPELINE_STAGES.findIndex(s => s.id === stage);
  }, []);

  const getStageConfig = useCallback((stage: PipelineStage) => {
    return PIPELINE_STAGES.find(s => s.id === stage);
  }, []);

  const setStage = useCallback((stage: PipelineStage) => {
    setCurrentStage(stage);
    setError(null);
  }, []);

  const canAdvance = useCallback(() => {
    const currentIndex = getStageIndex(currentStage);
    if (currentIndex >= PIPELINE_STAGES.length - 1) return false;
    if (!project) return false;
    return project.stageStatus[currentStage] === 'completed';
  }, [currentStage, getStageIndex, project]);

  const canGoBack = useCallback(() => {
    const currentIndex = getStageIndex(currentStage);
    return currentIndex > 0;
  }, [currentStage, getStageIndex]);

  const nextStage = useCallback(() => {
    if (canAdvance()) {
      const currentIndex = getStageIndex(currentStage);
      setCurrentStage(PIPELINE_STAGES[currentIndex + 1].id);
      setError(null);
    }
  }, [canAdvance, currentStage, getStageIndex]);

  const prevStage = useCallback(() => {
    if (canGoBack()) {
      const currentIndex = getStageIndex(currentStage);
      setCurrentStage(PIPELINE_STAGES[currentIndex - 1].id);
      setError(null);
    }
  }, [canGoBack, currentStage, getStageIndex]);

  const createProject = useCallback((name: string, description?: string) => {
    const newProject = createInitialProject(name, description);
    setProject(newProject);
    setCurrentStage('ingest');
    return newProject;
  }, []);

  const updateProject = useCallback((updates: Partial<PipelineProject>) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updates,
        updatedAt: new Date()
      };
    });
  }, []);

  const clearProject = useCallback(() => {
    setProject(null);
    setCurrentStage('ingest');
    setError(null);
  }, []);

  const loadProject = useCallback((loaded: PipelineProject) => {
    setProject(loaded);
    const inProgress = PIPELINE_STAGES.find(stage => loaded.stageStatus[stage.id] === 'in_progress');
    if (inProgress) {
      setCurrentStage(inProgress.id);
      setError(null);
      return;
    }
    const firstPending = PIPELINE_STAGES.find(stage => loaded.stageStatus[stage.id] === 'pending');
    if (firstPending) {
      setCurrentStage(firstPending.id);
      setError(null);
      return;
    }
    setCurrentStage('ingest');
    setError(null);
  }, []);

  const registerStageActions = useCallback((stage: PipelineStage, actions: Record<string, (payload?: unknown) => void | Promise<void>>) => {
    setStageActions(prev => ({
      ...prev,
      [stage]: actions
    }));
  }, []);

  const invokeStageAction = useCallback(async (stage: PipelineStage, action: string, payload?: unknown) => {
    const actionMap = stageActions[stage];
    const handler = actionMap?.[action];
    if (handler) {
      await handler(payload);
    }
  }, [stageActions]);

  const markStageComplete = useCallback((stage: PipelineStage) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stageStatus: {
          ...prev.stageStatus,
          [stage]: 'completed'
        },
        stageApprovals: {
          ...prev.stageApprovals,
          [stage]: prev.stageApprovals[stage] === 'approved' ? 'approved' : 'pending'
        },
        updatedAt: new Date()
      };
    });
  }, []);

  const markStageInProgress = useCallback((stage: PipelineStage) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stageStatus: {
          ...prev.stageStatus,
          [stage]: 'in_progress'
        },
        stageApprovals: {
          ...prev.stageApprovals,
          [stage]: prev.stageApprovals[stage] === 'approved' ? 'approved' : 'pending'
        },
        updatedAt: new Date()
      };
    });
  }, []);

  const approveStage = useCallback((stage: PipelineStage, actor?: { id: string; name: string }, notes?: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stageApprovals: {
          ...prev.stageApprovals,
          [stage]: 'approved'
        },
        approvalHistory: [
          ...prev.approvalHistory,
          {
            stage,
            status: 'approved',
            approvedBy: actor,
            approvedAt: new Date(),
            notes
          }
        ],
        updatedAt: new Date()
      };
    });
  }, []);

  const rejectStage = useCallback((stage: PipelineStage, actor?: { id: string; name: string }, notes?: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stageApprovals: {
          ...prev.stageApprovals,
          [stage]: 'rejected'
        },
        approvalHistory: [
          ...prev.approvalHistory,
          {
            stage,
            status: 'rejected',
            approvedBy: actor,
            approvedAt: new Date(),
            notes
          }
        ],
        updatedAt: new Date()
      };
    });
  }, []);

  const isStageComplete = useCallback((stage: PipelineStage) => {
    return project?.stageStatus[stage] === 'completed';
  }, [project]);

  const isStageApproved = useCallback((stage: PipelineStage) => {
    return project?.stageApprovals[stage] === 'approved';
  }, [project]);

  const isStageAccessible = useCallback((stage: PipelineStage) => {
    if (!project) return stage === 'ingest';

    const stageIndex = getStageIndex(stage);
    if (stageIndex === 0) return true;

    // Can access if previous stage is complete or if this stage has been started
    const prevStage = PIPELINE_STAGES[stageIndex - 1];
    return project.stageStatus[prevStage.id] === 'completed' || project.stageStatus[stage] !== 'pending';
  }, [project, getStageIndex]);

  const value = useMemo<GeniePipelineContextType>(() => ({
    currentStage,
    project,
    isLoading,
    error,
    autopilotStatus,
    autopilotProgress,
    setStage,
    nextStage,
    prevStage,
    canAdvance,
    canGoBack,
    createProject,
    updateProject,
    loadProject,
    registerStageActions,
    invokeStageAction,
    autopilotEnabled,
    setAutopilotEnabled,
    setAutopilotStatus,
    setAutopilotProgress,
    clearProject,
    markStageComplete,
    markStageInProgress,
    approveStage,
    rejectStage,
    setLoading: setIsLoading,
    setError,
    getStageIndex,
    getStageConfig,
    isStageComplete,
    isStageApproved,
    isStageAccessible
  }), [
    currentStage,
    project,
    isLoading,
    error,
    autopilotStatus,
    autopilotProgress,
    setStage,
    nextStage,
    prevStage,
    canAdvance,
    canGoBack,
    createProject,
    updateProject,
    loadProject,
    registerStageActions,
    invokeStageAction,
    autopilotEnabled,
    setAutopilotEnabled,
    setAutopilotStatus,
    setAutopilotProgress,
    clearProject,
    markStageComplete,
    markStageInProgress,
    approveStage,
    rejectStage,
    getStageIndex,
    getStageConfig,
    isStageComplete,
    isStageApproved,
    isStageAccessible
  ]);

  return (
    <GeniePipelineContext.Provider value={value}>
      {children}
    </GeniePipelineContext.Provider>
  );
}

export function useGeniePipeline() {
  const context = useContext(GeniePipelineContext);
  if (!context) {
    throw new Error('useGeniePipeline must be used within a GeniePipelineProvider');
  }
  return context;
}

export default GeniePipelineContext;
