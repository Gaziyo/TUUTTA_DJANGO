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
  orderBy,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import type { ELSContent } from '@/types/els';
import { observabilityService } from '@/services/observabilityService';

const COLLECTION_NAME = 'elsContent';

// Organization-scoped helpers
const orgCollection = (orgId: string) =>
  collection(db, 'organizations', orgId, COLLECTION_NAME);

const orgDoc = (orgId: string, docId: string) =>
  doc(db, 'organizations', orgId, COLLECTION_NAME, docId);

/**
 * ELS Content Service
 * Manages content ingestion for ELS projects
 */
export const elsContentService = {
  /**
   * Create content entry
   */
  create: async (
    orgId: string,
    projectId: string,
    userId: string,
    data: {
      name: string;
      type: ELSContent['type'];
      size: number;
      fileUrl: string;
      storagePath?: string;
      processingOptions?: ELSContent['processingOptions'];
    }
  ): Promise<ELSContent> => {
    const contentRef = doc(orgCollection(orgId));
    
    const newContent: ELSContent = {
      id: contentRef.id,
      orgId,
      projectId,
      name: data.name,
      type: data.type,
      size: data.size,
      fileUrl: data.fileUrl,
      storagePath: data.storagePath,
      status: 'uploading',
      progress: 0,
      processingOptions: data.processingOptions || { nlp: true, ocr: true, tagging: true },
      tags: [],
      uploadedBy: userId,
      uploadedAt: Date.now()
    };
    
    await setDoc(contentRef, newContent);
    void observabilityService.logIngestionEvent({
      orgId,
      actorId: userId,
      action: 'els_content_created',
      status: 'success',
      entityId: newContent.id,
      sourceName: newContent.name,
      sourceType: newContent.type,
      size: newContent.size,
      metadata: { projectId }
    });
    return newContent;
  },

  /**
   * Get content by ID
   */
  get: async (orgId: string, contentId: string): Promise<ELSContent | null> => {
    const docSnap = await getDoc(orgDoc(orgId, contentId));
    return docSnap.exists() ? (docSnap.data() as ELSContent) : null;
  },

  /**
   * List content for a project
   */
  list: async (orgId: string, projectId: string): Promise<ELSContent[]> => {
    const q = query(
      orgCollection(orgId),
      where('projectId', '==', projectId),
      orderBy('uploadedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ELSContent);
  },

  /**
   * List all content for organization
   */
  listAll: async (orgId: string, options?: {
    status?: ELSContent['status'];
    type?: ELSContent['type'];
    uploadedBy?: string;
  }): Promise<ELSContent[]> => {
    let q = query(orgCollection(orgId), orderBy('uploadedAt', 'desc'));
    
    if (options?.status) {
      q = query(q, where('status', '==', options.status));
    }
    if (options?.type) {
      q = query(q, where('type', '==', options.type));
    }
    if (options?.uploadedBy) {
      q = query(q, where('uploadedBy', '==', options.uploadedBy));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ELSContent);
  },

  /**
   * Update content
   */
  update: async (
    orgId: string,
    contentId: string,
    updates: Partial<Omit<ELSContent, 'id' | 'orgId' | 'projectId' | 'uploadedAt' | 'uploadedBy'>>
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, contentId), updates);
  },

  /**
   * Update processing progress
   */
  updateProgress: async (
    orgId: string,
    contentId: string,
    progress: number,
    status?: ELSContent['status']
  ): Promise<void> => {
    const updates: Partial<ELSContent> = { progress };
    if (status) updates.status = status;
    await updateDoc(orgDoc(orgId, contentId), updates);
  },

  /**
   * Mark content as processed
   */
  markProcessed: async (
    orgId: string,
    contentId: string,
    extractedData: {
      extractedContent?: string;
      extractedMetadata?: ELSContent['extractedMetadata'];
      tags?: string[];
      aiAnalysis?: ELSContent['aiAnalysis'];
    }
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, contentId), {
      status: 'completed',
      progress: 100,
      ...extractedData
    });
    void observabilityService.logIngestionEvent({
      orgId,
      action: 'els_content_processed',
      status: 'success',
      entityId: contentId
    });
  },

  /**
   * Mark content as error
   */
  markError: async (
    orgId: string,
    contentId: string,
    error: string
  ): Promise<void> => {
    await updateDoc(orgDoc(orgId, contentId), {
      status: 'error',
      processingError: error
    });
    void observabilityService.logIngestionEvent({
      orgId,
      action: 'els_content_processing_failed',
      status: 'error',
      entityId: contentId,
      errorMessage: error
    });
  },

  /**
   * Add tags to content
   */
  addTags: async (
    orgId: string,
    contentId: string,
    tags: string[]
  ): Promise<void> => {
    const content = await elsContentService.get(orgId, contentId);
    if (!content) return;
    
    const newTags = [...new Set([...content.tags, ...tags])];
    await updateDoc(orgDoc(orgId, contentId), { tags: newTags });
  },

  /**
   * Remove tags from content
   */
  removeTags: async (
    orgId: string,
    contentId: string,
    tags: string[]
  ): Promise<void> => {
    const content = await elsContentService.get(orgId, contentId);
    if (!content) return;
    
    const newTags = content.tags.filter(t => !tags.includes(t));
    await updateDoc(orgDoc(orgId, contentId), { tags: newTags });
  },

  /**
   * Delete content
   */
  delete: async (orgId: string, contentId: string): Promise<void> => {
    await deleteDoc(orgDoc(orgId, contentId));
  },

  /**
   * Delete all content for a project
   */
  deleteByProject: async (orgId: string, projectId: string): Promise<void> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  },

  /**
   * Subscribe to content updates
   */
  subscribe: (
    orgId: string,
    contentId: string,
    callback: (content: ELSContent | null) => void
  ): Unsubscribe => {
    return onSnapshot(
      orgDoc(orgId, contentId),
      (doc) => {
        callback(doc.exists() ? (doc.data() as ELSContent) : null);
      },
      (error) => {
        console.error('Error subscribing to ELS content:', error);
        callback(null);
      }
    );
  },

  /**
   * Subscribe to all content for a project
   */
  subscribeToProject: (
    orgId: string,
    projectId: string,
    callback: (content: ELSContent[]) => void
  ): Unsubscribe => {
    const q = query(
      orgCollection(orgId),
      where('projectId', '==', projectId),
      orderBy('uploadedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const content = snapshot.docs.map(d => d.data() as ELSContent);
        callback(content);
      },
      (error) => {
        console.error('Error subscribing to ELS content list:', error);
        callback([]);
      }
    );
  },

  /**
   * Get content statistics for a project
   */
  getStats: async (orgId: string, projectId: string) => {
    const content = await elsContentService.list(orgId, projectId);
    
    return {
      total: content.length,
      byStatus: {
        uploading: content.filter(c => c.status === 'uploading').length,
        processing: content.filter(c => c.status === 'processing').length,
        completed: content.filter(c => c.status === 'completed').length,
        error: content.filter(c => c.status === 'error').length
      },
      byType: {
        pdf: content.filter(c => c.type === 'pdf').length,
        doc: content.filter(c => c.type === 'doc' || c.type === 'docx').length,
        ppt: content.filter(c => c.type === 'ppt' || c.type === 'pptx').length,
        audio: content.filter(c => c.type === 'audio').length,
        video: content.filter(c => c.type === 'video').length
      },
      totalSize: content.reduce((sum, c) => sum + c.size, 0)
    };
  }
};
