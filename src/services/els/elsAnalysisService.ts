import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import type { ELSNeedsAnalysis, ELSSkillGap, ELSComplianceRequirement, ELSLearningObjective } from '@/types/els';

const COLLECTION_NAME = 'elsNeedsAnalysis';

const orgCollection = (orgId: string) =>
  collection(db, 'organizations', orgId, COLLECTION_NAME);

const orgDoc = (orgId: string, docId: string) =>
  doc(db, 'organizations', orgId, COLLECTION_NAME, docId);

/**
 * ELS Analysis Service
 * Manages needs analysis for ELS projects (Phase 2: Analyze)
 */
export const elsAnalysisService = {
  /**
   * Create needs analysis
   */
  create: async (
    orgId: string,
    projectId: string,
    data: Partial<ELSNeedsAnalysis>
  ): Promise<ELSNeedsAnalysis> => {
    const analysisRef = doc(orgCollection(orgId));
    
    const newAnalysis: ELSNeedsAnalysis = {
      id: analysisRef.id,
      orgId,
      projectId,
      targetAudience: data.targetAudience || {
        departments: [],
        roles: [],
        teams: [],
        individualUsers: [],
        experienceLevel: 'mixed',
        estimatedLearners: 0
      },
      skillGaps: data.skillGaps || [],
      complianceRequirements: data.complianceRequirements || [],
      learningObjectives: data.learningObjectives || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await setDoc(analysisRef, newAnalysis);
    return newAnalysis;
  },

  /**
   * Get analysis by ID
   */
  get: async (orgId: string, analysisId: string): Promise<ELSNeedsAnalysis | null> => {
    const docSnap = await getDoc(orgDoc(orgId, analysisId));
    return docSnap.exists() ? (docSnap.data() as ELSNeedsAnalysis) : null;
  },

  /**
   * Get analysis by project ID
   */
  getByProject: async (orgId: string, projectId: string): Promise<ELSNeedsAnalysis | null> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as ELSNeedsAnalysis);
  },

  /**
   * Update analysis
   */
  update: async (
    orgId: string,
    analysisId: string,
    updates: Partial<Omit<ELSNeedsAnalysis, 'id' | 'orgId' | 'projectId' | 'createdAt'>>
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, analysisId), {
      ...updates,
      updatedAt: Date.now()
    });
  },

  /**
   * Update target audience
   */
  updateTargetAudience: async (
    orgId: string,
    analysisId: string,
    targetAudience: ELSNeedsAnalysis['targetAudience']
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, analysisId), {
      targetAudience,
      updatedAt: Date.now()
    });
  },

  /**
   * Add skill gap
   */
  addSkillGap: async (
    orgId: string,
    analysisId: string,
    skillGap: Omit<ELSSkillGap, 'skillId'>
  ): Promise<string> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    const newSkillGap: ELSSkillGap = {
      skillId: `skill_${Date.now()}`,
      ...skillGap
    };

    await updateDoc(orgDoc(orgId, analysisId), {
      skillGaps: [...analysis.skillGaps, newSkillGap],
      updatedAt: Date.now()
    });

    return newSkillGap.skillId;
  },

  /**
   * Update skill gap
   */
  updateSkillGap: async (
    orgId: string,
    analysisId: string,
    skillId: string,
    updates: Partial<ELSSkillGap>
  ): Promise<void> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    const updatedSkillGaps = analysis.skillGaps.map(sg =>
      sg.skillId === skillId ? { ...sg, ...updates } : sg
    );

    await updateDoc(orgDoc(orgId, analysisId), {
      skillGaps: updatedSkillGaps,
      updatedAt: Date.now()
    });
  },

  /**
   * Remove skill gap
   */
  removeSkillGap: async (
    orgId: string,
    analysisId: string,
    skillId: string
  ): Promise<void> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    await updateDoc(orgDoc(orgId, analysisId), {
      skillGaps: analysis.skillGaps.filter(sg => sg.skillId !== skillId),
      updatedAt: Date.now()
    });
  },

  /**
   * Add compliance requirement
   */
  addComplianceRequirement: async (
    orgId: string,
    analysisId: string,
    requirement: Omit<ELSComplianceRequirement, 'id'>
  ): Promise<string> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    const newRequirement: ELSComplianceRequirement = {
      id: `req_${Date.now()}`,
      ...requirement
    };

    await updateDoc(orgDoc(orgId, analysisId), {
      complianceRequirements: [...analysis.complianceRequirements, newRequirement],
      updatedAt: Date.now()
    });

    return newRequirement.id;
  },

  /**
   * Update compliance requirement
   */
  updateComplianceRequirement: async (
    orgId: string,
    analysisId: string,
    requirementId: string,
    updates: Partial<ELSComplianceRequirement>
  ): Promise<void> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    const updatedRequirements = analysis.complianceRequirements.map(r =>
      r.id === requirementId ? { ...r, ...updates } : r
    );

    await updateDoc(orgDoc(orgId, analysisId), {
      complianceRequirements: updatedRequirements,
      updatedAt: Date.now()
    });
  },

  /**
   * Remove compliance requirement
   */
  removeComplianceRequirement: async (
    orgId: string,
    analysisId: string,
    requirementId: string
  ): Promise<void> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    await updateDoc(orgDoc(orgId, analysisId), {
      complianceRequirements: analysis.complianceRequirements.filter(r => r.id !== requirementId),
      updatedAt: Date.now()
    });
  },

  /**
   * Add learning objective
   */
  addLearningObjective: async (
    orgId: string,
    analysisId: string,
    objective: Omit<ELSLearningObjective, 'id'>
  ): Promise<string> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    const newObjective: ELSLearningObjective = {
      id: `obj_${Date.now()}`,
      ...objective
    };

    await updateDoc(orgDoc(orgId, analysisId), {
      learningObjectives: [...analysis.learningObjectives, newObjective],
      updatedAt: Date.now()
    });

    return newObjective.id;
  },

  /**
   * Update learning objective
   */
  updateLearningObjective: async (
    orgId: string,
    analysisId: string,
    objectiveId: string,
    updates: Partial<ELSLearningObjective>
  ): Promise<void> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    const updatedObjectives = analysis.learningObjectives.map(o =>
      o.id === objectiveId ? { ...o, ...updates } : o
    );

    await updateDoc(orgDoc(orgId, analysisId), {
      learningObjectives: updatedObjectives,
      updatedAt: Date.now()
    });
  },

  /**
   * Remove learning objective
   */
  removeLearningObjective: async (
    orgId: string,
    analysisId: string,
    objectiveId: string
  ): Promise<void> => {
    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (!analysis) throw new Error('Analysis not found');

    await updateDoc(orgDoc(orgId, analysisId), {
      learningObjectives: analysis.learningObjectives.filter(o => o.id !== objectiveId),
      updatedAt: Date.now()
    });
  },

  /**
   * Generate AI learning objectives from content analysis
   */
  generateObjectives: async (
    orgId: string,
    analysisId: string,
    contentIds: string[]
  ): Promise<ELSLearningObjective[]> => {
    // This would integrate with your AI service
    // For now, return placeholder
    const generatedObjectives: ELSLearningObjective[] = [
      {
        id: `obj_${Date.now()}_1`,
        description: 'Identify and mitigate common security threats in the workplace',
        taxonomy: 'understand',
        measurable: true,
        measurementCriteria: 'Score 80% or higher on security threat identification quiz',
        linkedContentIds: contentIds
      },
      {
        id: `obj_${Date.now()}_2`,
        description: 'Apply data protection principles in daily operations',
        taxonomy: 'apply',
        measurable: true,
        measurementCriteria: 'Successfully complete data handling scenario assessment',
        linkedContentIds: contentIds
      },
      {
        id: `obj_${Date.now()}_3`,
        description: 'Demonstrate effective communication in cross-functional teams',
        taxonomy: 'apply',
        measurable: true,
        measurementCriteria: 'Peer evaluation score of 4/5 or higher',
        linkedContentIds: contentIds
      }
    ];

    const analysis = await elsAnalysisService.get(orgId, analysisId);
    if (analysis) {
      await updateDoc(orgDoc(orgId, analysisId), {
        learningObjectives: [...analysis.learningObjectives, ...generatedObjectives],
        updatedAt: Date.now()
      });
    }

    return generatedObjectives;
  },

  /**
   * Delete analysis
   */
  delete: async (orgId: string, analysisId: string): Promise<void> => {
    await deleteDoc(orgDoc(orgId, analysisId));
  },

  /**
   * Delete analysis by project
   */
  deleteByProject: async (orgId: string, projectId: string): Promise<void> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  },

  /**
   * Subscribe to analysis updates
   */
  subscribe: (
    orgId: string,
    analysisId: string,
    callback: (analysis: ELSNeedsAnalysis | null) => void
  ): Unsubscribe => {
    return onSnapshot(
      orgDoc(orgId, analysisId),
      (doc) => {
        callback(doc.exists() ? (doc.data() as ELSNeedsAnalysis) : null);
      },
      (error) => {
        console.error('Error subscribing to ELS analysis:', error);
        callback(null);
      }
    );
  },

  /**
   * Subscribe to analysis by project
   */
  subscribeByProject: (
    orgId: string,
    projectId: string,
    callback: (analysis: ELSNeedsAnalysis | null) => void
  ): Unsubscribe => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.empty ? null : (snapshot.docs[0].data() as ELSNeedsAnalysis));
      },
      (error) => {
        console.error('Error subscribing to ELS analysis:', error);
        callback(null);
      }
    );
  }
};
