import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FileUpload } from '../types';
import { useStore } from '../store';
import { useLMSStore } from '../store/lmsStore';
import { addGuidedProgramVersion, loadGuidedPrograms, saveGuidedProgram, toGuidedUserError } from '../services/guidedService';
import { userService } from '../services/userService';
import { auth } from '../lib/firebase';

export type GuidedStage = 'ingest' | 'analyze' | 'design' | 'develop' | 'implement' | 'evaluate';

export interface GuidedStageConfig {
  id: GuidedStage;
  label: string;
  shortLabel: string;
}

export const GUIDED_STAGES: GuidedStageConfig[] = [
  { id: 'ingest', label: 'Analyze', shortLabel: 'Ingest' },
  { id: 'analyze', label: 'Analyze', shortLabel: 'Analyze' },
  { id: 'design', label: 'Design', shortLabel: 'Design' },
  { id: 'develop', label: 'Develop', shortLabel: 'Develop' },
  { id: 'implement', label: 'Implement', shortLabel: 'Implement' },
  { id: 'evaluate', label: 'Evaluate', shortLabel: 'Evaluate' }
];

export interface GuidedProgram {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  sources: FileUpload[];
  analysis?: { roles: string[]; gaps: string[] };
  design?: {
    objectives: string[];
    objectiveConfidence?: number;
    objectiveExtraction?: Array<{
      text: string;
      rule: string;
      sourceId?: string;
    }>;
    sourceConfidence?: Array<{
      sourceId: string;
      sourceName: string;
      confidence: number;
      matched: string[];
    }>;
  };
  develop?: { draftId?: string; lessonCount?: number };
  implement?: { enrollmentCount?: number; cohorts?: string[] };
  evaluate?: { metrics?: string[]; complianceScore?: number };
  stageStatus: Record<GuidedStage, 'pending' | 'in_progress' | 'completed'>;
}

interface GuidedState {
  currentStage: GuidedStage;
  program: GuidedProgram | null;
  isPersisting: boolean;
  persistenceError: string | null;
  lastSavedAt: Date | null;
}

interface GuidedActions {
  createProgram: (name?: string) => GuidedProgram;
  updateProgram: (updates: Partial<GuidedProgram>) => void;
  setStage: (stage: GuidedStage) => void;
  markStageComplete: (stage: GuidedStage) => void;
  markStageInProgress: (stage: GuidedStage) => void;
  getStageConfig: (stage: GuidedStage) => GuidedStageConfig | undefined;
  isStageComplete: (stage: GuidedStage) => boolean;
  clearPersistenceError: () => void;
}

type GuidedContextType = GuidedState & GuidedActions;

const GuidedPipelineContext = createContext<GuidedContextType | null>(null);

function createInitialProgram(name = 'Guided Program'): GuidedProgram {
  const now = new Date();
  return {
    id: `guided_${now.getTime()}`,
    name,
    createdAt: now,
    updatedAt: now,
    sources: [],
    stageStatus: {
      ingest: 'pending',
      analyze: 'pending',
      design: 'pending',
      develop: 'pending',
      implement: 'pending',
      evaluate: 'pending'
    }
  };
}

