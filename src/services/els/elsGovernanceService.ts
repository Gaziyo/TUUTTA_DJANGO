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
import type { ELSGovernance, ELSAuditLogEntry } from '@/types/els';
import { observabilityService } from '@/services/observabilityService';

const COLLECTION_NAME = 'elsGovernance';
const AUDIT_COLLECTION_NAME = 'elsAuditLogs';

const orgCollection = (orgId: string) =>
  collection(db, 'organizations', orgId, COLLECTION_NAME);

const orgDoc = (orgId: string, docId: string) =>
  doc(db, 'organizations', orgId, COLLECTION_NAME, docId);

const auditCollection = (orgId: string) =>
  collection(db, 'organizations', orgId, AUDIT_COLLECTION_NAME);

/**
 * ELS Governance Service
 * Manages governance, audit, and compliance for ELS projects (Phase 9: Govern)
 */
export const elsGovernanceService = {
  /**
   * Create governance record
   */
  create: async (
    orgId: string,
    projectId: string
  ): Promise<ELSGovernance> => {
    const governanceRef = doc(orgCollection(orgId));
    
    const newGovernance: ELSGovernance = {
      id: governanceRef.id,
      orgId,
      projectId,
      privacySettings: {
        dataRetentionPeriod: 2555, // 7 years default
        anonymizeAfterCompletion: false,
        allowDataExport: true,
        gdprCompliant: true
      },
      securitySettings: {
        requireApprovalForPublishing: true,
        approverRoles: ['org_admin', 'ld_manager'],
        contentReviewRequired: true,
        automaticArchiving: false,
        archiveAfterDays: 365,
        encryptionEnabled: true,
        accessLogEnabled: true
      },
      aiMonitoring: {
        contentReviewed: false,
        biasCheckCompleted: false
      },
      approvalWorkflow: {
        enabled: true,
        stages: [
          {
            id: 'stage_1',
            name: 'Content Review',
            order: 1,
            requiredRoles: ['ld_manager'],
            status: 'pending'
          },
          {
            id: 'stage_2',
            name: 'Final Approval',
            order: 2,
            requiredRoles: ['org_admin'],
            status: 'pending'
          }
        ]
      },
      retentionPolicy: {
        learnerDataRetention: 2555,
        assessmentDataRetention: 2555,
        auditLogRetention: 3650, // 10 years
        contentVersionRetention: 730, // 2 years
        action: 'archive'
      },
      updatedAt: Date.now()
    };
    
    await setDoc(governanceRef, newGovernance);
    return newGovernance;
  },

  /**
   * Get governance by ID
   */
  get: async (orgId: string, governanceId: string): Promise<ELSGovernance | null> => {
    const docSnap = await getDoc(orgDoc(orgId, governanceId));
    return docSnap.exists() ? (docSnap.data() as ELSGovernance) : null;
  },

  /**
   * Get governance by project ID
   */
  getByProject: async (orgId: string, projectId: string): Promise<ELSGovernance | null> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as ELSGovernance);
  },

  /**
   * Update governance
   */
  update: async (
    orgId: string,
    governanceId: string,
    updates: Partial<Omit<ELSGovernance, 'id' | 'orgId' | 'projectId'>>
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, governanceId), {
      ...updates,
      updatedAt: Date.now()
    });
  },

  /**
   * Update privacy settings
   */
  updatePrivacySettings: async (
    orgId: string,
    governanceId: string,
    settings: Partial<ELSGovernance['privacySettings']>
  ): Promise<void> => {
    const governance = await elsGovernanceService.get(orgId, governanceId);
    if (!governance) throw new Error('Governance record not found');

    await updateDoc(orgDoc(orgId, governanceId), {
      privacySettings: { ...governance.privacySettings, ...settings },
      updatedAt: Date.now()
    });
    void observabilityService.logAdminAuditEvent({
      orgId,
      actorId: 'system',
      actorName: 'ELS Governance Service',
      actorType: 'system',
      action: 'compliance_privacy_settings_updated',
      entityType: 'els_governance',
      entityId: governanceId,
      targetType: 'governance',
      targetId: governanceId,
      changes: settings
    });
  },

  /**
   * Update security settings
   */
  updateSecuritySettings: async (
    orgId: string,
    governanceId: string,
    settings: Partial<ELSGovernance['securitySettings']>
  ): Promise<void> => {
    const governance = await elsGovernanceService.get(orgId, governanceId);
    if (!governance) throw new Error('Governance record not found');

    await updateDoc(orgDoc(orgId, governanceId), {
      securitySettings: { ...governance.securitySettings, ...settings },
      updatedAt: Date.now()
    });
    void observabilityService.logAdminAuditEvent({
      orgId,
      actorId: 'system',
      actorName: 'ELS Governance Service',
      actorType: 'system',
      action: 'compliance_security_settings_updated',
      entityType: 'els_governance',
      entityId: governanceId,
      targetType: 'governance',
      targetId: governanceId,
      changes: settings
    });
  },

  /**
   * Update AI monitoring
   */
  updateAIMonitoring: async (
    orgId: string,
    governanceId: string,
    monitoring: Partial<ELSGovernance['aiMonitoring']>
  ): Promise<void> => {
    const governance = await elsGovernanceService.get(orgId, governanceId);
    if (!governance) throw new Error('Governance record not found');

    await updateDoc(orgDoc(orgId, governanceId), {
      aiMonitoring: { ...governance.aiMonitoring, ...monitoring },
      updatedAt: Date.now()
    });
  },

  /**
   * Approve workflow stage
   */
  approveStage: async (
    orgId: string,
    governanceId: string,
    stageId: string,
    userId: string,
    notes?: string
  ): Promise<void> => {
    const governance = await elsGovernanceService.get(orgId, governanceId);
    if (!governance) throw new Error('Governance record not found');

    const updatedStages = governance.approvalWorkflow.stages.map(stage => {
      if (stage.id !== stageId) return stage;
      return {
        ...stage,
        status: 'approved' as const,
        approvedBy: userId,
        approvedAt: Date.now(),
        notes
      };
    });

    await updateDoc(orgDoc(orgId, governanceId), {
      'approvalWorkflow.stages': updatedStages,
      updatedAt: Date.now()
    });
    void observabilityService.logAdminAuditEvent({
      orgId,
      actorId: userId,
      actorName: userId,
      actorType: 'admin',
      action: 'compliance_stage_approved',
      entityType: 'els_governance',
      entityId: governanceId,
      targetType: 'approval_stage',
      targetId: stageId,
      metadata: { notes }
    });
  },

  /**
   * Reject workflow stage
   */
  rejectStage: async (
    orgId: string,
    governanceId: string,
    stageId: string,
    userId: string,
    notes?: string
  ): Promise<void> => {
    const governance = await elsGovernanceService.get(orgId, governanceId);
    if (!governance) throw new Error('Governance record not found');

    const updatedStages = governance.approvalWorkflow.stages.map(stage => {
      if (stage.id !== stageId) return stage;
      return {
        ...stage,
        status: 'rejected' as const,
        approvedBy: userId,
        approvedAt: Date.now(),
        notes
      };
    });

    await updateDoc(orgDoc(orgId, governanceId), {
      'approvalWorkflow.stages': updatedStages,
      updatedAt: Date.now()
    });
    void observabilityService.logAdminAuditEvent({
      orgId,
      actorId: userId,
      actorName: userId,
      actorType: 'admin',
      action: 'compliance_stage_rejected',
      entityType: 'els_governance',
      entityId: governanceId,
      targetType: 'approval_stage',
      targetId: stageId,
      metadata: { notes }
    });
  },

  /**
   * Check if all stages are approved
   */
  isFullyApproved: async (orgId: string, governanceId: string): Promise<boolean> => {
    const governance = await elsGovernanceService.get(orgId, governanceId);
    if (!governance) return false;

    return governance.approvalWorkflow.stages.every(s => s.status === 'approved');
  },

  /**
   * Create audit log entry
   */
  createAuditLog: async (
    orgId: string,
    entry: Omit<ELSAuditLogEntry, 'id' | 'orgId'>
  ): Promise<ELSAuditLogEntry> => {
    const auditRef = doc(auditCollection(orgId));
    
    const newEntry: ELSAuditLogEntry = {
      id: auditRef.id,
      orgId,
      ...entry
    };
    
    await setDoc(auditRef, newEntry);
    return newEntry;
  },

  /**
   * Get audit logs for a project
   */
  getAuditLogs: async (
    orgId: string,
    projectId: string,
    options?: {
      limit?: number;
      startDate?: number;
      endDate?: number;
    }
  ): Promise<ELSAuditLogEntry[]> => {
    let q = query(
      auditCollection(orgId),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'desc')
    );

    if (options?.startDate) {
      q = query(q, where('timestamp', '>=', options.startDate));
    }
    if (options?.endDate) {
      q = query(q, where('timestamp', '<=', options.endDate));
    }

    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map(d => d.data() as ELSAuditLogEntry);

    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  },

  /**
   * Get audit logs for an entity
   */
  getEntityAuditLogs: async (
    orgId: string,
    entityType: ELSAuditLogEntry['entityType'],
    entityId: string
  ): Promise<ELSAuditLogEntry[]> => {
    const q = query(
      auditCollection(orgId),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ELSAuditLogEntry);
  },

  /**
   * Delete governance
   */
  delete: async (orgId: string, governanceId: string): Promise<void> => {
    await deleteDoc(orgDoc(orgId, governanceId));
  },

  /**
   * Delete by project (including audit logs)
   */
  deleteByProject: async (orgId: string, projectId: string): Promise<void> => {
    // Delete governance record
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // Delete audit logs
    const auditQ = query(auditCollection(orgId), where('projectId', '==', projectId));
    const auditSnapshot = await getDocs(auditQ);
    
    const auditDeletePromises = auditSnapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(auditDeletePromises);
  },

  /**
   * Subscribe to governance updates
   */
  subscribe: (
    orgId: string,
    governanceId: string,
    callback: (governance: ELSGovernance | null) => void
  ): Unsubscribe => {
    return onSnapshot(
      orgDoc(orgId, governanceId),
      (doc) => {
        callback(doc.exists() ? (doc.data() as ELSGovernance) : null);
      },
      (error) => {
        console.error('Error subscribing to ELS governance:', error);
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
    callback: (governance: ELSGovernance | null) => void
  ): Unsubscribe => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.empty ? null : (snapshot.docs[0].data() as ELSGovernance));
      },
      (error) => {
        console.error('Error subscribing to ELS governance:', error);
        callback(null);
      }
    );
  },

  /**
   * Subscribe to audit logs
   */
  subscribeToAuditLogs: (
    orgId: string,
    projectId: string,
    callback: (logs: ELSAuditLogEntry[]) => void
  ): Unsubscribe => {
    const q = query(
      auditCollection(orgId),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map(d => d.data() as ELSAuditLogEntry);
        callback(logs);
      },
      (error) => {
        console.error('Error subscribing to ELS audit logs:', error);
        callback([]);
      }
    );
  }
};
