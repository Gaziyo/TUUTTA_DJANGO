import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuidedProgram } from '../../context/GuidedPipelineContext';
import type { FileUpload } from '../../types';

type TimestampLike = { toDate: () => Date };

const firestoreState = {
  docs: new Map<string, Record<string, unknown>>(),
  autoId: 0
};

const serverTimestampMarker = { __serverTimestamp: true };

const asTimestamp = (value: unknown): TimestampLike => {
  const date = value instanceof Date ? value : new Date();
  return {
    toDate: () => date
  };
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const resolveServerTimestamp = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(resolveServerTimestamp);
  }
  if (value && typeof value === 'object') {
    if ((value as Record<string, unknown>).__serverTimestamp) {
      return asTimestamp(new Date());
    }
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      next[key] = resolveServerTimestamp(child);
    }
    return next;
  }
  return value;
};

const setByPath = (target: Record<string, unknown>, dottedPath: string, value: unknown) => {
  const keys = dottedPath.split('.');
  let cursor: Record<string, unknown> = target;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const current = cursor[key];
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
};

const getByPath = (target: Record<string, unknown>, dottedPath: string): unknown => {
  return dottedPath.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object' || Array.isArray(acc)) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, target);
};

const isDirectChild = (collectionPath: string, docPath: string): boolean => {
  if (!docPath.startsWith(`${collectionPath}/`)) return false;
  const relative = docPath.slice(collectionPath.length + 1);
  return !relative.includes('/');
};

interface CollectionRef {
  path: string;
}

interface DocRef {
  path: string;
  id: string;
}

interface QueryRef {
  path: string;
  clauses: Array<Record<string, unknown>>;
}

vi.mock('../../lib/firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => {
    if (args[0] && typeof args[0] === 'object' && 'path' in (args[0] as Record<string, unknown>)) {
      const base = args[0] as CollectionRef;
      const segments = args.slice(1).map(String);
      return { path: `${base.path}/${segments.join('/')}` };
    }
    return { path: args.slice(1).map(String).join('/') };
  },
  doc: (...args: unknown[]) => {
    if (args[0] && typeof args[0] === 'object' && 'path' in (args[0] as Record<string, unknown>)) {
      const base = args[0] as CollectionRef;
      const id = String(args[1]);
      return { path: `${base.path}/${id}`, id };
    }
    const segments = args.slice(1).map(String);
    return { path: segments.join('/'), id: segments[segments.length - 1] };
  },
  where: (field: string, op: string, value: unknown) => ({ type: 'where', field, op, value }),
  orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => ({ type: 'orderBy', field, direction }),
  query: (collectionRef: CollectionRef, ...clauses: Array<Record<string, unknown>>) => ({
    path: collectionRef.path,
    clauses
  }),
  serverTimestamp: () => serverTimestampMarker,
  setDoc: async (ref: DocRef, payload: Record<string, unknown>, options?: { merge?: boolean }) => {
    const existing = firestoreState.docs.get(ref.path) ?? {};
    const resolved = resolveServerTimestamp(payload) as Record<string, unknown>;
    firestoreState.docs.set(ref.path, options?.merge ? { ...existing, ...resolved } : resolved);
  },
  updateDoc: async (ref: DocRef, payload: Record<string, unknown>) => {
    const existing = firestoreState.docs.get(ref.path);
    if (!existing) throw new Error('Document not found');
    const next = { ...existing };
    const resolved = resolveServerTimestamp(payload) as Record<string, unknown>;
    for (const [key, value] of Object.entries(resolved)) {
      if (key.includes('.')) {
        setByPath(next, key, value);
      } else {
        next[key] = value;
      }
    }
    firestoreState.docs.set(ref.path, next);
  },
  addDoc: async (collectionRef: CollectionRef, payload: Record<string, unknown>) => {
    firestoreState.autoId += 1;
    const id = `auto_${firestoreState.autoId}`;
    const path = `${collectionRef.path}/${id}`;
    firestoreState.docs.set(path, resolveServerTimestamp(payload) as Record<string, unknown>);
    return { id, path };
  },
  getDoc: async (ref: DocRef) => ({
    id: ref.id,
    exists: () => firestoreState.docs.has(ref.path),
    data: () => deepClone(firestoreState.docs.get(ref.path))
  }),
  getDocs: async (source: CollectionRef | QueryRef) => {
    const path = source.path;
    const clauses = 'clauses' in source ? source.clauses : [];
    let rows = Array.from(firestoreState.docs.entries())
      .filter(([docPath]) => isDirectChild(path, docPath))
      .map(([docPath, data]) => ({
        id: docPath.split('/').pop() || '',
        data: () => deepClone(data)
      }));

    for (const clause of clauses) {
      if (clause.type === 'where') {
        rows = rows.filter(row => {
          const value = getByPath(row.data() as Record<string, unknown>, String(clause.field));
          if (clause.op === '==') return value === clause.value;
          return false;
        });
      }
      if (clause.type === 'orderBy') {
        const direction = clause.direction === 'desc' ? -1 : 1;
        rows.sort((left, right) => {
          const leftValue = getByPath(left.data() as Record<string, unknown>, String(clause.field));
          const rightValue = getByPath(right.data() as Record<string, unknown>, String(clause.field));
          const leftDate = (leftValue as TimestampLike)?.toDate?.() ?? leftValue;
          const rightDate = (rightValue as TimestampLike)?.toDate?.() ?? rightValue;
          if (leftDate < rightDate) return -1 * direction;
          if (leftDate > rightDate) return 1 * direction;
          return 0;
        });
      }
    }

    return {
      empty: rows.length === 0,
      docs: rows
    };
  }
}));

