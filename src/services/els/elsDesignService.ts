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
import type { ELSCourseDesign, ELSModule, ELSUnit } from '@/types/els';

const COLLECTION_NAME = 'elsCourseDesign';

const orgCollection = (orgId: string) =>
  collection(db, 'organizations', orgId, COLLECTION_NAME);

const orgDoc = (orgId: string, docId: string) =>
  doc(db, 'organizations', orgId, COLLECTION_NAME, docId);

/**
 * ELS Design Service
 * Manages course design for ELS projects (Phase 3: Design)
 */
export const elsDesignService = {
  /**
   * Create course design
   */
  create: async (
    orgId: string,
    projectId: string,
    analysisId: string,
    data: Partial<ELSCourseDesign>
  ): Promise<ELSCourseDesign> => {
    const designRef = doc(orgCollection(orgId));
    
    const newDesign: ELSCourseDesign = {
      id: designRef.id,
      orgId,
      projectId,
      analysisId,
      title: data.title || 'Untitled Course',
      description: data.description || '',
      shortDescription: data.shortDescription,
      estimatedDuration: data.estimatedDuration || 0,
      difficulty: data.difficulty || 'beginner',
      category: data.category,
      tags: data.tags || [],
      modules: data.modules || [],
      learningObjectiveIds: data.learningObjectiveIds || [],
      instructionalStrategies: data.instructionalStrategies || {
        practiceActivities: true,
        groupDiscussions: false,
        teachBackTasks: false,
        caseStudies: true,
        simulations: false
      },
      adultLearningPrinciples: data.adultLearningPrinciples || {
        practicalRelevance: true,
        selfDirected: true,
        experiential: true,
        problemCentered: false
      },
      taxonomyDistribution: data.taxonomyDistribution || {
        remember: 10,
        understand: 20,
        apply: 30,
        analyze: 20,
        evaluate: 15,
        create: 5
      },
      prerequisiteCourseIds: data.prerequisiteCourseIds || [],
      requiredSkills: data.requiredSkills || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await setDoc(designRef, newDesign);
    return newDesign;
  },

  /**
   * Get design by ID
   */
  get: async (orgId: string, designId: string): Promise<ELSCourseDesign | null> => {
    const docSnap = await getDoc(orgDoc(orgId, designId));
    return docSnap.exists() ? (docSnap.data() as ELSCourseDesign) : null;
  },

  /**
   * Get design by project ID
   */
  getByProject: async (orgId: string, projectId: string): Promise<ELSCourseDesign | null> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as ELSCourseDesign);
  },

  /**
   * Update design
   */
  update: async (
    orgId: string,
    designId: string,
    updates: Partial<Omit<ELSCourseDesign, 'id' | 'orgId' | 'projectId' | 'createdAt'>>
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, designId), {
      ...updates,
      updatedAt: Date.now()
    });
  },

  /**
   * Add module
   */
  addModule: async (
    orgId: string,
    designId: string,
    module: Omit<ELSModule, 'id'>
  ): Promise<string> => {
    const design = await elsDesignService.get(orgId, designId);
    if (!design) throw new Error('Design not found');

    const newModule: ELSModule = {
      id: `mod_${Date.now()}`,
      ...module,
      order: design.modules.length
    };

    await updateDoc(orgDoc(orgId, designId), {
      modules: [...design.modules, newModule],
      updatedAt: Date.now()
    });

    return newModule.id;
  },

  /**
   * Update module
   */
  updateModule: async (
    orgId: string,
    designId: string,
    moduleId: string,
    updates: Partial<ELSModule>
  ): Promise<void> => {
    const design = await elsDesignService.get(orgId, designId);
    if (!design) throw new Error('Design not found');

    const updatedModules = design.modules.map(m =>
      m.id === moduleId ? { ...m, ...updates } : m
    );

    await updateDoc(orgDoc(orgId, designId), {
      modules: updatedModules,
      updatedAt: Date.now()
    });
  },

  /**
   * Remove module
   */
  removeModule: async (
    orgId: string,
    designId: string,
    moduleId: string
  ): Promise<void> => {
    const design = await elsDesignService.get(orgId, designId);
    if (!design) throw new Error('Design not found');

    const filteredModules = design.modules.filter(m => m.id !== moduleId);
    // Reorder remaining modules
    const reorderedModules = filteredModules.map((m, idx) => ({ ...m, order: idx }));

    await updateDoc(orgDoc(orgId, designId), {
      modules: reorderedModules,
      updatedAt: Date.now()
    });
  },

  /**
   * Reorder modules
   */
  reorderModules: async (
    orgId: string,
    designId: string,
    moduleIds: string[]
  ): Promise<void> => {
    const design = await elsDesignService.get(orgId, designId);
    if (!design) throw new Error('Design not found');

    const moduleMap = new Map(design.modules.map(m => [m.id, m]));
    const reorderedModules = moduleIds
      .map(id => moduleMap.get(id))
      .filter((m): m is ELSModule => !!m)
      .map((m, idx) => ({ ...m, order: idx }));

    await updateDoc(orgDoc(orgId, designId), {
      modules: reorderedModules,
      updatedAt: Date.now()
    });
  },

  /**
   * Add unit to module
   */
  addUnit: async (
    orgId: string,
    designId: string,
    moduleId: string,
    unit: Omit<ELSUnit, 'id'>
  ): Promise<string> => {
    const design = await elsDesignService.get(orgId, designId);
    if (!design) throw new Error('Design not found');

    const moduleIndex = design.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) throw new Error('Module not found');

    const newUnit: ELSUnit = {
      id: `unit_${Date.now()}`,
      ...unit,
      order: design.modules[moduleIndex].units.length
    };

    const updatedModules = [...design.modules];
    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      units: [...updatedModules[moduleIndex].units, newUnit]
    };

    await updateDoc(orgDoc(orgId, designId), {
      modules: updatedModules,
      updatedAt: Date.now()
    });

    return newUnit.id;
  },

  /**
   * Update unit
   */
  updateUnit: async (
    orgId: string,
    designId: string,
    moduleId: string,
    unitId: string,
    updates: Partial<ELSUnit>
  ): Promise<void> => {
    const design = await elsDesignService.get(orgId, designId);
    if (!design) throw new Error('Design not found');

    const updatedModules = design.modules.map(m => {
      if (m.id !== moduleId) return m;
      return {
        ...m,
        units: m.units.map(u => u.id === unitId ? { ...u, ...updates } : u)
      };
    });

    await updateDoc(orgDoc(orgId, designId), {
      modules: updatedModules,
      updatedAt: Date.now()
    });
  },

  /**
   * Remove unit
   */
  removeUnit: async (
    orgId: string,
    designId: string,
    moduleId: string,
    unitId: string
  ): Promise<void> => {
    const design = await elsDesignService.get(orgId, designId);
    if (!design) throw new Error('Design not found');

    const updatedModules = design.modules.map(m => {
      if (m.id !== moduleId) return m;
      const filteredUnits = m.units.filter(u => u.id !== unitId);
      return {
        ...m,
        units: filteredUnits.map((u, idx) => ({ ...u, order: idx }))
      };
    });

    await updateDoc(orgDoc(orgId, designId), {
      modules: updatedModules,
      updatedAt: Date.now()
    });
  },

  /**
   * Delete design
   */
  delete: async (orgId: string, designId: string): Promise<void> => {
    await deleteDoc(orgDoc(orgId, designId));
  },

  /**
   * Delete design by project
   */
  deleteByProject: async (orgId: string, projectId: string): Promise<void> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  },

  /**
   * Subscribe to design updates
   */
  subscribe: (
    orgId: string,
    designId: string,
    callback: (design: ELSCourseDesign | null) => void
  ): Unsubscribe => {
    return onSnapshot(
      orgDoc(orgId, designId),
      (doc) => {
        callback(doc.exists() ? (doc.data() as ELSCourseDesign) : null);
      },
      (error) => {
        console.error('Error subscribing to ELS design:', error);
        callback(null);
      }
    );
  },

  /**
   * Subscribe to design by project
   */
  subscribeByProject: (
    orgId: string,
    projectId: string,
    callback: (design: ELSCourseDesign | null) => void
  ): Unsubscribe => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.empty ? null : (snapshot.docs[0].data() as ELSCourseDesign));
      },
      (error) => {
        console.error('Error subscribing to ELS design:', error);
        callback(null);
      }
    );
  }
};
