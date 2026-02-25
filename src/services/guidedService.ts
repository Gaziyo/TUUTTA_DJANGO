/**
 * Guided Service
 *
 * Cognitive OS — ELS Pipeline (ADDIE + Cognitive) layer.
 * Delegates to Django REST API:
 *   /organizations/{orgId}/els-projects/
 *
 * GuidedProgram maps to ELSProject.
 * Full program state is stored in ELSProject.phases_data.guided (JSON snapshot).
 * Phase milestones are also persisted via the ELSProject phase actions.
 */

import { apiClient } from '../lib/api';
import type { GuidedProgram, GuidedStage } from '../context/GuidedPipelineContext';
import type { FileUpload } from '../types';
import { retryWithBackoff } from '../lib/retry';
import { isTransientError, toUserErrorMessage } from '../lib/errorHandling';
import { observabilityService } from './observabilityService';

// ─── ID Cache ─────────────────────────────────────────────────────────────────
// Maps local guided_* IDs → Django ELSProject UUIDs for the session lifetime.
const guidedProjectIdCache = new Map<string, string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function logGuidedAction(input: Parameters<typeof observabilityService.logUserAction>[0]) {
  try {
    await observabilityService.logUserAction(input);
  } catch {
    // Keep guided persistence resilient when telemetry infra is unavailable.
  }
}

async function logGuidedIngestion(input: Parameters<typeof observabilityService.logIngestionEvent>[0]) {
  try {
    await observabilityService.logIngestionEvent(input);
  } catch {
    // Keep guided persistence resilient when telemetry infra is unavailable.
  }
}

// ─── ELSProject → GuidedProgram mapper ───────────────────────────────────────

function mapELSProject(project: Record<string, unknown>): GuidedProgram {
  const phasesData = (project.phases_data as Record<string, unknown>) ?? {};
  const snapshot = (phasesData.guided as Record<string, unknown>) ?? {};
  const djangoId = project.id as string;
  const localId = (snapshot.id as string) || (phasesData.local_id as string) || djangoId;

  // Populate session cache
  if (localId && djangoId) {
    guidedProjectIdCache.set(localId, djangoId);
  }

  // Derive stage statuses from phase_records if snapshot doesn't have them
  const phaseRecords = (project.phase_records as Record<string, unknown>[]) ?? [];
  const derivedStageStatus: Partial<Record<GuidedStage, 'pending' | 'in_progress' | 'completed'>> = {};
  for (const rec of phaseRecords) {
    const phase = rec.phase as GuidedStage;
    const status = rec.status as string;
    if (['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate'].includes(phase)) {
      derivedStageStatus[phase] =
        status === 'completed' ? 'completed' : status === 'in_progress' ? 'in_progress' : 'pending';
    }
  }

  const defaultStageStatus: GuidedProgram['stageStatus'] = {
    ingest: derivedStageStatus.ingest ?? 'pending',
    analyze: derivedStageStatus.analyze ?? 'pending',
    design: derivedStageStatus.design ?? 'pending',
    develop: derivedStageStatus.develop ?? 'pending',
    implement: derivedStageStatus.implement ?? 'pending',
    evaluate: derivedStageStatus.evaluate ?? 'pending',
  };

  return {
    id: localId,
    name: (snapshot.name as string) || (project.name as string) || 'Guided Program',
    createdAt: project.created_at ? new Date(project.created_at as string) : new Date(),
    updatedAt: project.updated_at ? new Date(project.updated_at as string) : new Date(),
    sources: (snapshot.sources as FileUpload[]) ?? [],
    analysis: (snapshot.analysis as GuidedProgram['analysis']) ?? undefined,
    design: (snapshot.design as GuidedProgram['design']) ?? undefined,
    develop: (snapshot.develop as GuidedProgram['develop']) ?? undefined,
    implement: (snapshot.implement as GuidedProgram['implement']) ?? undefined,
    evaluate: (snapshot.evaluate as GuidedProgram['evaluate']) ?? undefined,
    stageStatus: (snapshot.stageStatus as GuidedProgram['stageStatus']) ?? defaultStageStatus,
  };
}

