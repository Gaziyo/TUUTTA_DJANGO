/**
 * Knowledge Service
 *
 * Cognitive OS — Knowledge Graph layer.
 * Delegates to Django REST API:
 *   /organizations/{orgId}/knowledge-documents/
 *   /organizations/{orgId}/knowledge-chunks/
 */

import { apiClient } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  orgId: string;
  title: string;
  description: string;
  sourceType: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'audio' | 'video' | 'url' | 'text';
  sourceUrl: string;
  filePath?: string;
  language: string;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  errorMessage?: string;
  chunkCount: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  chunks?: KnowledgeChunk[];
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  bloomLevel?: number;
  metadata: Record<string, unknown>;
  createdAt: number;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapDocument(d: Record<string, unknown>): KnowledgeDocument {
  return {
    id: d.id as string,
    orgId: (d.organization as string) || '',
    title: d.title as string,
    description: (d.description as string) || '',
    sourceType: (d.source_type as KnowledgeDocument['sourceType']) || 'pdf',
    sourceUrl: (d.source_url as string) || '',
    filePath: (d.file_path as string) || undefined,
    language: (d.language as string) || 'en',
    status: (d.status as KnowledgeDocument['status']) || 'pending',
    errorMessage: (d.error_message as string) || undefined,
    chunkCount: (d.chunk_count as number) || 0,
    tokenCount: (d.token_count as number) || 0,
    metadata: (d.metadata as Record<string, unknown>) || {},
    createdBy: (d.created_by as string) || '',
    createdAt: d.created_at ? new Date(d.created_at as string).getTime() : Date.now(),
    updatedAt: d.updated_at ? new Date(d.updated_at as string).getTime() : Date.now(),
    chunks: (d.chunks as Record<string, unknown>[])?.map(mapChunk),
  };
}

function mapChunk(c: Record<string, unknown>): KnowledgeChunk {
  return {
    id: c.id as string,
    documentId: (c.document as string) || '',
    chunkIndex: (c.chunk_index as number) || 0,
    content: (c.content as string) || '',
    tokenCount: (c.token_count as number) || 0,
    bloomLevel: (c.bloom_level as number) || undefined,
    metadata: (c.metadata as Record<string, unknown>) || {},
    createdAt: c.created_at ? new Date(c.created_at as string).getTime() : Date.now(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const knowledgeService = {
  // ─── Documents ──────────────────────────────────────────────────────────────

  create: async (
    orgId: string,
    data: {
      title: string;
      sourceType: KnowledgeDocument['sourceType'];
      sourceUrl?: string;
      filePath?: string;
      description?: string;
      language?: string;
    }
  ): Promise<KnowledgeDocument> => {
    const { data: res } = await apiClient.post(`/organizations/${orgId}/knowledge-documents/`, {
      organization: orgId,
      title: data.title,
      source_type: data.sourceType,
      source_url: data.sourceUrl ?? '',
      file_path: data.filePath ?? '',
      description: data.description ?? '',
      language: data.language ?? 'en',
      status: 'pending',
    });
    return mapDocument(res);
  },

  upload: async (
    orgId: string,
    payload: {
      file?: File;
      title?: string;
      description?: string;
      sourceType?: KnowledgeDocument['sourceType'];
      sourceUrl?: string;
      contentText?: string;
    }
  ): Promise<KnowledgeDocument> => {
    const formData = new FormData();
    if (payload.file) formData.append('file', payload.file);
    if (payload.title) formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    if (payload.sourceType) formData.append('source_type', payload.sourceType);
    if (payload.sourceUrl) formData.append('source_url', payload.sourceUrl);
    if (payload.contentText) formData.append('content_text', payload.contentText);
    formData.append('organization', orgId);

    const { data } = await apiClient.post(`/organizations/${orgId}/knowledge-documents/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapDocument(data);
  },

  get: async (orgId: string, documentId: string): Promise<KnowledgeDocument | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-documents/${documentId}/`);
      return mapDocument(data);
    } catch {
      return null;
    }
  },

  list: async (
    orgId: string,
    options?: { status?: KnowledgeDocument['status']; sourceType?: string }
  ): Promise<KnowledgeDocument[]> => {
    try {
      const params: Record<string, string> = {};
      if (options?.status) params.status = options.status;
      if (options?.sourceType) params.source_type = options.sourceType;
      const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-documents/`, { params });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapDocument);
    } catch {
      return [];
    }
  },

  update: async (
    orgId: string,
    documentId: string,
    updates: Partial<Pick<KnowledgeDocument, 'title' | 'description' | 'status' | 'language'>>
  ): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.language !== undefined) payload.language = updates.language;
    await apiClient.patch(`/organizations/${orgId}/knowledge-documents/${documentId}/`, payload);
  },

  delete: async (orgId: string, documentId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/knowledge-documents/${documentId}/`);
  },

  // ─── Chunks ─────────────────────────────────────────────────────────────────

  listChunks: async (orgId: string, documentId: string): Promise<KnowledgeChunk[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-chunks/`, {
        params: { document: documentId },
      });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return results.map(mapChunk);
    } catch {
      return [];
    }
  },

  getChunk: async (orgId: string, chunkId: string): Promise<KnowledgeChunk | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/knowledge-chunks/${chunkId}/`);
      return mapChunk(data);
    } catch {
      return null;
    }
  },

  submitChunkFeedback: async (
    orgId: string,
    chunkId: string,
    feedback: {
      primary?: number;
      secondary?: number;
      confidence?: number;
      modality?: string;
      notes?: string;
    }
  ): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/knowledge-chunks/${chunkId}/feedback/`, feedback);
  },
};

export default knowledgeService;
