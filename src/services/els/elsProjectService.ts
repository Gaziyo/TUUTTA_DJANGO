import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  arrayUnion,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import type { ELSProject, ELSPhase, ELSPhaseStatus } from '@/types/els';

const COLLECTIONS = {
  ELS_PROJECTS: 'elsProjects',
  ELS_CONTENT: 'elsContent',
  ELS_ANALYSIS: 'elsNeedsAnalysis',
  ELS_DESIGN: 'elsCourseDesign',
  ELS_AI_GENERATION: 'elsAIGeneration',
  ELS_IMPLEMENTATION: 'elsImplementation',
  ELS_ANALYTICS: 'elsAnalytics',
  ELS_GOVERNANCE: 'elsGovernance'
};

// Organization-scoped collection helpers
const orgCollection = (orgId: string, name: string) =>
  collection(db, 'organizations', orgId, name);

const orgDoc = (orgId: string, name: string, docId: string) =>
  doc(db, 'organizations', orgId, name, docId);

/**
 * ELS Project Service
 * Manages the lifecycle of ELS (Enterprise Learning System) projects
 */
export const elsProjectService = {
  /**
   * Create a new ELS project
   */
  create: async (
    orgId: string,
    userId: string,
    data: { name: string; description?: string }
  ): Promise<ELSProject> => {
    const projectRef = doc(orgCollection(orgId, COLLECTIONS.ELS_PROJECTS));
    
    const initialPhaseStatus: ELSPhaseStatus = {
      status: 'pending'
    };
    
    const newProject: ELSProject = {
      id: projectRef.id,
      orgId,
      name: data.name,
      description: data.description || '',
      status: 'draft',
      phases: {
        ingest: { ...initialPhaseStatus },
        analyze: { ...initialPhaseStatus },
        design: { ...initialPhaseStatus },
        develop: { ...initialPhaseStatus },
        implement: { ...initialPhaseStatus },
        evaluate: { ...initialPhaseStatus },
        personalize: { ...initialPhaseStatus },
        portal: { ...initialPhaseStatus },
        govern: { ...initialPhaseStatus }
      },
      currentPhase: 'ingest',
      createdCourseIds: [],
      createdLearningPathIds: [],
      createdAssessmentIds: [],
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: userId
    };
    
    await setDoc(projectRef, newProject);
    return newProject;
  },

  /**
   * Get a project by ID
   */
  get: async (orgId: string, projectId: string): Promise<ELSProject | null> => {
    const docSnap = await getDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId));
    return docSnap.exists() ? (docSnap.data() as ELSProject) : null;
  },

  /**
   * Get multiple projects by IDs
   */
  getMany: async (orgId: string, projectIds: string[]): Promise<ELSProject[]> => {
    if (projectIds.length === 0) return [];
    
    const projects: ELSProject[] = [];
    // Firestore has a limit of 10 items for 'in' queries
    const batchSize = 10;
    
    for (let i = 0; i < projectIds.length; i += batchSize) {
      const batch = projectIds.slice(i, i + batchSize);
      const q = query(
        orgCollection(orgId, COLLECTIONS.ELS_PROJECTS),
        where('id', 'in', batch)
      );
      const snapshot = await getDocs(q);
      projects.push(...snapshot.docs.map(d => d.data() as ELSProject));
    }
    
    return projects;
  },

  /**
   * List all projects for an organization
   */
  list: async (orgId: string, options?: {
    status?: ELSProject['status'];
    createdBy?: string;
    limit?: number;
  }): Promise<ELSProject[]> => {
    let q = query(
      orgCollection(orgId, COLLECTIONS.ELS_PROJECTS),
      orderBy('updatedAt', 'desc')
    );

    if (options?.status) {
      q = query(q, where('status', '==', options.status));
    }

    if (options?.createdBy) {
      q = query(q, where('createdBy', '==', options.createdBy));
    }

    const snapshot = await getDocs(q);
    let projects = snapshot.docs.map(d => d.data() as ELSProject);

    if (options?.limit) {
      projects = projects.slice(0, options.limit);
    }

    return projects;
  },

  /**
   * Update a project
   */
  update: async (
    orgId: string,
    projectId: string,
    userId: string,
    updates: Partial<Omit<ELSProject, 'id' | 'orgId' | 'createdAt' | 'createdBy'>>
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      ...updates,
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  /**
   * Update a phase status
   */
  updatePhase: async (
    orgId: string,
    projectId: string,
    userId: string,
    phase: ELSPhase,
    status: Partial<ELSPhaseStatus>
  ): Promise<void> => {
    const updates: Record<string, unknown> = {
      [`phases.${phase}`]: status,
      updatedAt: Date.now(),
      lastModifiedBy: userId
    };

    // Auto-update current phase if completing
    if (status.status === 'completed') {
      const phaseOrder: ELSPhase[] = ['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate', 'personalize', 'portal', 'govern'];
      const currentIndex = phaseOrder.indexOf(phase);
      if (currentIndex < phaseOrder.length - 1) {
        updates.currentPhase = phaseOrder[currentIndex + 1];
        updates[`phases.${phaseOrder[currentIndex + 1]}.status`] = 'pending';
      }
    }

    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), updates);
  },

  /**
   * Start a phase
   */
  startPhase: async (
    orgId: string,
    projectId: string,
    userId: string,
    phase: ELSPhase
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      [`phases.${phase}.status`]: 'in_progress',
      [`phases.${phase}.startedAt`]: Date.now(),
      currentPhase: phase,
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  /**
   * Complete a phase
   */
  completePhase: async (
    orgId: string,
    projectId: string,
    userId: string,
    phase: ELSPhase,
    phaseData?: unknown
  ): Promise<void> => {
    const updates: Record<string, unknown> = {
      [`phases.${phase}.status`]: 'completed',
      [`phases.${phase}.completedAt`]: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: userId
    };

    if (phaseData) {
      updates[`phases.${phase}.data`] = phaseData;
    }

    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), updates);
  },

  /**
   * Delete a project and all related data
   */
  delete: async (orgId: string, projectId: string): Promise<void> => {
    const batch = writeBatch(db);

    // Delete project
    batch.delete(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId));

    // Delete all related collections
    const collections = Object.values(COLLECTIONS).filter(c => c !== COLLECTIONS.ELS_PROJECTS);

    for (const colName of collections) {
      const q = query(orgCollection(orgId, colName), where('projectId', '==', projectId));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => batch.delete(d.ref));
    }

    await batch.commit();
  },

  /**
   * Link a created course to the project
   */
  linkCourse: async (
    orgId: string,
    projectId: string,
    courseId: string,
    userId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      createdCourseIds: arrayUnion(courseId),
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  /**
   * Link a learning path to the project
   */
  linkLearningPath: async (
    orgId: string,
    projectId: string,
    learningPathId: string,
    userId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      createdLearningPathIds: arrayUnion(learningPathId),
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  /**
   * Link an assessment to the project
   */
  linkAssessment: async (
    orgId: string,
    projectId: string,
    assessmentId: string,
    userId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      createdAssessmentIds: arrayUnion(assessmentId),
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  /**
   * Archive a project
   */
  archive: async (
    orgId: string,
    projectId: string,
    userId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      status: 'archived',
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  /**
   * Activate a project (from draft to active)
   */
  activate: async (
    orgId: string,
    projectId: string,
    userId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId), {
      status: 'active',
      updatedAt: Date.now(),
      lastModifiedBy: userId
    });
  },

  /**
   * Subscribe to real-time project updates
   */
  subscribe: (
    orgId: string,
    projectId: string,
    callback: (project: ELSProject | null) => void
  ): Unsubscribe => {
    return onSnapshot(
      orgDoc(orgId, COLLECTIONS.ELS_PROJECTS, projectId),
      (doc) => {
        callback(doc.exists() ? (doc.data() as ELSProject) : null);
      },
      (error) => {
        console.error('Error subscribing to ELS project:', error);
        callback(null);
      }
    );
  },

  /**
   * Subscribe to all projects for an organization
   */
  subscribeToList: (
    orgId: string,
    callback: (projects: ELSProject[]) => void
  ): Unsubscribe => {
    const q = query(
      orgCollection(orgId, COLLECTIONS.ELS_PROJECTS),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const projects = snapshot.docs.map(d => d.data() as ELSProject);
        callback(projects);
      },
      (error) => {
        console.error('Error subscribing to ELS projects:', error);
        callback([]);
      }
    );
  }
};