import {
  addGuidedProgramVersion,
  addGuidedSource,
  loadGuidedProgramVersions,
  loadGuidedPrograms,
  saveGuidedAnalysis,
  saveGuidedDraft,
  saveGuidedEnrollmentPlan,
  saveGuidedProgram,
  saveGuidedReport
} from '../guidedService';

const orgId = 'org_smoke';
const userId = 'user_smoke';

const createProgram = (): GuidedProgram => ({
  id: `guided_${Date.now()}`,
  name: 'Smoke Program',
  createdAt: new Date(),
  updatedAt: new Date(),
  sources: [],
  stageStatus: {
    ingest: 'pending',
    analyze: 'pending',
    design: 'pending',
    develop: 'pending',
    implement: 'pending',
    evaluate: 'pending'
  }
});

describe('Guided ADDIE Smoke', () => {
  beforeEach(() => {
    firestoreState.docs.clear();
    firestoreState.autoId = 0;
  });

  it('create/save/load path persists a valid guided program', async () => {
    const program = createProgram();
    await saveGuidedProgram(orgId, userId, program);

    const loaded = await loadGuidedPrograms(orgId, userId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(program.id);
    expect(loaded[0].name).toBe('Smoke Program');
  });

  it('update path persists source and analysis artifacts', async () => {
    const program = createProgram();
    await saveGuidedProgram(orgId, userId, program);

    const source: FileUpload = {
      id: 'src_1',
      name: 'Policy.pdf',
      type: 'application/pdf',
      content: 'https://example.com/policy.pdf',
      extractedText: 'policy requirements'
    };

    await addGuidedSource(orgId, userId, program.id, source);
    await saveGuidedAnalysis(orgId, userId, program.id, {
      roles: ['Compliance'],
      gaps: ['Knowledge baseline']
    });

    const loaded = await loadGuidedPrograms(orgId, userId);
    expect(loaded[0].sources).toHaveLength(1);
    expect(loaded[0].analysis?.roles).toContain('Compliance');
    expect(loaded[0].stageStatus.ingest).toBe('completed');
  });

  it('update path persists draft, enrollment, and report outputs', async () => {
    const program = createProgram();
    program.sources = [{ id: 'src_2', name: 'Guide.docx', type: 'doc', content: 'x' } as FileUpload];
    program.analysis = { roles: ['Ops'], gaps: ['Process adherence'] };
    program.design = { objectives: ['Follow SOP'] };
    program.stageStatus.ingest = 'completed';
    program.stageStatus.analyze = 'completed';
    program.stageStatus.design = 'completed';
    await saveGuidedProgram(orgId, userId, program);

    await saveGuidedDraft(orgId, userId, program.id, { draftId: 'draft_1', lessonCount: 3 });
    await saveGuidedEnrollmentPlan(orgId, userId, program.id, { enrollmentCount: 24, cohorts: ['Ops'] });
    await saveGuidedReport(orgId, userId, program.id, { metrics: ['completion'], complianceScore: 88 });

    const loaded = await loadGuidedPrograms(orgId, userId);
    expect(loaded[0].develop?.draftId).toBe('draft_1');
    expect(loaded[0].implement?.enrollmentCount).toBe(24);
    expect(loaded[0].evaluate?.complianceScore).toBe(88);
  });

  it('load path returns version history records for snapshots', async () => {
    const program = createProgram();
    program.sources = [{ id: 'src_3', name: 'Handbook', type: 'pdf', content: 'y' } as FileUpload];
    await saveGuidedProgram(orgId, userId, program);
    await addGuidedProgramVersion(orgId, program, 'ingest');
    await addGuidedProgramVersion(orgId, program, 'analyze');

    const versions = await loadGuidedProgramVersions(orgId, program.id);
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions[0]).toHaveProperty('stage');
    expect(versions[0]).toHaveProperty('snapshot');
  });

  it('schema/prerequisite validation blocks invalid stage progression', async () => {
    const program = createProgram();
    program.stageStatus.design = 'completed';
    await expect(saveGuidedProgram(orgId, userId, program)).rejects.toThrow(/Validation failed/);
  });
});