// ─── Django UUID lookup ───────────────────────────────────────────────────────
// Resolves a local guided_* ID (or UUID passthrough) to a Django ELSProject UUID.

async function resolveDjangoId(orgId: string, localId: string): Promise<string | null> {
  if (isUUID(localId)) return localId;
  if (guidedProjectIdCache.has(localId)) return guidedProjectIdCache.get(localId)!;

  // Fallback: scan list looking for matching phases_data.local_id
  try {
    const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/`);
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    for (const proj of results) {
      const pd = (proj.phases_data as Record<string, unknown>) ?? {};
      const snap = (pd.guided as Record<string, unknown>) ?? {};
      const projLocalId = (snap.id as string) || (pd.local_id as string);
      if (projLocalId === localId) {
        const djangoId = proj.id as string;
        guidedProjectIdCache.set(localId, djangoId);
        return djangoId;
      }
    }
  } catch {
    // pass
  }
  return null;
}

// ─── Validation (unchanged from original — no Firebase dependency) ────────────

const STAGE_ORDER: GuidedStage[] = ['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate'];

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function assertStagePrerequisites(program: GuidedProgram): void {
  const status = program.stageStatus;
  const sourceCount = program.sources?.length ?? 0;
  const roleCount = program.analysis?.roles?.length ?? 0;
  const objectiveCount = program.design?.objectives?.length ?? 0;
  const draftId = program.develop?.draftId;
  const enrollmentCount = program.implement?.enrollmentCount;

  if (status.analyze === 'completed' && sourceCount === 0) {
    throw new Error('Validation failed: Analyze cannot be completed without at least one source.');
  }
  if (status.design === 'completed' && roleCount === 0) {
    throw new Error('Validation failed: Design cannot be completed without analysis roles.');
  }
  if (status.develop === 'completed' && objectiveCount === 0) {
    throw new Error('Validation failed: Develop cannot be completed without design objectives.');
  }
  if (status.implement === 'completed' && !hasNonEmptyString(draftId)) {
    throw new Error('Validation failed: Implement cannot be completed without a draft ID.');
  }
  if (status.evaluate === 'completed' && !isNonNegativeInteger(enrollmentCount)) {
    throw new Error('Validation failed: Evaluate cannot be completed without a valid enrollment count.');
  }
}

export function validateGuidedProgramSchema(program: GuidedProgram): void {
  if (!hasNonEmptyString(program.id)) throw new Error('Validation failed: Program id is required.');
  if (!hasNonEmptyString(program.name)) throw new Error('Validation failed: Program name is required.');
  if (!program.stageStatus) throw new Error('Validation failed: Stage status is required.');

  for (const stage of STAGE_ORDER) {
    const value = program.stageStatus[stage];
    if (!['pending', 'in_progress', 'completed'].includes(value)) {
      throw new Error(`Validation failed: Invalid stage status for ${stage}.`);
    }
  }

  for (const source of program.sources ?? []) {
    if (!hasNonEmptyString(source.id) || !hasNonEmptyString(source.name)) {
      throw new Error('Validation failed: Each source must include id and name.');
    }
  }

  if (program.analysis) {
    if (!Array.isArray(program.analysis.roles) || !Array.isArray(program.analysis.gaps)) {
      throw new Error('Validation failed: Analysis roles and gaps must be arrays.');
    }
  }

  if (program.design) {
    if (program.design.objectives !== undefined && !Array.isArray(program.design.objectives)) {
      throw new Error('Validation failed: Design objectives must be an array when provided.');
    }
  }

  if (program.develop?.lessonCount !== undefined && !isNonNegativeInteger(program.develop.lessonCount)) {
    throw new Error('Validation failed: lessonCount must be a non-negative integer.');
  }

  if (program.implement?.enrollmentCount !== undefined && !isNonNegativeInteger(program.implement.enrollmentCount)) {
    throw new Error('Validation failed: enrollmentCount must be a non-negative integer.');
  }

  if (program.evaluate?.complianceScore !== undefined) {
    const score = program.evaluate.complianceScore;
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error('Validation failed: complianceScore must be between 0 and 100.');
    }
  }

  assertStagePrerequisites(program);
}

// ─── Service functions ─────────────────────────────────────────────────────────

export async function loadGuidedPrograms(orgId: string, userId: string): Promise<GuidedProgram[]> {
  const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/`);
  const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
  const programs = results.map(mapELSProject);
  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_programs_loaded',
    status: 'success',
    entityType: 'guided_program',
    metadata: { count: programs.length },
  });
  return programs;
}

