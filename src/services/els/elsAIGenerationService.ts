import { auth, db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
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
import type { ELSAIGeneration, ELSGenerationItem, ELSGeneratedAssessment } from '@/types/els';
import { observabilityService } from '@/services/observabilityService';
import { retryWithBackoff } from '@/lib/retry';
import { isTransientError, toUserErrorMessage } from '@/lib/errorHandling';

const COLLECTION_NAME = 'elsAIGeneration';

const orgCollection = (orgId: string) =>
  collection(db, 'organizations', orgId, COLLECTION_NAME);

const orgDoc = (orgId: string, docId: string) =>
  doc(db, 'organizations', orgId, COLLECTION_NAME, docId);

const chatCompletion = httpsCallable(functions, 'genieChatCompletion');

/**
 * ELS AI Generation Service
 * Manages AI content generation for ELS projects (Phase 4: Develop)
 */
export const elsAIGenerationService = {
  /**
   * Create AI generation record
   */
  create: async (
    orgId: string,
    projectId: string,
    designId: string
  ): Promise<ELSAIGeneration> => {
    const generationRef = doc(orgCollection(orgId));
    
    const newGeneration: ELSAIGeneration = {
      id: generationRef.id,
      orgId,
      projectId,
      designId,
      generations: [],
      assessments: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await setDoc(generationRef, newGeneration);
    return newGeneration;
  },

  /**
   * Get generation by ID
   */
  get: async (orgId: string, generationId: string): Promise<ELSAIGeneration | null> => {
    const docSnap = await getDoc(orgDoc(orgId, generationId));
    return docSnap.exists() ? (docSnap.data() as ELSAIGeneration) : null;
  },

  /**
   * Get generation by project ID
   */
  getByProject: async (orgId: string, projectId: string): Promise<ELSAIGeneration | null> => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as ELSAIGeneration);
  },

  /**
   * Create generation request
   */
  createGeneration: async (
    orgId: string,
    generationId: string,
    request: Omit<ELSGenerationItem, 'id' | 'status' | 'createdAt'>
  ): Promise<string> => {
    const generation = await elsAIGenerationService.get(orgId, generationId);
    if (!generation) throw new Error('Generation record not found');

    const newGeneration: ELSGenerationItem = {
      id: `gen_${Date.now()}`,
      ...request,
      status: 'pending',
      reviewed: false,
      createdAt: Date.now()
    };

    await updateDoc(orgDoc(orgId, generationId), {
      generations: [...generation.generations, newGeneration],
      updatedAt: Date.now()
    });
    void observabilityService.logAICall({
      orgId,
      operation: 'els_generation_requested',
      status: 'started',
      entityType: 'els_generation',
      entityId: generationId,
      metadata: {
        itemId: newGeneration.id,
        generationType: newGeneration.type
      }
    });

    return newGeneration.id;
  },

  /**
   * Update generation status
   */
  updateGenerationStatus: async (
    orgId: string,
    generationId: string,
    itemId: string,
    status: ELSGenerationItem['status'],
    output?: string,
    metadata?: ELSGenerationItem['outputMetadata']
  ): Promise<void> => {
    const generation = await elsAIGenerationService.get(orgId, generationId);
    if (!generation) throw new Error('Generation record not found');

    const updatedGenerations = generation.generations.map(g => {
      if (g.id !== itemId) return g;
      return {
        ...g,
        status,
        ...(output && { output }),
        ...(metadata && { outputMetadata: metadata }),
        ...(status === 'completed' && { completedAt: Date.now() })
      };
    });

    await updateDoc(orgDoc(orgId, generationId), {
      generations: updatedGenerations,
      updatedAt: Date.now()
    });
    void observabilityService.logAICall({
      orgId,
      operation: 'els_generation_status_updated',
      status: status === 'error' ? 'error' : status === 'generating' ? 'started' : 'success',
      entityType: 'els_generation',
      entityId: generationId,
      errorMessage: status === 'error' ? output : undefined,
      metadata: { itemId, status }
    });
  },

  /**
   * Mark generation as reviewed
   */
  reviewGeneration: async (
    orgId: string,
    generationId: string,
    itemId: string,
    userId: string,
    approved: boolean
  ): Promise<void> => {
    const generation = await elsAIGenerationService.get(orgId, generationId);
    if (!generation) throw new Error('Generation record not found');

    const updatedGenerations = generation.generations.map(g => {
      if (g.id !== itemId) return g;
      return {
        ...g,
        approved,
        reviewed: true,
        reviewedBy: userId,
        reviewedAt: Date.now()
      };
    });

    await updateDoc(orgDoc(orgId, generationId), {
      generations: updatedGenerations,
      updatedAt: Date.now()
    });
  },

  /**
   * Create assessment
   */
  createAssessment: async (
    orgId: string,
    generationId: string,
    assessment: Omit<ELSGeneratedAssessment, 'id'>
  ): Promise<string> => {
    const generation = await elsAIGenerationService.get(orgId, generationId);
    if (!generation) throw new Error('Generation record not found');

    const newAssessment: ELSGeneratedAssessment = {
      id: `assess_${Date.now()}`,
      ...assessment
    };

    await updateDoc(orgDoc(orgId, generationId), {
      assessments: [...generation.assessments, newAssessment],
      updatedAt: Date.now()
    });

    return newAssessment.id;
  },

  /**
   * Update assessment
   */
  updateAssessment: async (
    orgId: string,
    generationId: string,
    assessmentId: string,
    updates: Partial<ELSGeneratedAssessment>
  ): Promise<void> => {
    const generation = await elsAIGenerationService.get(orgId, generationId);
    if (!generation) throw new Error('Generation record not found');

    const updatedAssessments = generation.assessments.map(a =>
      a.id === assessmentId ? { ...a, ...updates } : a
    );

    await updateDoc(orgDoc(orgId, generationId), {
      assessments: updatedAssessments,
      updatedAt: Date.now()
    });
  },

  /**
   * Remove assessment
   */
  removeAssessment: async (
    orgId: string,
    generationId: string,
    assessmentId: string
  ): Promise<void> => {
    const generation = await elsAIGenerationService.get(orgId, generationId);
    if (!generation) throw new Error('Generation record not found');

    await updateDoc(orgDoc(orgId, generationId), {
      assessments: generation.assessments.filter(a => a.id !== assessmentId),
      updatedAt: Date.now()
    });
  },

  /**
   * Generate content using AI
   * This would integrate with your AI service
   */
  generateContent: async (
    orgId: string,
    generationId: string,
    type: ELSGenerationItem['type'],
    prompt: string,
    parameters?: Record<string, unknown>
  ): Promise<string> => {
    // Create generation request
    const itemId = await elsAIGenerationService.createGeneration(
      orgId,
      generationId,
      { type, prompt, parameters: parameters || {} }
    );

    // Update to generating status
    await elsAIGenerationService.updateGenerationStatus(
      orgId,
      generationId,
      itemId,
      'generating'
    );

    if (!auth.currentUser) {
      await elsAIGenerationService.updateGenerationStatus(
        orgId,
        generationId,
        itemId,
        'error',
        'Authentication required.'
      );
      throw new Error('Please sign in to generate content.');
    }

    const systemPrompts: Record<string, string> = {
      lesson: 'You are an instructional designer. Produce a structured lesson in markdown with objectives, content, activities, and assessment questions.',
      slides: 'You are a presentation designer. Produce slide content as numbered slides with titles and bullet points.',
      audio: 'You are a narrator. Produce an audio script with speaker notes and timing cues.',
      interactive: 'You are an e-learning developer. Describe an interactive scenario with branching paths and decision points.',
      video_script: 'You are a learning content producer. Produce a concise video script with scene-by-scene narration.'
    };

    const startedAt = Date.now();
    try {
      const response = await retryWithBackoff(
        () => chatCompletion({
          systemPrompt: systemPrompts[type] ?? systemPrompts.lesson,
          userPrompt: prompt,
          temperature: 0.4,
          maxTokens: 1400,
          orgId
        }),
        { retries: 2, shouldRetry: isTransientError }
      );
      const content = (response.data as { content?: string })?.content;
      if (!content) {
        throw new Error('No content returned from AI.');
      }

      await elsAIGenerationService.updateGenerationStatus(
        orgId,
        generationId,
        itemId,
        'completed',
        content,
        {
          tokensUsed: 0,
          model: 'gpt-4o-mini',
          confidence: 0.9,
          generationTime: Date.now() - startedAt
        }
      );
      void observabilityService.logAICall({
        orgId,
        operation: 'els_content_generated',
        status: 'success',
        entityType: 'els_generation',
        entityId: generationId,
        provider: 'openai',
        model: 'gpt-4o-mini',
        latencyMs: Date.now() - startedAt,
        metadata: { itemId, type }
      });
    } catch (error) {
      const message = toUserErrorMessage(error, 'Failed to generate AI content.');
      await elsAIGenerationService.updateGenerationStatus(
        orgId,
        generationId,
        itemId,
        'error',
        message
      );
      throw error;
    }

    return itemId;
  },

  /**
   * Delete generation record
   */
  delete: async (orgId: string, generationId: string): Promise<void> => {
    await deleteDoc(orgDoc(orgId, generationId));
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
   * Subscribe to generation updates
   */
  subscribe: (
    orgId: string,
    generationId: string,
    callback: (generation: ELSAIGeneration | null) => void
  ): Unsubscribe => {
    return onSnapshot(
      orgDoc(orgId, generationId),
      (doc) => {
        callback(doc.exists() ? (doc.data() as ELSAIGeneration) : null);
      },
      (error) => {
        console.error('Error subscribing to ELS AI generation:', error);
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
    callback: (generation: ELSAIGeneration | null) => void
  ): Unsubscribe => {
    const q = query(orgCollection(orgId), where('projectId', '==', projectId));
    
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.empty ? null : (snapshot.docs[0].data() as ELSAIGeneration));
      },
      (error) => {
        console.error('Error subscribing to ELS AI generation:', error);
        callback(null);
      }
    );
  }
};
