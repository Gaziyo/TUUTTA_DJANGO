import { apiClient } from '@/lib/api';
import axios from 'axios';
import type { ELSProject, ELSPhase, ELSPhaseStatus } from '@/types/els';

// ─── Mappers ─────────────────────────────────────────────────────────────────

const PHASE_NAMES: ELSPhase[] = ['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate', 'personalize', 'portal', 'govern'];
const LOCAL_STORAGE_KEY = 'tuutta:els:projects:v1';

function buildPhaseMap(phaseRecords: Record<string, unknown>[]): ELSProject['phases'] {
  const phases = {} as ELSProject['phases'];
  for (const name of PHASE_NAMES) {
    const rec = (phaseRecords ?? []).find((r: Record<string, unknown>) => r.phase === name) as Record<string, unknown> | undefined;
    phases[name] = rec
      ? {
          status: (rec.status as ELSPhaseStatus['status']) ?? 'pending',
          startedAt: rec.started_at ? new Date(rec.started_at as string).getTime() : undefined,
          completedAt: rec.completed_at ? new Date(rec.completed_at as string).getTime() : undefined,
          data: (rec.output_data as unknown) ?? undefined,
        }
      : { status: 'pending' };
  }
  return phases;
}

function mapProject(data: Record<string, unknown>): ELSProject {
  return {
    id: data.id as string,
    orgId: data.organization as string,
    name: data.name as string,
    description: (data.description as string) || '',
    status: (data.status as ELSProject['status']) || 'draft',
    currentPhase: (data.current_phase as ELSPhase) || 'ingest',
    phases: buildPhaseMap((data.phase_records as Record<string, unknown>[]) ?? []),
    createdCourseIds: (data.created_course_ids as string[]) ?? [],
    createdLearningPathIds: (data.created_learning_path_ids as string[]) ?? [],
    createdAssessmentIds: (data.created_assessment_ids as string[]) ?? [],
    createdBy: (data.created_by as string) || '',
    lastModifiedBy: (data.last_modified_by as string) || '',
    createdAt: data.created_at ? new Date(data.created_at as string).getTime() : Date.now(),
    updatedAt: data.updated_at ? new Date(data.updated_at as string).getTime() : Date.now(),
  };
}

function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

async function withLegacyAndLocalFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  localFallback: () => T | Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch (primaryError) {
    if (!isNotFoundError(primaryError)) {
      throw primaryError;
    }
  }

  try {
    return await fallback();
  } catch (legacyError) {
    if (!isNotFoundError(legacyError)) {
      throw legacyError;
    }
  }

  return localFallback();
}

function isBrowserStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toLocalProjectStore(raw: unknown): Record<string, ELSProject[]> {
  if (!raw || typeof raw !== 'object') return {};
  const store = raw as Record<string, unknown>;
  const result: Record<string, ELSProject[]> = {};

  for (const [orgId, projects] of Object.entries(store)) {
    if (!Array.isArray(projects)) continue;
    result[orgId] = projects.filter((project) => project && typeof project === 'object') as ELSProject[];
  }
  return result;
}