export async function saveGuidedProgram(
  orgId: string,
  userId: string,
  program: GuidedProgram
): Promise<void> {
  validateGuidedProgramSchema(program);

  const djangoId = await resolveDjangoId(orgId, program.id);

  const payload = {
    name: program.name,
    phases_data: {
      local_id: program.id,
      guided: {
        id: program.id,
        name: program.name,
        sources: program.sources,
        analysis: program.analysis ?? null,
        design: program.design ?? null,
        develop: program.develop ?? null,
        implement: program.implement ?? null,
        evaluate: program.evaluate ?? null,
        stageStatus: program.stageStatus,
      },
    },
  };

  if (djangoId) {
    await retryWithBackoff(
      () => apiClient.patch(`/organizations/${orgId}/els-projects/${djangoId}/`, payload),
      { retries: 2, shouldRetry: isTransientError }
    );
  } else {
    const { data: res } = await retryWithBackoff(
      () =>
        apiClient.post(`/organizations/${orgId}/els-projects/`, {
          ...payload,
          organization: orgId,
          status: 'active',
        }),
      { retries: 2, shouldRetry: isTransientError }
    );
    // Cache the new Django UUID so subsequent saves skip the list lookup
    if ((res as Record<string, unknown>)?.id && program.id) {
      guidedProjectIdCache.set(program.id, (res as Record<string, unknown>).id as string);
    }
  }

  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_program_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: program.id,
    metadata: { stageStatus: program.stageStatus },
  });
}

export async function addGuidedProgramVersion(
  orgId: string,
  program: GuidedProgram,
  stage: string
): Promise<void> {
  validateGuidedProgramSchema(program);
  const djangoId = await resolveDjangoId(orgId, program.id);
  if (!djangoId) return; // No Django record yet — skip version

  const outputData: Record<string, unknown> = {};
  if (stage === 'ingest') outputData.sources = program.sources;
  if (stage === 'analyze') outputData.analysis = program.analysis;
  if (stage === 'design') outputData.design = program.design;
  if (stage === 'develop') outputData.develop = program.develop;
  if (stage === 'implement') outputData.implement = program.implement;
  if (stage === 'evaluate') outputData.evaluate = program.evaluate;

  await retryWithBackoff(
    () =>
      apiClient.post(
        `/organizations/${orgId}/els-projects/${djangoId}/phases/${stage}/complete/`,
        { output_data: outputData }
      ),
    { retries: 2, shouldRetry: isTransientError }
  );

  await logGuidedAction({
    orgId,
    action: 'guided_program_version_created',
    status: 'success',
    entityType: 'guided_program',
    entityId: program.id,
    metadata: { stage },
  });
}

export async function loadGuidedProgramVersions(
  _orgId: string,
  _programId: string
): Promise<[]> {
  // Phase records are embedded in the ELSProject detail response.
  // Use loadGuidedPrograms + filter by program id for now.
  return [];
}

