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
import type { ELSImplementation, ELSEnrollmentRule } from '@/types/els';

const COLLECTION_NAME = 'elsImplementation';

const orgCollection = (orgId: string) =>
  collection(db, 'organizations', orgId, COLLECTION_NAME);

const orgDoc = (orgId: string, docId: string) =>
  doc(db, 'organizations', orgId, COLLECTION_NAME, docId);

/**
 * ELS Implementation Service
 * Manages course implementation for ELS projects (Phase 5: Implement)
 * Integrates with existing LMS services
 */
export const elsImplementationService = {
  /**
   * Create implementation
   */
  create: async (
    orgId: string,
    projectId: string,
    designId: string,
    data: Partial<ELSImplementation>
  ): Promise<ELSImplementation> => {
    const implRef = doc(orgCollection(orgId));
    
    const newImplementation: ELSImplementation = {
      id: implRef.id,
      orgId,
      projectId,
      designId,
      enrollmentRules: data.enrollmentRules || [],
      schedule: data.schedule || {
        selfEnrollment: false,
        allowLateEnrollment: true
      },
      notifications: data.notifications || {
        enrollmentNotification: true,
        reminderDays: [7, 3, 1],
        completionNotification: true,
        overdueAlerts: true,
        managerNotifications: true
      },
      assignedTutors: data.assignedTutors || [],
      personalisation: data.personalisation || {
        adaptivePacing: true,
        prerequisiteEnforcement: false,
        remedialPaths: true,
        advancedPaths: false
      },
      enrollmentStats: {
        enrolledCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        overdueCount: 0
      },
      status: 'scheduled',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await setDoc(implRef, newImplementation);
    return newImplementation;
  },

  /**
   * Get implementation by ID
   */
  get: async (orgId: string, implementationId: string): Promise<ELSImplementation | null> => {
    const docSnap = await getDoc(orgDoc(orgId, implementationId));
    return docSnap.exists() ? (docSnap.data() as ELSImplementation) : null;
  },

  /**
   * Get implementation by project ID
   */
  getByProject: async (orgId: string, projectId: string): Promise<ELSImplementation | null> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as ELSImplementation);
  },

  /**
   * Update implementation
   */
  update: async (
    orgId: string,
    implementationId: string,
    updates: Partial<Omit<ELSImplementation, 'id' | 'orgId' | 'projectId' | 'createdAt'>>
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, implementationId), {
      ...updates,
      updatedAt: Date.now()
    });
  },

  /**
   * Add enrollment rule
   */
  addEnrollmentRule: async (
    orgId: string,
    implementationId: string,
    rule: Omit<ELSEnrollmentRule, 'id'>
  ): Promise<string> => {
    const impl = await elsImplementationService.get(orgId, implementationId);
    if (!impl) throw new Error('Implementation not found');

    const newRule: ELSEnrollmentRule = {
      id: `rule_${Date.now()}`,
      ...rule
    };

    await updateDoc(orgDoc(orgId, implementationId), {
      enrollmentRules: [...impl.enrollmentRules, newRule],
      updatedAt: Date.now()
    });

    return newRule.id;
  },

  /**
   * Update enrollment rule
   */
  updateEnrollmentRule: async (
    orgId: string,
    implementationId: string,
    ruleId: string,
    updates: Partial<ELSEnrollmentRule>
  ): Promise<void> => {
    const impl = await elsImplementationService.get(orgId, implementationId);
    if (!impl) throw new Error('Implementation not found');

    const updatedRules = impl.enrollmentRules.map(r =>
      r.id === ruleId ? { ...r, ...updates } : r
    );

    await updateDoc(orgDoc(orgId, implementationId), {
      enrollmentRules: updatedRules,
      updatedAt: Date.now()
    });
  },

  /**
   * Remove enrollment rule
   */
  removeEnrollmentRule: async (
    orgId: string,
    implementationId: string,
    ruleId: string
  ): Promise<void> => {
    const impl = await elsImplementationService.get(orgId, implementationId);
    if (!impl) throw new Error('Implementation not found');

    await updateDoc(orgDoc(orgId, implementationId), {
      enrollmentRules: impl.enrollmentRules.filter(r => r.id !== ruleId),
      updatedAt: Date.now()
    });
  },

  /**
   * Link course to implementation
   */
  linkCourse: async (
    orgId: string,
    implementationId: string,
    courseId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, implementationId), {
      courseId,
      updatedAt: Date.now()
    });
  },

  /**
   * Link learning path to implementation
   */
  linkLearningPath: async (
    orgId: string,
    implementationId: string,
    learningPathId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, implementationId), {
      learningPathId,
      updatedAt: Date.now()
    });
  },

  /**
   * Activate implementation
   */
  activate: async (
    orgId: string,
    implementationId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, implementationId), {
      status: 'active',
      updatedAt: Date.now()
    });
  },

  /**
   * Pause implementation
   */
  pause: async (
    orgId: string,
    implementationId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, implementationId), {
      status: 'paused',
      updatedAt: Date.now()
    });
  },

  /**
   * Complete implementation
   */
  complete: async (
    orgId: string,
    implementationId: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, implementationId), {
      status: 'completed',
      updatedAt: Date.now()
    });
  },

  /**
   * Update enrollment stats
   */
  updateEnrollmentStats: async (
    orgId: string,
    implementationId: string,
    stats: Partial<ELSImplementation['enrollmentStats']>
  ): Promise<void> => {
    const impl = await elsImplementationService.get(orgId, implementationId);
    if (!impl) throw new Error('Implementation not found');

    await updateDoc(orgDoc(orgId, implementationId), {
      enrollmentStats: { ...impl.enrollmentStats, ...stats },
      updatedAt: Date.now()
    });
  },

  /**
   * Delete implementation
   */
  delete: async (orgId: string, implementationId: string): Promise<void> => {
    await deleteDoc(orgDoc(orgId, implementationId));
  },

  /**
   * Delete by project
   */
  deleteByProject: async (orgId: string, projectId: string): Promise<void> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  },

  /**
   * Subscribe to implementation updates
   */
  subscribe: (
    orgId: string,
    implementationId: string,
    callback: (implementation: ELSImplementation | null) => void
  ): Unsubscribe => {
    return onSnapshot(
      orgDoc(orgId, implementationId),
      (doc) => {
        callback(doc.exists() ? (doc.data() as ELSImplementation) : null);
      },
      (error) => {
        console.error('Error subscribing to ELS implementation:', error);
        callback(null);
      }
    );
  },

  /**
   * Subscribe by project
   */
  subscribeByProject: (
    orgId: string,
    projectId: string,
    callback: (implementation: ELSImplementation | null) => void
  ): Unsubscribe => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.empty ? null : (snapshot.docs[0].data() as ELSImplementation));
      },
      (error) => {
        console.error('Error subscribing to ELS implementation:', error);
        callback(null);
      }
    );
  }
};
