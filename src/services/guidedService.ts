import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GuidedProgram, GuidedStage } from '../context/GuidedPipelineContext';
import type { FileUpload } from '../types';
import { retryWithBackoff } from '../lib/retry';
import { isTransientError, toUserErrorMessage } from '../lib/errorHandling';
import { observabilityService } from './observabilityService';

const COLLECTION = 'guidedPrograms';

function guidedCollection(orgId: string) {
  return collection(db, 'organizations', orgId, COLLECTION);
}

const STAGE_ORDER: GuidedStage[] = ['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate'];

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

function normalizeGuidedProgram(data: Record<string, unknown>, id: string): GuidedProgram {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date()
  } as GuidedProgram;
}

export async function loadGuidedPrograms(orgId: string, userId: string) {
  const q = query(
    guidedCollection(orgId),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await retryWithBackoff(() => getDocs(q), { retries: 2, shouldRetry: isTransientError });
  const programs = snapshot.docs.map(docSnap => normalizeGuidedProgram(docSnap.data(), docSnap.id));
  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_programs_loaded',
    status: 'success',
    entityType: 'guided_program',
    metadata: { count: programs.length }
  });
  return programs;
}

export async function saveGuidedProgram(orgId: string, userId: string, program: GuidedProgram) {
  validateGuidedProgramSchema(program);
  const ref = doc(guidedCollection(orgId), program.id);
  await retryWithBackoff(
    () => setDoc(ref, {
      ...program,
      orgId,
      userId,
      updatedAt: serverTimestamp(),
      createdAt: program.createdAt ?? serverTimestamp()
    }, { merge: true }),
    { retries: 2, shouldRetry: isTransientError }
  );
  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_program_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: program.id,
    metadata: { stageStatus: program.stageStatus }
  });
}

export async function addGuidedProgramVersion(orgId: string, program: GuidedProgram, stage: string) {
  validateGuidedProgramSchema(program);
  const versionRef = collection(db, 'organizations', orgId, COLLECTION, program.id, 'versions');
  await retryWithBackoff(
    () => addDoc(versionRef, {
      programId: program.id,
      stage,
      snapshot: {
        name: program.name,
        sources: program.sources.map(source => ({ id: source.id, name: source.name })),
        analysis: program.analysis,
        design: program.design,
        develop: program.develop,
        implement: program.implement,
        evaluate: program.evaluate
      },
      createdAt: serverTimestamp()
    }),
    { retries: 2, shouldRetry: isTransientError }
  );
  await logGuidedAction({
    orgId,
    action: 'guided_program_version_created',
    status: 'success',
    entityType: 'guided_program',
    entityId: program.id,
    metadata: { stage }
  });
}

export async function loadGuidedProgramVersions(orgId: string, programId: string) {
  const versionRef = collection(db, 'organizations', orgId, COLLECTION, programId, 'versions');
  const q = query(versionRef, orderBy('createdAt', 'desc'));
  const snapshot = await retryWithBackoff(() => getDocs(q), { retries: 2, shouldRetry: isTransientError });
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    snapshot: docSnap.data().snapshot,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate?.() ?? new Date()
  }));
}

export async function addGuidedSource(
  orgId: string,
  userId: string,
  programId: string,
  source: FileUpload
) {
  const ref = doc(guidedCollection(orgId), programId);
  const snap = await retryWithBackoff(() => getDoc(ref), { retries: 2, shouldRetry: isTransientError });
  if (!snap.exists()) throw new Error('Guided program not found.');
  const program = normalizeGuidedProgram(snap.data(), snap.id);
  const next: GuidedProgram = {
    ...program,
    sources: [...(program.sources ?? []), source],
    stageStatus: { ...program.stageStatus, ingest: 'completed' }
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
    metadata: { programId }
  });
  return next;
}

export async function saveGuidedAnalysis(
  orgId: string,
  userId: string,
  programId: string,
  analysis: NonNullable<GuidedProgram['analysis']>
) {
  const ref = doc(guidedCollection(orgId), programId);
  await retryWithBackoff(
    () => updateDoc(ref, {
      analysis,
      'stageStatus.analyze': 'completed',
      updatedAt: serverTimestamp(),
      lastModifiedBy: userId
    }),
    { retries: 2, shouldRetry: isTransientError }
  );
  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_analysis_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: programId
  });
}

export async function saveGuidedDraft(
  orgId: string,
  userId: string,
  programId: string,
  develop: NonNullable<GuidedProgram['develop']>
) {
  if (!hasNonEmptyString(develop.draftId)) {
    throw new Error('Validation failed: Draft ID is required.');
  }
  const ref = doc(guidedCollection(orgId), programId);
  await retryWithBackoff(
    () => updateDoc(ref, {
      develop,
      updatedAt: serverTimestamp(),
      lastModifiedBy: userId
    }),
    { retries: 2, shouldRetry: isTransientError }
  );
  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_draft_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: programId,
    metadata: { draftId: develop.draftId, lessonCount: develop.lessonCount }
  });
}

export async function saveGuidedEnrollmentPlan(
  orgId: string,
  userId: string,
  programId: string,
  implement: NonNullable<GuidedProgram['implement']>
) {
  if (!isNonNegativeInteger(implement.enrollmentCount)) {
    throw new Error('Validation failed: Enrollment count must be a non-negative integer.');
  }
  const ref = doc(guidedCollection(orgId), programId);
  await retryWithBackoff(
    () => updateDoc(ref, {
      implement,
      updatedAt: serverTimestamp(),
      lastModifiedBy: userId
    }),
    { retries: 2, shouldRetry: isTransientError }
  );
  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_enrollment_plan_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: programId,
    metadata: { enrollmentCount: implement.enrollmentCount, cohorts: implement.cohorts }
  });
}

export async function saveGuidedReport(
  orgId: string,
  userId: string,
  programId: string,
  evaluate: NonNullable<GuidedProgram['evaluate']>
) {
  const ref = doc(guidedCollection(orgId), programId);
  await retryWithBackoff(
    () => updateDoc(ref, {
      evaluate,
      updatedAt: serverTimestamp(),
      lastModifiedBy: userId
    }),
    { retries: 2, shouldRetry: isTransientError }
  );
  await logGuidedAction({
    orgId,
    actorId: userId,
    action: 'guided_report_saved',
    status: 'success',
    entityType: 'guided_program',
    entityId: programId,
    metadata: { complianceScore: evaluate.complianceScore, metricsCount: evaluate.metrics?.length ?? 0 }
  });
}

export function toGuidedUserError(error: unknown) {
  return toUserErrorMessage(error, 'Unable to save guided workflow changes. Please try again.');
}