export async function addGuidedSource(
  orgId: string,
  userId: string,
  programId: string,
  source: FileUpload
): Promise<GuidedProgram> {
  const djangoId = await resolveDjangoId(orgId, programId);
  if (!djangoId) throw new Error('Guided program not found.');

  const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/${djangoId}/`);
  const program = mapELSProject(data as Record<string, unknown>);

  const next: GuidedProgram = {
    ...program,
    sources: [...(program.sources ?? []), source],
    stageStatus: { ...program.stageStatus, ingest: 'completed' },
  };
  validateGuidedProgramSchema(next);
  await saveGuidedProgram(orgId, userId, next);

  await logGuidedIngestion({
    orgId,
    actorId: userId,
    action: 'guided_source_added',
    status: 'success',
    entityId: source.id,
    sourceName: source.name,
    sourceType: source.type,
    size: source.size,
    metadata: { programId },
  });
  return next;
}

export async function saveGuidedAnalysis(
  orgId: string,
  userId: string,
  programId: string,
  analysis: NonNullable<GuidedProgram['analysis']>
): Promise<void> {
  const djangoId = await resolveDjangoId(orgId, programId);
  if (!djangoId) throw new Error('Guided program not found.');

  await retryWithBackoff(
    () =>
      apiClient.post(
        `/organizations/${orgId}/els-projects/${djangoId}/phases/analyze/complete/`,
        { output_data: { analysis } }
      ),
    { retries: 2, shouldRetry: isTransientError }
  );

  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_analysis_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: programId,
  });
}

export async function saveGuidedDraft(
  orgId: string,
  userId: string,
  programId: string,
  develop: NonNullable<GuidedProgram['develop']>
): Promise<void> {
  if (!hasNonEmptyString(develop.draftId)) {
    throw new Error('Validation failed: Draft ID is required.');
  }
  const djangoId = await resolveDjangoId(orgId, programId);
  if (!djangoId) throw new Error('Guided program not found.');

  await retryWithBackoff(
    () =>
      apiClient.post(
        `/organizations/${orgId}/els-projects/${djangoId}/phases/develop/complete/`,
        { output_data: { develop } }
      ),
    { retries: 2, shouldRetry: isTransientError }
  );

  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_draft_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: programId,
    metadata: { draftId: develop.draftId, lessonCount: develop.lessonCount },
  });
}

export async function saveGuidedEnrollmentPlan(
  orgId: string,
  userId: string,
  programId: string,
  implement: NonNullable<GuidedProgram['implement']>
): Promise<void> {
  if (!isNonNegativeInteger(implement.enrollmentCount)) {
    throw new Error('Validation failed: Enrollment count must be a non-negative integer.');
  }
  const djangoId = await resolveDjangoId(orgId, programId);
  if (!djangoId) throw new Error('Guided program not found.');

  await retryWithBackoff(
    () =>
      apiClient.post(
        `/organizations/${orgId}/els-projects/${djangoId}/phases/implement/complete/`,
        { output_data: { implement } }
      ),
    { retries: 2, shouldRetry: isTransientError }
  );

  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_enrollment_plan_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: programId,
    metadata: { enrollmentCount: implement.enrollmentCount, cohorts: implement.cohorts },
  });
}

export async function saveGuidedReport(
  orgId: string,
  userId: string,
  programId: string,
  evaluate: NonNullable<GuidedProgram['evaluate']>
): Promise<void> {
  const djangoId = await resolveDjangoId(orgId, programId);
  if (!djangoId) throw new Error('Guided program not found.');

  await retryWithBackoff(
    () =>
      apiClient.post(
        `/organizations/${orgId}/els-projects/${djangoId}/phases/evaluate/complete/`,
        { output_data: { evaluate } }
      ),
    { retries: 2, shouldRetry: isTransientError }
  );

  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_report_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: programId,
    metadata: {
      complianceScore: evaluate.complianceScore,
      metricsCount: evaluate.metrics?.length ?? 0,
    },
  });
}

export function toGuidedUserError(error: unknown): string {
  return toUserErrorMessage(error, 'Unable to save guided workflow changes. Please try again.');
}
