/**
 * ELS AI Generation Service — Phase 4: AI Development
 * Uses Django /api/v1/ai/chat/ for content generation.
 * Generated assessments are created via /api/v1/assessments/.
 */
import { apiClient } from '@/lib/api';
import type { ELSAIGeneration } from '@/types/els';
import { observabilityService } from '@/services/observabilityService';

export const elsAIGenerationService = {
  generate: async (
    orgId: string,
    projectId: string,
    userId: string,
    request: {
      type: 'lesson' | 'slides' | 'audio' | 'assessment';
      prompt: string;
      parameters?: Record<string, unknown>;
    }
  ): Promise<{ output: string; tokensUsed: number; model: string }> => {
    const startedAt = Date.now();
    void observabilityService.logAICall({
      orgId,
      actorId: userId,
      operation: 'els_ai_generate',
      status: 'started',
      metadata: { type: request.type, projectId },
    });
    try {
      const { data } = await apiClient.post('/ai/chat/', {
        messages: [{ role: 'user', content: request.prompt }],
        parameters: request.parameters ?? {},
      });
      const latencyMs = Date.now() - startedAt;
      void observabilityService.logAICall({
        orgId,
        actorId: userId,
        operation: 'els_ai_generate',
        status: 'success',
        latencyMs,
        tokensUsed: data.usage?.total_tokens,
        metadata: { type: request.type, projectId },
      });
      return {
        output: data.choices?.[0]?.message?.content ?? '',
        tokensUsed: data.usage?.total_tokens ?? 0,
        model: data.model ?? 'unknown',
      };
    } catch (err) {
      void observabilityService.logAICall({
        orgId,
        actorId: userId,
        operation: 'els_ai_generate',
        status: 'error',
        errorMessage: String(err),
        metadata: { type: request.type, projectId },
      });
      throw err;
    }
  },

  get: async (orgId: string, projectId: string): Promise<ELSAIGeneration | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/${projectId}/`);
      const phaseRec = (data.phase_records as Record<string, unknown>[])?.find(
        (r: Record<string, unknown>) => r.phase === 'develop'
      );
      if (!phaseRec?.output_data) return null;
      return { id: projectId, orgId, projectId, ...(phaseRec.output_data as object) } as ELSAIGeneration;
    } catch {
      return null;
    }
  },

  saveOutput: async (
    orgId: string,
    projectId: string,
    _userId: string,
    outputData: Partial<ELSAIGeneration>
  ): Promise<void> => {
    await apiClient.post(
      `/organizations/${orgId}/els-projects/${projectId}/phases/develop/complete/`,
      { output_data: outputData }
    );
  },

  delete: async (_orgId: string, _generationId: string): Promise<void> => {},
  subscribe: (_orgId: string, _projectId: string, _cb: (g: ELSAIGeneration | null) => void) => () => {},
};
