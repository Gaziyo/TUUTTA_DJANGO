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
import type { ELSAnalytics, ELSMetrics, ELSTimeSeriesPoint } from '@/types/els';

const COLLECTION_NAME = 'elsAnalytics';

const orgCollection = (orgId: string) =>
  collection(db, 'organizations', orgId, COLLECTION_NAME);

const orgDoc = (orgId: string, docId: string) =>
  doc(db, 'organizations', orgId, COLLECTION_NAME, docId);

/**
 * ELS Analytics Service
 * Manages analytics for ELS projects (Phase 6: Evaluate)
 * Integrates with existing LMS enrollment/progress data
 */
export const elsAnalyticsService = {
  /**
   * Create analytics record
   */
  create: async (
    orgId: string,
    projectId: string,
    implementationId: string,
    courseId?: string
  ): Promise<ELSAnalytics> => {
    const analyticsRef = doc(orgCollection(orgId));
    
    const newAnalytics: ELSAnalytics = {
      id: analyticsRef.id,
      orgId,
      projectId,
      implementationId,
      courseId,
      metrics: {
        totalLearners: 0,
        activeLearners: 0,
        completionRate: 0,
        averageScore: 0,
        averageTimeToComplete: 0,
        dropoutRate: 0
      },
      timeSeriesData: [],
      engagementMetrics: [],
      complianceMetrics: [],
      skillImprovement: [],
      departmentStats: [],
      learnerStats: [],
      updatedAt: Date.now()
    };
    
    await setDoc(analyticsRef, newAnalytics);
    return newAnalytics;
  },

  /**
   * Get analytics by ID
   */
  get: async (orgId: string, analyticsId: string): Promise<ELSAnalytics | null> => {
    const docSnap = await getDoc(orgDoc(orgId, analyticsId));
    return docSnap.exists() ? (docSnap.data() as ELSAnalytics) : null;
  },

  /**
   * Get analytics by project ID
   */
  getByProject: async (orgId: string, projectId: string): Promise<ELSAnalytics | null> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as ELSAnalytics);
  },

  /**
   * Update analytics
   */
  update: async (
    orgId: string,
    analyticsId: string,
    updates: Partial<Omit<ELSAnalytics, 'id' | 'orgId' | 'projectId'>>
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, analyticsId), {
      ...updates,
      updatedAt: Date.now()
    });
  },

  /**
   * Update metrics
   */
  updateMetrics: async (
    orgId: string,
    analyticsId: string,
    metrics: Partial<ELSMetrics>
  ): Promise<void> => {
    const analytics = await elsAnalyticsService.get(orgId, analyticsId);
    if (!analytics) throw new Error('Analytics not found');

    await updateDoc(orgDoc(orgId, analyticsId), {
      metrics: { ...analytics.metrics, ...metrics },
      updatedAt: Date.now()
    });
  },

  /**
   * Add time series data point
   */
  addTimeSeriesPoint: async (
    orgId: string,
    analyticsId: string,
    point: ELSTimeSeriesPoint
  ): Promise<void> => {
    const analytics = await elsAnalyticsService.get(orgId, analyticsId);
    if (!analytics) throw new Error('Analytics not found');

    // Check if point for this date already exists
    const existingIndex = analytics.timeSeriesData.findIndex(p => p.date === point.date);
    let updatedData: ELSTimeSeriesPoint[];

    if (existingIndex >= 0) {
      updatedData = [...analytics.timeSeriesData];
      updatedData[existingIndex] = { ...updatedData[existingIndex], ...point };
    } else {
      updatedData = [...analytics.timeSeriesData, point];
    }

    // Sort by date
    updatedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Keep only last 365 days
    if (updatedData.length > 365) {
      updatedData = updatedData.slice(-365);
    }

    await updateDoc(orgDoc(orgId, analyticsId), {
      timeSeriesData: updatedData,
      updatedAt: Date.now()
    });
  },

  /**
   * Compute analytics from enrollment data
   * This integrates with existing LMS enrollment data
   */
  computeFromEnrollments: async (
    orgId: string,
    analyticsId: string,
    enrollmentData: Array<{
      userId: string;
      status: string;
      progress: number;
      score?: number;
      startedAt?: number;
      completedAt?: number;
      departmentId?: string;
    }>
  ): Promise<ELSMetrics> => {
    const total = enrollmentData.length;
    if (total === 0) {
      return {
        totalLearners: 0,
        activeLearners: 0,
        completionRate: 0,
        averageScore: 0,
        averageTimeToComplete: 0,
        dropoutRate: 0
      };
    }

    const completed = enrollmentData.filter(e => e.status === 'completed');
    const inProgress = enrollmentData.filter(e => e.status === 'in_progress');
    const notStarted = enrollmentData.filter(e => e.status === 'not_started');

    // Calculate average score from completed enrollments
    const scores = completed.map(e => e.score || 0).filter(s => s > 0);
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Calculate average time to complete
    const completionTimes = completed
      .filter(e => e.startedAt && e.completedAt)
      .map(e => e.completedAt! - e.startedAt!);
    const averageTimeToComplete = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / (1000 * 60) // Convert to minutes
      : 0;

    const metrics: ELSMetrics = {
      totalLearners: total,
      activeLearners: inProgress.length,
      completionRate: (completed.length / total) * 100,
      averageScore,
      averageTimeToComplete,
      dropoutRate: (notStarted.length / total) * 100
    };

    await elsAnalyticsService.updateMetrics(orgId, analyticsId, metrics);
    return metrics;
  },

  /**
   * Delete analytics
   */
  delete: async (orgId: string, analyticsId: string): Promise<void> => {
    await deleteDoc(orgDoc(orgId, analyticsId));
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
   * Subscribe to analytics updates
   */
  subscribe: (
    orgId: string,
    analyticsId: string,
    callback: (analytics: ELSAnalytics | null) => void
  ): Unsubscribe => {
    return onSnapshot(
      orgDoc(orgId, analyticsId),
      (doc) => {
        callback(doc.exists() ? (doc.data() as ELSAnalytics) : null);
      },
      (error) => {
        console.error('Error subscribing to ELS analytics:', error);
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
    callback: (analytics: ELSAnalytics | null) => void
  ): Unsubscribe => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.empty ? null : (snapshot.docs[0].data() as ELSAnalytics));
      },
      (error) => {
        console.error('Error subscribing to ELS analytics:', error);
        callback(null);
      }
    );
  },

  /**
   * Get analytics summary for dashboard
   */
  getDashboardSummary: async (orgId: string): Promise<{
    totalProjects: number;
    activeImplementations: number;
    totalLearners: number;
    averageCompletionRate: number;
  }> => {
    const q = query(orgCollection(orgId));
    const snapshot = await getDocs(q);
    
    const allAnalytics = snapshot.docs.map(d => d.data() as ELSAnalytics);
    
    if (allAnalytics.length === 0) {
      return {
        totalProjects: 0,
        activeImplementations: 0,
        totalLearners: 0,
        averageCompletionRate: 0
      };
    }

    const totalLearners = allAnalytics.reduce((sum, a) => sum + a.metrics.totalLearners, 0);
    const avgCompletionRate = allAnalytics.reduce((sum, a) => sum + a.metrics.completionRate, 0) / allAnalytics.length;

    return {
      totalProjects: allAnalytics.length,
      activeImplementations: allAnalytics.filter(a => a.metrics.activeLearners > 0).length,
      totalLearners,
      averageCompletionRate: Math.round(avgCompletionRate * 10) / 10
    };
  }
};