function readLocalStore(): Record<string, ELSProject[]> {
  if (!isBrowserStorageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    return toLocalProjectStore(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeLocalStore(store: Record<string, ELSProject[]>): void {
  if (!isBrowserStorageAvailable()) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota and serialization errors to keep API flow resilient.
  }
}

function listLocalProjects(orgId: string): ELSProject[] {
  const store = readLocalStore();
  const projects = store[orgId] ?? [];
  return [...projects];
}

function getLocalProject(orgId: string, projectId: string): ELSProject | null {
  return listLocalProjects(orgId).find((project) => project.id === projectId) ?? null;
}

function saveLocalProjects(orgId: string, projects: ELSProject[]): void {
  const store = readLocalStore();
  store[orgId] = projects;
  writeLocalStore(store);
}

function defaultPhaseMap(): ELSProject['phases'] {
  const phases = {} as ELSProject['phases'];
  for (const phase of PHASE_NAMES) {
    phases[phase] = { status: 'pending' };
  }
  return phases;
}

function nextPhase(phase: ELSPhase): ELSPhase {
  const index = PHASE_NAMES.indexOf(phase);
  if (index < 0 || index >= PHASE_NAMES.length - 1) return phase;
  return PHASE_NAMES[index + 1];
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return seed;
}

function updateLocalProjectRecord(
  orgId: string,
  projectId: string,
  updater: (project: ELSProject) => ELSProject
): ELSProject | null {
  const projects = listLocalProjects(orgId);
  const index = projects.findIndex((project) => project.id === projectId);
  if (index < 0) return null;

  const current = projects[index];
  const updated = updater({
    ...current,
    phases: { ...current.phases },
  });
  projects[index] = updated;
  saveLocalProjects(orgId, projects);
  return updated;
}

function createLocalProject(orgId: string, userId: string, data: { name: string; description?: string }): ELSProject {
  const now = Date.now();
  const project: ELSProject = {
    id: makeId(),
    orgId,
    name: data.name,
    description: data.description ?? '',
    status: 'draft',
    currentPhase: 'ingest',
    phases: defaultPhaseMap(),
    createdCourseIds: [],
    createdLearningPathIds: [],
    createdAssessmentIds: [],
    createdBy: userId,
    lastModifiedBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  const projects = listLocalProjects(orgId);
  projects.unshift(project);
  saveLocalProjects(orgId, projects);
  return project;
}

const scopedBase = (orgId: string) => `/organizations/${orgId}/els-projects/`;
const legacyBase = '/genie/els-projects/';

const scopedProjectPath = (orgId: string, projectId: string) =>
  `/organizations/${orgId}/els-projects/${projectId}/`;
const legacyProjectPath = (projectId: string) => `/genie/els-projects/${projectId}/`;

const scopedPhasePath = (orgId: string, projectId: string, phase: ELSPhase, action: 'start' | 'complete') =>
  `/organizations/${orgId}/els-projects/${projectId}/phases/${phase}/${action}/`;
const legacyPhasePath = (projectId: string, phase: ELSPhase, action: 'start' | 'complete') =>
  `/genie/els-projects/${projectId}/phases/${phase}/${action}/`;

const scopedActionPath = (orgId: string, projectId: string, action: 'link-course' | 'link-assessment') =>
  `/organizations/${orgId}/els-projects/${projectId}/${action}/`;
const legacyActionPath = (projectId: string, action: 'link-course' | 'link-assessment') =>
  `/genie/els-projects/${projectId}/${action}/`;

// ─── Service ──────────────────────────────────────────────────────────────────

export const elsProjectService = {
  create: async (
    orgId: string,
    userId: string,
    data: { name: string; description?: string }
  ): Promise<ELSProject> => {
    const payload = { organization: orgId, name: data.name, description: data.description ?? '' };
    return withLegacyAndLocalFallback(
      async () => {
        const { data: res } = await apiClient.post(scopedBase(orgId), payload);
        return mapProject(res);
      },
      async () => {
        const { data: res } = await apiClient.post(legacyBase, payload);
        return mapProject(res);
      },
      () => createLocalProject(orgId, userId, data)
    );
  },

  get: async (orgId: string, projectId: string): Promise<ELSProject | null> => {
    try {
      return await withLegacyAndLocalFallback(
        async () => {
          const { data } = await apiClient.get(scopedProjectPath(orgId, projectId));
          return mapProject(data);
        },
        async () => {
          const { data } = await apiClient.get(legacyProjectPath(projectId));
          return mapProject(data);
        },
        () => getLocalProject(orgId, projectId)
      );
    } catch {
      return getLocalProject(orgId, projectId);
    }
  },

  getMany: async (orgId: string, projectIds: string[]): Promise<ELSProject[]> => {
    if (!projectIds.length) return [];
    const results = await Promise.allSettled(
      projectIds.map(id => elsProjectService.get(orgId, id))
    );
    return results.flatMap(r => (r.status === 'fulfilled' && r.value ? [r.value] : []));
  },

  list: async (orgId: string, options?: { status?: ELSProject['status']; limit?: number }): Promise<ELSProject[]> => {
    const localList = () => {
      const projects = listLocalProjects(orgId);
      const filtered = options?.status
        ? projects.filter((project) => project.status === options.status)
        : projects;
      return options?.limit ? filtered.slice(0, options.limit) : filtered;
    };

    try {
      const params: Record<string, string> = {};
      if (options?.status) params.status = options.status;
      const { data } = await withLegacyAndLocalFallback(
        () => apiClient.get(scopedBase(orgId), { params }),
        () => apiClient.get(legacyBase, { params: { ...params, organization: orgId } }),
        async () => ({ data: localList() })
      );
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      const projects = results.map(mapProject);
      return options?.limit ? projects.slice(0, options.limit) : projects;
    } catch {
      return localList();
    }
  },

  update: async (
    orgId: string,
    projectId: string,
    userId: string,
    updates: Partial<Omit<ELSProject, 'id' | 'orgId' | 'createdAt' | 'createdBy'>>
  ): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    await withLegacyAndLocalFallback(
      () => apiClient.patch(scopedProjectPath(orgId, projectId), payload),
      () => apiClient.patch(legacyProjectPath(projectId), payload),
      () => {
        updateLocalProjectRecord(orgId, projectId, (project) => ({
          ...project,
          ...updates,
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        }));
      }
    );
  },

  updatePhase: async (
    orgId: string,
    projectId: string,
    userId: string,
    phase: ELSPhase,
    phaseStatus: Partial<ELSPhaseStatus>
  ): Promise<void> => {
    if (phaseStatus.status === 'in_progress') {
      await withLegacyAndLocalFallback(
        () => apiClient.post(scopedPhasePath(orgId, projectId, phase, 'start')),
        () => apiClient.post(legacyPhasePath(projectId, phase, 'start')),
        () => {
          const now = Date.now();
          updateLocalProjectRecord(orgId, projectId, (project) => ({
            ...project,
            currentPhase: phase,
            phases: {
              ...project.phases,
              [phase]: {
                ...project.phases[phase],
                status: 'in_progress',
                startedAt: phaseStatus.startedAt ?? now,
              },
            },
            updatedAt: now,
            lastModifiedBy: userId,
          }));
        }
      );
    } else if (phaseStatus.status === 'completed') {
      await withLegacyAndLocalFallback(
        () => apiClient.post(scopedPhasePath(orgId, projectId, phase, 'complete'), {
          output_data: phaseStatus.data ?? {},
        }),
        () => apiClient.post(legacyPhasePath(projectId, phase, 'complete'), {
          output_data: phaseStatus.data ?? {},
        }),
        () => {
          const now = Date.now();
          updateLocalProjectRecord(orgId, projectId, (project) => ({
            ...project,
            currentPhase: nextPhase(phase),
            phases: {
              ...project.phases,
              [phase]: {
                ...project.phases[phase],
                status: 'completed',
                completedAt: phaseStatus.completedAt ?? now,
                data: phaseStatus.data,
              },
            },
            updatedAt: now,
            lastModifiedBy: userId,
          }));
        }
      );
    }
  },

  startPhase: async (orgId: string, projectId: string, userId: string, phase: ELSPhase): Promise<void> => {
    await withLegacyAndLocalFallback(
      () => apiClient.post(scopedPhasePath(orgId, projectId, phase, 'start')),
      () => apiClient.post(legacyPhasePath(projectId, phase, 'start')),
      () => {
        const now = Date.now();
        updateLocalProjectRecord(orgId, projectId, (project) => ({
          ...project,
          currentPhase: phase,
          phases: {
            ...project.phases,
            [phase]: {
              ...project.phases[phase],
              status: 'in_progress',
              startedAt: now,
            },
          },
          updatedAt: now,
          lastModifiedBy: userId,
        }));
      }
    );
  },

  completePhase: async (
    orgId: string,
    projectId: string,
    userId: string,
    phase: ELSPhase,
    phaseData?: unknown
  ): Promise<void> => {
    await withLegacyAndLocalFallback(
      () => apiClient.post(scopedPhasePath(orgId, projectId, phase, 'complete'), {
        output_data: phaseData ?? {},
      }),
      () => apiClient.post(legacyPhasePath(projectId, phase, 'complete'), {
        output_data: phaseData ?? {},
      }),
      () => {
        const now = Date.now();
        updateLocalProjectRecord(orgId, projectId, (project) => ({
          ...project,
          currentPhase: nextPhase(phase),
          phases: {
            ...project.phases,
            [phase]: {
              ...project.phases[phase],
              status: 'completed',
              completedAt: now,
              data: phaseData,
            },
          },
          updatedAt: now,
          lastModifiedBy: userId,
        }));
      }
    );
  },

  delete: async (orgId: string, projectId: string): Promise<void> => {
    await withLegacyAndLocalFallback(
      () => apiClient.delete(scopedProjectPath(orgId, projectId)),
      () => apiClient.delete(legacyProjectPath(projectId)),
      () => {
        const projects = listLocalProjects(orgId).filter((project) => project.id !== projectId);
        saveLocalProjects(orgId, projects);
      }
    );
  },

  linkCourse: async (orgId: string, projectId: string, courseId: string, userId: string): Promise<void> => {
    await withLegacyAndLocalFallback(
      () => apiClient.post(scopedActionPath(orgId, projectId, 'link-course'), { course_id: courseId }),
      () => apiClient.post(legacyActionPath(projectId, 'link-course'), { course_id: courseId }),
      () => {
        updateLocalProjectRecord(orgId, projectId, (project) => ({
          ...project,
          createdCourseIds: project.createdCourseIds.includes(courseId)
            ? project.createdCourseIds
            : [...project.createdCourseIds, courseId],
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        }));
      }
    );
  },

  linkLearningPath: async (orgId: string, projectId: string, learningPathId: string, userId: string): Promise<void> => {
    await withLegacyAndLocalFallback(
      () => apiClient.patch(scopedProjectPath(orgId, projectId), {
        created_learning_path_ids: [learningPathId],
      }),
      () => apiClient.patch(legacyProjectPath(projectId), {
        created_learning_path_ids: [learningPathId],
      }),
      () => {
        updateLocalProjectRecord(orgId, projectId, (project) => ({
          ...project,
          createdLearningPathIds: project.createdLearningPathIds.includes(learningPathId)
            ? project.createdLearningPathIds
            : [...project.createdLearningPathIds, learningPathId],
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        }));
      }
    );
  },

  linkAssessment: async (orgId: string, projectId: string, assessmentId: string, userId: string): Promise<void> => {
    await withLegacyAndLocalFallback(
      () => apiClient.post(scopedActionPath(orgId, projectId, 'link-assessment'), { assessment_id: assessmentId }),
      () => apiClient.post(legacyActionPath(projectId, 'link-assessment'), { assessment_id: assessmentId }),
      () => {
        updateLocalProjectRecord(orgId, projectId, (project) => ({
          ...project,
          createdAssessmentIds: project.createdAssessmentIds.includes(assessmentId)
            ? project.createdAssessmentIds
            : [...project.createdAssessmentIds, assessmentId],
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        }));
      }
    );
  },

  archive: async (orgId: string, projectId: string, userId: string): Promise<void> => {
    await withLegacyAndLocalFallback(
      () => apiClient.patch(scopedProjectPath(orgId, projectId), { status: 'archived' }),
      () => apiClient.patch(legacyProjectPath(projectId), { status: 'archived' }),
      () => {
        updateLocalProjectRecord(orgId, projectId, (project) => ({
          ...project,
          status: 'archived',
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        }));
      }
    );
  },

  activate: async (orgId: string, projectId: string, userId: string): Promise<void> => {
    await withLegacyAndLocalFallback(
      () => apiClient.patch(scopedProjectPath(orgId, projectId), { status: 'active' }),
      () => apiClient.patch(legacyProjectPath(projectId), { status: 'active' }),
      () => {
        updateLocalProjectRecord(orgId, projectId, (project) => ({
          ...project,
          status: 'active',
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        }));
      }
    );
  },

  // Real-time subscriptions are not supported over REST — return a no-op unsubscribe.
  subscribe: (_orgId: string, _projectId: string, _callback: (p: ELSProject | null) => void) => () => {},
  subscribeToList: (_orgId: string, _callback: (p: ELSProject[]) => void) => () => {},
};
