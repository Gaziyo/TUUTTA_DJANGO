import { apiClient } from '@/lib/api';
import type { ELSContent } from '@/types/els';
import { observabilityService } from '@/services/observabilityService';

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapContent(data: Record<string, unknown>): ELSContent {
  return {
    id: data.id as string,
    orgId: data.organization as string,
    projectId: (data.project as string) || '',
    name: data.title as string,
    type: (data.source_type as ELSContent['type']) || 'pdf',
    size: (data.token_count as number) || 0,
    fileUrl: (data.source_url as string) || '',
    storagePath: (data.file_path as string) || undefined,
    status: mapStatus(data.status as string),
    progress: data.status === 'indexed' ? 100 : data.status === 'processing' ? 50 : 0,
    processingOptions: { nlp: true, ocr: true, tagging: true },
    tags: [],
    uploadedBy: (data.created_by as string) || '',
    uploadedAt: data.created_at ? new Date(data.created_at as string).getTime() : Date.now(),
    extractedContent: (data.content_text as string) || undefined,
    extractedMetadata: undefined,
    aiAnalysis: undefined,
  };
}

function mapStatus(status: string): ELSContent['status'] {
  switch (status) {
    case 'indexed': return 'completed';
    case 'processing': return 'processing';
    case 'failed': return 'error';
    default: return 'uploading';
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const elsContentService = {
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
    }
  ): Promise<ELSContent> => {
    const { data: res } = await apiClient.post(`/organizations/${orgId}/knowledge-documents/`, {
      organization: orgId,
      title: data.name,
      source_type: data.type,
      source_url: data.fileUrl,
      file_path: data.storagePath ?? '',
      status: 'pending',
    });
    const content = mapContent({ ...res, project: projectId });
    void observabilityService.logIngestionEvent({
      orgId,
      actorId: userId,
      action: 'els_content_created',
      status: 'success',
      entityId: content.id,
      sourceName: content.name,
      sourceType: content.type,
      size: content.size,
      metadata: { projectId },
    });
    return content;
  },

  get: async (orgId: string, contentId: string): Promise<ELSContent | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-documents/${contentId}/`);
      return mapContent(data);
    } catch {
      return null;
    }
  },

  list: async (orgId: string, _projectId: string): Promise<ELSContent[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-documents/`);
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapContent);
    } catch {
      return [];
    }
  },

  listAll: async (orgId: string, options?: { status?: string; type?: string }): Promise<ELSContent[]> => {
    try {
      const params: Record<string, string> = {};
      if (options?.status) params.status = options.status;
      if (options?.type) params.source_type = options.type;
      const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-documents/`, { params });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapContent);
    } catch {
      return [];
    }
  },

  update: async (orgId: string, contentId: string, updates: Partial<ELSContent>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.title = updates.name;
    if (updates.status !== undefined) payload.status = updates.status === 'completed' ? 'indexed' : updates.status;
    await apiClient.patch(`/organizations/${orgId}/knowledge-documents/${contentId}/`, payload);
  },

  updateProgress: async (_orgId: string, _contentId: string, _progress: number, _status?: string): Promise<void> => {
    // Progress is derived from document status; no dedicated endpoint.
  },

  markProcessed: async (orgId: string, contentId: string, _extractedData: unknown): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/knowledge-documents/${contentId}/`, { status: 'indexed' });
    void observabilityService.logIngestionEvent({
      orgId,
      action: 'els_content_processed',
      status: 'success',
      entityId: contentId,
    });
  },

  markError: async (orgId: string, contentId: string, error: string): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/knowledge-documents/${contentId}/`, {
      status: 'failed',
      error_message: error,
    });
    void observabilityService.logIngestionEvent({
      orgId,
      action: 'els_content_processing_failed',
      status: 'error',
      entityId: contentId,
      errorMessage: error,
    });
  },

  addTags: async (_orgId: string, _contentId: string, _tags: string[]): Promise<void> => {
    // Tags are stored in KnowledgeDocument.metadata; defer to future implementation.
  },

  removeTags: async (_orgId: string, _contentId: string, _tags: string[]): Promise<void> => {},

  delete: async (orgId: string, contentId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/knowledge-documents/${contentId}/`);
  },

  deleteByProject: async (_orgId: string, _projectId: string): Promise<void> => {
    // Project-scoped delete not directly supported; documents live in knowledge app.
  },

  getStats: async (orgId: string, _projectId: string) => {
    const content = await elsContentService.list(orgId, _projectId);
    return {
      total: content.length,
      byStatus: {
        uploading: content.filter(c => c.status === 'uploading').length,
        processing: content.filter(c => c.status === 'processing').length,
        completed: content.filter(c => c.status === 'completed').length,
        error: content.filter(c => c.status === 'error').length,
      },
      byType: {
        pdf: content.filter(c => c.type === 'pdf').length,
        doc: content.filter(c => c.type === 'doc' || c.type === 'docx').length,
        ppt: content.filter(c => c.type === 'ppt' || c.type === 'pptx').length,
        audio: content.filter(c => c.type === 'audio').length,
        video: content.filter(c => c.type === 'video').length,
      },
      totalSize: content.reduce((sum, c) => sum + (c.size ?? 0), 0),
    };
  },

  subscribe: (_orgId: string, _contentId: string, _callback: (c: ELSContent | null) => void) => () => {},
  subscribeToProject: (_orgId: string, _projectId: string, _callback: (c: ELSContent[]) => void) => () => {},
};
