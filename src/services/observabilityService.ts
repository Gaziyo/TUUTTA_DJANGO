import { serviceEvents } from './events';
import { auditService } from './auditService';
import type { AuditLog } from '../types/lms';

export type ObservabilityCategory =
  | 'ai'
  | 'ingestion'
  | 'user_action'
  | 'admin'
  | 'compliance'
  | 'system';

export type ObservabilityStatus = 'started' | 'success' | 'error';

export interface StructuredLogInput {
  orgId?: string;
  category: ObservabilityCategory;
  action: string;
  status: ObservabilityStatus;
  actorId?: string;
  actorName?: string;
  actorType?: 'user' | 'admin' | 'system';
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  occurredAt?: number;
}

type ObservabilityRecord = StructuredLogInput & {
  id: string;
  occurredAt: number;
  createdAt: number;
};

function trimUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as T;
}

function makeRecord(input: StructuredLogInput, id: string): ObservabilityRecord {
  const now = Date.now();
  return {
    ...input,
    id,
    occurredAt: input.occurredAt ?? now,
    createdAt: now
  };
}

// Firebase removed — persistence is a no-op during Django migration.
// TODO: wire up to Django audit/observability endpoint.
async function persist(_record: ObservabilityRecord): Promise<void> {
  // no-op
}

async function safePersist(input: StructuredLogInput): Promise<void> {
  const id = `${input.category}_${input.action}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = makeRecord(input, id);
  try {
    await persist(record);
  } catch {
    // Keep product flow resilient when observability infrastructure is unavailable.
  }
  serviceEvents.emit(`observability.${input.category}.${input.action}`, trimUndefined(record as unknown as Record<string, unknown>));
}

export const observabilityService = {
  log: safePersist,

  logAICall: async (input: {
    orgId?: string;
    actorId?: string;
    actorName?: string;
    actorType?: 'user' | 'admin' | 'system';
    operation: string;
    status: ObservabilityStatus;
    entityType?: string;
    entityId?: string;
    provider?: string;
    model?: string;
    latencyMs?: number;
    tokensUsed?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }) => {
    await safePersist({
      orgId: input.orgId,
      category: 'ai',
      action: input.operation,
      status: input.status,
      actorId: input.actorId,
      actorName: input.actorName,
      actorType: input.actorType,
      entityType: input.entityType,
      entityId: input.entityId,
      errorMessage: input.errorMessage,
      metadata: trimUndefined({
        provider: input.provider,
        model: input.model,
        latencyMs: input.latencyMs,
        tokensUsed: input.tokensUsed,
        ...input.metadata
      })
    });
  },

  logIngestionEvent: async (input: {
    orgId?: string;
    actorId?: string;
    actorName?: string;
    actorType?: 'user' | 'admin' | 'system';
    action: string;
    status: ObservabilityStatus;
    entityId?: string;
    sourceName?: string;
    sourceType?: string;
    size?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }) => {
    await safePersist({
      orgId: input.orgId,
      category: 'ingestion',
      action: input.action,
      status: input.status,
      actorId: input.actorId,
      actorName: input.actorName,
      actorType: input.actorType,
      entityType: 'source',
      entityId: input.entityId,
      errorMessage: input.errorMessage,
      metadata: trimUndefined({
        sourceName: input.sourceName,
        sourceType: input.sourceType,
        size: input.size,
        ...input.metadata
      })
    });
  },

  logUserAction: async (input: {
    orgId?: string;
    actorId?: string;
    actorName?: string;
    actorType?: 'user' | 'admin' | 'system';
    action: string;
    status: ObservabilityStatus;
    entityType?: string;
    entityId?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }) => {
    await safePersist({
      orgId: input.orgId,
      category: 'user_action',
      action: input.action,
      status: input.status,
      actorId: input.actorId,
      actorName: input.actorName,
      actorType: input.actorType,
      entityType: input.entityType,
      entityId: input.entityId,
      errorMessage: input.errorMessage,
      metadata: input.metadata
    });
  },

  logAdminAuditEvent: async (input: {
    orgId: string;
    actorId: string;
    actorName: string;
    actorType?: 'admin' | 'user' | 'system';
    action: string;
    entityType?: string;
    entityId?: string;
    targetType?: string;
    targetId?: string;
    targetName?: string;
    metadata?: Record<string, unknown>;
    changes?: Record<string, unknown>;
  }) => {
    const actorType = input.actorType ?? 'admin';

    await safePersist({
      orgId: input.orgId,
      category: input.action.includes('compliance') ? 'compliance' : 'admin',
      action: input.action,
      status: 'success',
      actorId: input.actorId,
      actorName: input.actorName,
      actorType,
      entityType: input.entityType ?? input.targetType,
      entityId: input.entityId ?? input.targetId,
      metadata: input.metadata
    });

    try {
      await auditService.create({
        orgId: input.orgId,
        actorId: input.actorId,
        actorName: input.actorName,
        actorType,
        action: input.action,
        entityType: input.entityType ?? input.targetType,
        entityId: input.entityId ?? input.targetId,
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: input.targetName,
        changes: input.changes as AuditLog['changes'],
        metadata: input.metadata,
        timestamp: Date.now(),
        createdAt: Date.now()
      });
    } catch {
      // Do not block the caller if audit persistence is unavailable.
    }
  }
};