export function GuidedPipelineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const { currentOrg, currentMember, setCurrentMember } = useLMSStore();
  const [currentStage, setCurrentStage] = useState<GuidedStage>('ingest');
  const [program, setProgram] = useState<GuidedProgram | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [membershipReady, setMembershipReady] = useState(false);

  useEffect(() => {
    setMembershipReady(false);
  }, [currentOrg?.id, user?.id]);

  const ensureGuidedMembership = useCallback(async () => {
    if (!currentOrg?.id || !user?.id) return;
    if (membershipReady) return;

    if (!auth.currentUser || auth.currentUser.uid !== user.id) {
      throw new Error('Please sign in and try again.');
    }

    const membershipId = `${currentOrg.id}_${user.id}`;
    let member = await userService.getMember(membershipId);

    if (!member) {
      member = await userService.addMember({
        odId: currentOrg.id,
        orgId: currentOrg.id,
        userId: user.id,
        email: user.email || `${user.id}@local.tuutta`,
        name: user.name || 'Learner',
        role: currentMember?.role || 'learner',
        status: 'active',
        joinedAt: Date.now()
      });
    }

    if (!currentMember || currentMember.id !== member.id) {
      setCurrentMember(member);
    }
    setMembershipReady(true);
  }, [
    currentOrg?.id,
    currentMember,
    membershipReady,
    setCurrentMember,
    user?.email,
    user?.id,
    user?.name
  ]);

  const persist = useCallback(async (nextProgram: GuidedProgram, versionStage?: GuidedStage) => {
    if (!currentOrg?.id || !user?.id) return;
    setIsPersisting(true);
    try {
      await ensureGuidedMembership();
      await saveGuidedProgram(currentOrg.id, user.id, nextProgram);
      if (versionStage) {
        await addGuidedProgramVersion(currentOrg.id, nextProgram, versionStage);
      }
      setLastSavedAt(new Date());
      setPersistenceError(null);
    } catch (error) {
      setPersistenceError(toGuidedUserError(error));
    } finally {
      setIsPersisting(false);
    }
  }, [currentOrg?.id, ensureGuidedMembership, user?.id]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentOrg?.id || !user?.id) return;
      try {
        await ensureGuidedMembership();
        const programs = await loadGuidedPrograms(currentOrg.id, user.id);
        if (!mounted) return;
        if (programs.length) {
          const latest = programs[0];
          setProgram(prev => {
            if (prev?.id === latest.id && prev.updatedAt?.getTime?.() === latest.updatedAt?.getTime?.()) {
              return prev;
            }
            return latest;
          });
        }
      } catch (error) {
        if (!mounted) return;
        setPersistenceError(toGuidedUserError(error));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentOrg?.id, ensureGuidedMembership, user?.id]);

  const createProgram = useCallback((name?: string) => {
    const newProgram = createInitialProgram(name);
    setProgram(newProgram);
    setCurrentStage('ingest');
    void persist(newProgram);
    return newProgram;
  }, [persist]);

  const updateProgram = useCallback((updates: Partial<GuidedProgram>) => {
    setProgram(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates, updatedAt: new Date() };
      void persist(next);
      return next;
    });
  }, [persist]);

  const setStage = useCallback((stage: GuidedStage) => {
    setCurrentStage(stage);
  }, []);

  const markStageComplete = useCallback((stage: GuidedStage) => {
    setProgram(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        stageStatus: { ...prev.stageStatus, [stage]: 'completed' },
        updatedAt: new Date()
      };
      void persist(next, stage);
      return next;
    });
  }, [persist]);

  const markStageInProgress = useCallback((stage: GuidedStage) => {
    setProgram(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        stageStatus: { ...prev.stageStatus, [stage]: 'in_progress' },
        updatedAt: new Date()
      };
      void persist(next);
      return next;
    });
  }, [persist]);

  const getStageConfig = useCallback((stage: GuidedStage) => {
    return GUIDED_STAGES.find(item => item.id === stage);
  }, []);

  const isStageComplete = useCallback((stage: GuidedStage) => {
    return program?.stageStatus[stage] === 'completed';
  }, [program]);

  const clearPersistenceError = useCallback(() => {
    setPersistenceError(null);
  }, []);

  const value = useMemo<GuidedContextType>(() => ({
    currentStage,
    program,
    isPersisting,
    persistenceError,
    lastSavedAt,
    createProgram,
    updateProgram,
    setStage,
    markStageComplete,
    markStageInProgress,
    getStageConfig,
    isStageComplete,
    clearPersistenceError
  }), [
    currentStage,
    program,
    isPersisting,
    persistenceError,
    lastSavedAt,
    createProgram,
    updateProgram,
    setStage,
    markStageComplete,
    markStageInProgress,
    getStageConfig,
    isStageComplete,
    clearPersistenceError
  ]);

  return (
    <GuidedPipelineContext.Provider value={value}>
      {children}
    </GuidedPipelineContext.Provider>
  );
}

export function useGuidedPipeline() {
  const ctx = useContext(GuidedPipelineContext);
  if (!ctx) {
    throw new Error('useGuidedPipeline must be used within a GuidedPipelineProvider');
  }
  return ctx;
}

export default GuidedPipelineContext;
