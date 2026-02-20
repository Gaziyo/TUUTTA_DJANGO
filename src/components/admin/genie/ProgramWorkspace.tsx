import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Sparkles, Upload } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { GUIDED_STAGES, GuidedStage, useGuidedPipeline } from '../../../context/GuidedPipelineContext';
import { uploadFile } from '../../../lib/storage';
import { useStore } from '../../../store';
import { useAppContext } from '../../../context/AppContext';
import { useLMSStore } from '../../../store/lmsStore';
import { organizationService } from '../../../services/organizationService';
import {
  addGuidedSource,
  loadGuidedProgramVersions,
  saveGuidedAnalysis,
  saveGuidedDraft,
  saveGuidedEnrollmentPlan,
  saveGuidedReport,
  toGuidedUserError
} from '../../../services/guidedService';
import { observabilityService } from '../../../services/observabilityService';
import AICommandBar from './AICommandBar';


const STAGE_LABELS: Record<GuidedStage, { addie: string; helper: string }> = {
  ingest: {
    addie: 'Analyze',
    helper: 'Upload sources and capture baseline context.'
  },
  analyze: {
    addie: 'Analyze',
    helper: 'Define learner needs, roles, and skill gaps.'
  },
  design: {
    addie: 'Design',
    helper: 'Translate objectives into a learning blueprint.'
  },
  develop: {
    addie: 'Develop',
    helper: 'Generate lessons, activities, and draft content.'
  },
  implement: {
    addie: 'Implement',
    helper: 'Enroll cohorts and schedule delivery.'
  },
  evaluate: {
    addie: 'Evaluate',
    helper: 'Review impact, compliance, and outcomes.'
  }
};

const StageRenderer: React.FC<{ stage: GuidedStage }> = ({ stage }) => {
  const { program, updateProgram, markStageComplete, markStageInProgress: _markStageInProgress, setStage } = useGuidedPipeline();
  const { user } = useStore();
  const { currentOrg, setCurrentOrg } = useLMSStore();
  const { navigate, orgContext } = useAppContext();
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const hydrateOrgContext = async () => {
      if (currentOrg?.id || !orgContext?.orgId) return;
      const org = await organizationService.get(orgContext.orgId);
      if (!mounted || !org) return;
      setCurrentOrg(org);
    };

    void hydrateOrgContext();
    return () => {
      mounted = false;
    };
  }, [currentOrg?.id, orgContext?.orgId, setCurrentOrg]);

  useEffect(() => {
    if (!program) return;
    let nextInput = '';
    switch (stage) {
      case 'ingest':
        nextInput = '';
        break;
      case 'analyze':
        nextInput = (program.analysis?.roles ?? []).join(', ');
        break;
      case 'design':
        nextInput = (program.design?.objectives ?? []).join('\n');
        break;
      case 'develop':
        nextInput = program.develop?.draftId ?? '';
        break;
      case 'implement':
        nextInput = program.implement?.enrollmentCount?.toString() ?? '';
        break;
      case 'evaluate':
        nextInput = (program.evaluate?.metrics ?? []).join(', ');
        break;
      default:
        nextInput = '';
    }
    setInput(prev => (prev === nextInput ? prev : nextInput));
  }, [program, stage]);

  if (!program) return null;

  const withStageFeedback = async (action: () => Promise<void>, successMessage: string) => {
    setFeedback(null);
    setIsSaving(true);
    try {
      await action();
      setFeedback({ type: 'success', message: successMessage });
      if (currentOrg?.id) {
        void observabilityService.logUserAction({
          orgId: currentOrg.id,
          actorId: user?.id,
          action: `guided_stage_${stage}_saved`,
          status: 'success',
          entityType: 'guided_program',
          entityId: program.id
        });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: toGuidedUserError(error) });
      if (currentOrg?.id) {
        void observabilityService.logUserAction({
          orgId: currentOrg.id,
          actorId: user?.id,
          action: `guided_stage_${stage}_save_failed`,
          status: 'error',
          entityType: 'guided_program',
          entityId: program.id,
          errorMessage: toGuidedUserError(error)
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!currentOrg?.id || !user?.id) {
      setFeedback({ type: 'error', message: 'Please join an organization and sign in before saving.' });
      return;
    }

    switch (stage) {
      case 'ingest':
        if (!input.trim()) {
          setFeedback({ type: 'error', message: 'Add a source name before saving.' });
          return;
        }
        await withStageFeedback(async () => {
          const source = {
            id: `manual_${Date.now()}`,
            name: input.trim(),
            type: 'manual',
            content: '',
            extractedText: '',
            size: 0
          };
          await addGuidedSource(currentOrg.id, user.id, program.id, source);
          updateProgram({ sources: [...program.sources, source] });
          markStageComplete('ingest');
          setStage('analyze');
          setInput('');
        }, 'Source saved.');
        break;
      case 'analyze': {
        const roles = input.split(',').map(v => v.trim()).filter(Boolean);
        if (!program.sources.length) {
          setFeedback({ type: 'error', message: 'Upload at least one source before Analyze.' });
          return;
        }
        await withStageFeedback(async () => {
          const analysis = { roles, gaps: [] as string[] };
          await saveGuidedAnalysis(currentOrg.id, user.id, program.id, analysis);
          updateProgram({ analysis });
          markStageComplete('analyze');
        }, 'Analysis saved.');
        break;
      }
      case 'design': {
        const objectives = input.split('\n').map(v => v.trim()).filter(Boolean);
        if (!program.analysis?.roles?.length) {
          setFeedback({ type: 'error', message: 'Complete Analyze before Design.' });
          return;
        }
        await withStageFeedback(async () => {
          updateProgram({ design: { objectives } });
          markStageComplete('design');
        }, 'Design saved.');
        break;
      }
      case 'develop': {
        if (!program.design?.objectives?.length) {
          setFeedback({ type: 'error', message: 'Define design objectives before Develop.' });
          return;
        }
        await withStageFeedback(async () => {
          const develop = {
            draftId: input.trim() || `draft_${Date.now()}`,
            lessonCount: Math.max(1, program.design?.objectives?.length || 1)
          };
          await saveGuidedDraft(currentOrg.id, user.id, program.id, develop);
          updateProgram({ develop });
          markStageComplete('develop');
        }, 'Draft saved.');
        break;
      }
      case 'implement': {
        if (!program.develop?.draftId) {
          setFeedback({ type: 'error', message: 'Generate a draft before Implement.' });
          return;
        }
        const count = Number(input);
        if (!Number.isFinite(count) || count < 0) {
          setFeedback({ type: 'error', message: 'Enrollment count must be a non-negative number.' });
          return;
        }
        await withStageFeedback(async () => {
          const implement = {
            enrollmentCount: Math.trunc(count),
            cohorts: program.analysis?.roles?.length ? program.analysis.roles : []
          };
          await saveGuidedEnrollmentPlan(currentOrg.id, user.id, program.id, implement);
          updateProgram({ implement });
          markStageComplete('implement');
        }, 'Enrollment plan saved.');
        break;
      }
      case 'evaluate': {
        if (!program.implement || (program.implement.enrollmentCount ?? -1) < 0) {
          setFeedback({ type: 'error', message: 'Complete Implement before Evaluate.' });
          return;
        }
        const metrics = input.split(',').map(v => v.trim()).filter(Boolean);
        const complianceScore = Math.min(100, 60 + (metrics.length * 10));
        await withStageFeedback(async () => {
          const evaluate = { metrics, complianceScore };
          await saveGuidedReport(currentOrg.id, user.id, program.id, evaluate);
          updateProgram({ evaluate });
          markStageComplete('evaluate');
        }, 'Evaluation saved.');
        break;
      }
      default:
        break;
    }
  };

  const label = GUIDED_STAGES.find(item => item.id === stage)?.shortLabel;
  const helper = STAGE_LABELS[stage]?.helper;
  const toGuidedSurface = (surface: string) => `/admin/genie-guided?stage=${stage}&surface=${surface}`;
  const toSurfaceRoute = (surface: string) => {
    const mappedRoute: Record<string, string> = {
      'sources-beta': '/admin/genie/sources',
      'draft-studio-beta': '/admin/genie/studio',
      'assessments-beta': '/admin/genie/assessments',
      'enrollments-beta': '/admin/genie/enrollments',
      'analytics-beta': '/admin/genie/analytics',
      'compliance-beta': '/admin/genie/compliance'
    };
    return mappedRoute[surface] || toGuidedSurface(surface);
  };

  const inferRolesAndGaps = () => {
    if (!program?.sources.length) return;
    const text = program.sources.map(source => `${source.name} ${source.extractedText ?? ''}`.toLowerCase()).join(' ');
    const roles = new Set<string>();
    const gaps = new Set<string>();
    if (text.includes('security') || text.includes('cyber')) roles.add('Security Analysts');
    if (text.includes('privacy') || text.includes('gdpr')) roles.add('Compliance Officers');
    if (text.includes('finance') || text.includes('invoice')) roles.add('Finance Team');
    if (text.includes('hr') || text.includes('employee')) roles.add('HR Team');
    if (text.includes('safety') || text.includes('incident')) roles.add('Operations Leads');
    if (roles.size === 0) roles.add('All Staff');

    if (text.includes('policy')) gaps.add('Policy comprehension');
    if (text.includes('procedure') || text.includes('sop')) gaps.add('Process adherence');
    if (gaps.size === 0) gaps.add('Knowledge baseline');

    const rolesList = Array.from(roles);
    const gapsList = Array.from(gaps);
    const startedAt = Date.now();
    if (currentOrg?.id) {
      void observabilityService.logAICall({
        orgId: currentOrg.id,
        actorId: user?.id,
        operation: 'guided_roles_and_gaps_inference',
        status: 'started',
        entityType: 'guided_program',
        entityId: program.id
      });
    }
    void withStageFeedback(async () => {
      if (!currentOrg?.id || !user?.id) {
        throw new Error('Please sign in to save analysis.');
      }
      await saveGuidedAnalysis(currentOrg.id, user.id, program.id, { roles: rolesList, gaps: gapsList });
      updateProgram({ analysis: { roles: rolesList, gaps: gapsList } });
      markStageComplete('analyze');
      setInput(rolesList.join(', '));
      void observabilityService.logAICall({
        orgId: currentOrg.id,
        actorId: user.id,
        operation: 'guided_roles_and_gaps_inference',
        status: 'success',
        entityType: 'guided_program',
        entityId: program.id,
        provider: 'heuristic',
        model: 'rules-v1',
        latencyMs: Date.now() - startedAt,
        metadata: { rolesCount: rolesList.length, gapsCount: gapsList.length }
      });
    }, 'Analysis generated and saved.');
  };

  const extractObjectives = () => {
    if (!program?.sources.length) return;
    const sourceMatches = program.sources.map(source => {
      const lines = (source.extractedText ?? '')
        .split(/\n|\r|\./)
        .map(line => line.trim())
        .filter(Boolean);
      const matched = lines.filter(line => /(objective|should|must|shall|required)/i.test(line));
      return {
        sourceId: source.id,
        sourceName: source.name,
        total: lines.length,
        matched,
        confidence: lines.length ? Math.min(1, matched.length / lines.length) : 0
      };
    });
    const raw = sourceMatches.flatMap(item => item.matched);
    const matched = raw;
    const objectives = matched.slice(0, 8);
    if (!objectives.length) {
      objectives.push('Understand key policy requirements');
      objectives.push('Apply procedures to real scenarios');
    }
    const totalLines = sourceMatches.reduce((sum, item) => sum + item.total, 0);
    const confidence = totalLines ? Math.min(1, matched.length / totalLines) : 0.2;
    const objectiveExtraction = objectives.map(text => ({
      text,
      rule: matched.includes(text) ? 'keyword' : 'fallback'
    }));
    const startedAt = Date.now();
    if (currentOrg?.id) {
      void observabilityService.logAICall({
        orgId: currentOrg.id,
        actorId: user?.id,
        operation: 'guided_objective_extraction',
        status: 'started',
        entityType: 'guided_program',
        entityId: program.id
      });
    }
    void withStageFeedback(async () => {
      updateProgram({
        design: {
          objectives,
          objectiveConfidence: Number(confidence.toFixed(2)),
          objectiveExtraction,
          sourceConfidence: sourceMatches.map(item => ({
            sourceId: item.sourceId,
            sourceName: item.sourceName,
            confidence: Number(item.confidence.toFixed(2)),
            matched: item.matched.slice(0, 3)
          }))
        }
      });
      markStageComplete('design');
      setInput(objectives.join('\n'));
      if (currentOrg?.id) {
        void observabilityService.logAICall({
          orgId: currentOrg.id,
          actorId: user?.id,
          operation: 'guided_objective_extraction',
          status: 'success',
          entityType: 'guided_program',
          entityId: program.id,
          provider: 'heuristic',
          model: 'rules-v1',
          latencyMs: Date.now() - startedAt,
          metadata: { objectivesCount: objectives.length, confidence: Number(confidence.toFixed(2)) }
        });
      }
    }, 'Objectives extracted and saved.');
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!user?.id) {
      setFeedback({ type: 'error', message: 'Please sign in to upload files.' });
      return;
    }
    if (!currentOrg?.id) {
      setFeedback({ type: 'error', message: 'Please join an organization before uploading files.' });
      return;
    }
    setFeedback(null);
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of Array.from(files)) {
        if (currentOrg?.id) {
          void observabilityService.logIngestionEvent({
            orgId: currentOrg.id,
            actorId: user.id,
            action: 'guided_file_upload_started',
            status: 'started',
            sourceName: file.name,
            sourceType: file.type,
            size: file.size,
            metadata: { programId: program.id }
          });
        }
        const result = await uploadFile(file, user.id);
        await addGuidedSource(currentOrg.id, user.id, program.id, result);
        void observabilityService.logIngestionEvent({
          orgId: currentOrg.id,
          actorId: user.id,
          action: 'guided_file_upload_completed',
          status: 'success',
          entityId: result.id,
          sourceName: result.name,
          sourceType: result.type,
          size: result.size,
          metadata: { programId: program.id }
        });
        uploaded.push(result);
      }
      updateProgram({ sources: [...program.sources, ...uploaded] });
      markStageComplete('ingest');
      setStage('analyze');
      setFeedback({ type: 'success', message: 'Files uploaded and saved.' });
    } catch (error) {
      if (currentOrg?.id) {
        void observabilityService.logIngestionEvent({
          orgId: currentOrg.id,
          actorId: user.id,
          action: 'guided_file_upload_failed',
          status: 'error',
          metadata: { programId: program.id },
          errorMessage: toGuidedUserError(error)
        });
      }
      setFeedback({ type: 'error', message: toGuidedUserError(error) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
        <p className="text-sm text-gray-600">{helper}</p>
      </div>

      {stage === 'ingest' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 hover:border-purple-300 cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload files'}
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => handleFileUpload(event.target.files)}
              />
            </label>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Or add a source name (e.g., Security Policy)"
              className="flex-1 min-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            <button
              type="button"
              onClick={() => { void handleComplete(); }}
              disabled={isSaving || uploading}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Add source
            </button>
          </div>
          {feedback?.type === 'error' && (
            <div className="text-xs text-red-600">{feedback.message}</div>
          )}
          {feedback?.type === 'success' && (
            <div className="text-xs text-emerald-600">{feedback.message}</div>
          )}
          {program.sources.length > 0 && (
            <div className="text-xs text-gray-500">
              Sources: {program.sources.map(source => source.name).join(', ')}
            </div>
          )}
        </div>
      )}

      {stage === 'analyze' && (
        <div className="space-y-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Roles (comma separated)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { void handleComplete(); }}
              disabled={isSaving}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save analysis
            </button>
            <button
              type="button"
              onClick={inferRolesAndGaps}
              disabled={!program.sources.length || isSaving}
              className="rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 disabled:opacity-60"
            >
              Run analysis
            </button>
          </div>
          {feedback && (
            <div className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
              {feedback.message}
            </div>
          )}
          {program.analysis && (
            <div className="text-xs text-gray-500">
              Roles: {program.analysis.roles.join(', ')} · Gaps: {program.analysis.gaps.join(', ')}
            </div>
          )}
        </div>
      )}

      {stage === 'design' && (
        <div className="space-y-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Objectives (one per line)"
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { void handleComplete(); }}
              disabled={isSaving}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save design
            </button>
            <button
              type="button"
              onClick={extractObjectives}
              disabled={!program.sources.length || isSaving}
              className="rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 disabled:opacity-60"
            >
              Extract objectives
            </button>
          </div>
          {feedback && (
            <div className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
              {feedback.message}
            </div>
          )}
          {program.design?.objectives?.length ? (
            <div className="text-xs text-gray-500">
              Objectives: {program.design.objectives.join(' • ')}
              {typeof program.design.objectiveConfidence === 'number' && (
                <span className="ml-2 text-[11px] text-gray-400">
                  Confidence: {Math.round(program.design.objectiveConfidence * 100)}%
                </span>
              )}
            </div>
          ) : null}
          {typeof program.design?.objectiveConfidence === 'number' && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Objective confidence</div>
              <div className="mt-2 h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-purple-500"
                  style={{ width: `${Math.round(program.design.objectiveConfidence * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 12 }).map((_, index) => {
                  const filled = index / 12 < (program.design?.objectiveConfidence ?? 0);
                  return (
                    <span
                      key={index}
                      className={`h-1.5 w-1.5 rounded-full ${filled ? 'bg-purple-500' : 'bg-gray-200'}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
          {program.design?.sourceConfidence?.length ? (
            <div className="rounded-lg border border-gray-100 bg-white p-3 text-xs text-gray-600">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Confidence by source</div>
              <div className="mt-3 space-y-2">
                {program.design.sourceConfidence.map(source => (
                  <div key={source.sourceId} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">{source.sourceName}</span>
                      <span className="text-[11px] text-gray-500">{Math.round(source.confidence * 100)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-purple-400"
                        style={{ width: `${Math.round(source.confidence * 100)}%` }}
                      />
                    </div>
                    {source.matched.length > 0 && (
                      <div className="mt-2 text-[11px] text-gray-500">
                        Matches: {source.matched.join(' • ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {stage === 'develop' && (
        <div className="space-y-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Draft ID (optional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <button
            type="button"
            onClick={() => { void handleComplete(); }}
            disabled={isSaving}
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Generate lessons
          </button>
          {feedback && (
            <div className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
              {feedback.message}
            </div>
          )}
        </div>
      )}

      {stage === 'implement' && (
        <div className="space-y-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Enrollment count"
            type="number"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <button
            type="button"
            onClick={() => { void handleComplete(); }}
            disabled={isSaving}
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save launch
          </button>
          {feedback && (
            <div className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
              {feedback.message}
            </div>
          )}
        </div>
      )}

      {stage === 'evaluate' && (
        <div className="space-y-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Metrics (comma separated)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <button
            type="button"
            onClick={() => { void handleComplete(); }}
            disabled={isSaving}
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save evaluation
          </button>
          {feedback && (
            <div className={`text-xs ${feedback.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
              {feedback.message}
            </div>
          )}
        </div>
      )}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
        <div className="text-[11px] uppercase tracking-wide text-gray-400">Related module</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {stage === 'ingest' && (
            <button
              type="button"
              onClick={() => navigate(toSurfaceRoute('sources-beta'))}
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
            >
              Sources (Beta) <ExternalLink className="w-3 h-3" />
            </button>
          )}
          {stage === 'analyze' && (
            <button
              type="button"
              onClick={() => navigate(toGuidedSurface('legacy-analyze'))}
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
            >
              Analyze (Genie, Beta) <ExternalLink className="w-3 h-3" />
            </button>
          )}
          {stage === 'design' && (
            <button
              type="button"
              onClick={() => navigate(toGuidedSurface('legacy-design'))}
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
            >
              Design (Genie, Beta) <ExternalLink className="w-3 h-3" />
            </button>
          )}
          {stage === 'develop' && (
            <>
              <button
                type="button"
                onClick={() => navigate(toSurfaceRoute('draft-studio-beta'))}
                className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
              >
                Draft Studio (Beta) <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => navigate(toSurfaceRoute('assessments-beta'))}
                className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
              >
                Assessments (Beta) <ExternalLink className="w-3 h-3" />
              </button>
            </>
          )}
          {stage === 'implement' && (
            <button
              type="button"
              onClick={() => navigate(toSurfaceRoute('enrollments-beta'))}
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
            >
              Enrollments (Beta) <ExternalLink className="w-3 h-3" />
            </button>
          )}
          {stage === 'evaluate' && (
            <>
              <button
                type="button"
                onClick={() => navigate(toSurfaceRoute('analytics-beta'))}
                className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
              >
                Analytics (Beta) <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => navigate(toSurfaceRoute('compliance-beta'))}
                className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
              >
                Compliance (Beta) <ExternalLink className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const WorkspaceInner: React.FC = () => {
  const {
    program,
    currentStage,
    setStage,
    createProgram,
    markStageInProgress,
    isPersisting,
    persistenceError,
    lastSavedAt,
    clearPersistenceError
  } = useGuidedPipeline();
  const { currentOrg } = useLMSStore();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showAllSteps, setShowAllSteps] = useState(false);
  const [laterOpen, setLaterOpen] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; stage: string; createdAt: Date; snapshot?: unknown }>>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  const stageOrder = GUIDED_STAGES.map(stage => stage.id);
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedStage = urlParams.get('stage');
  const surface = urlParams.get('surface');
  const validRequestedStage = stageOrder.includes(requestedStage as GuidedStage)
    ? (requestedStage as GuidedStage)
    : null;

  const nowStage = currentStage;

  const nextStage = useMemo(() => {
    const currentIndex = stageOrder.indexOf(nowStage);
    return stageOrder[currentIndex + 1];
  }, [nowStage, stageOrder]);

  const laterStages = useMemo(() => {
    const currentIndex = stageOrder.indexOf(nowStage);
    return stageOrder.slice(currentIndex + 2);
  }, [nowStage, stageOrder]);

  useEffect(() => {
    if (!validRequestedStage) return;
    setStage(validRequestedStage);
  }, [setStage, validRequestedStage]);

  useEffect(() => {
    const currentUrlStage = urlParams.get('stage');
    if (currentUrlStage === currentStage) return;
    const next = new URLSearchParams(urlParams);
    next.set('stage', currentStage);
    setSearchParams(next, { replace: true });
  }, [currentStage, setSearchParams, urlParams]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentOrg?.id || !program?.id) return;
      setVersionsLoading(true);
      setVersionsError(null);
      try {
        const data = await loadGuidedProgramVersions(currentOrg.id, program.id);
        if (!mounted) return;
        setVersions(data.map(item => ({
          id: item.id,
          stage: item.stage,
          createdAt: item.createdAt,
          snapshot: item.snapshot
        })));
      } catch (error) {
        if (!mounted) return;
        setVersionsError(toGuidedUserError(error));
      } finally {
        if (mounted) setVersionsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentOrg?.id, program?.id]);

  if (!program) {
    return (
      <div className="rounded-3xl border border-dashed border-purple-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">Genie AI — Guided (ADDIE)</h2>
        <p className="mt-2 text-sm text-gray-600">
          Build a compliant learning program in minutes with a calm, step-by-step workflow.
        </p>
        <button
          className="mt-6 inline-flex items-center rounded-full bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          onClick={() => {
            createProgram('New Guided Program');
            markStageInProgress('ingest');
          }}
        >
          Start new program
        </button>
      </div>
    );
  }

  const nowMeta = STAGE_LABELS[nowStage];
  const nextMeta = nextStage ? STAGE_LABELS[nextStage] : null;
  const surfaceBadge = surface
    ? surface.includes('internal')
      ? 'Internal Surface'
      : 'Beta Surface'
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-purple-500">Genie AI Guided Flow</div>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">Genie AI — Guided (ADDIE)</h1>
            <p className="mt-2 text-sm text-gray-600">Goal‑oriented, self‑directed, and aligned to ADDIE & SAM.</p>
          </div>
          <div className="flex items-center gap-2">
            {surfaceBadge && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                {surfaceBadge}
              </span>
            )}
            <button
              type="button"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
              onClick={() => setShowAllSteps(!showAllSteps)}
            >
              {showAllSteps ? 'Show focused view' : 'Show all steps'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isPersisting && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
              Saving changes…
            </span>
          )}
          {lastSavedAt && !isPersisting && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              Saved at {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
          {persistenceError && (
            <button
              type="button"
              onClick={clearPersistenceError}
              className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700"
              title="Dismiss"
            >
              Save issue: {persistenceError}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-purple-500">Now</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {nowMeta.addie} — {GUIDED_STAGES.find(stage => stage.id === nowStage)?.shortLabel}
            </div>
            <p className="mt-1 text-sm text-gray-600">{nowMeta.helper}</p>
          </div>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            Step {stageOrder.indexOf(nowStage) + 1} of {stageOrder.length}
          </span>
        </div>
        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <StageRenderer stage={nowStage} />
        </div>
      </div>

      {nextStage && (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-400">Next</div>
          <div className="mt-1 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {nextMeta?.addie} — {GUIDED_STAGES.find(stage => stage.id === nextStage)?.shortLabel}
              </div>
              <p className="mt-1 text-sm text-gray-600">{nextMeta?.helper}</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 hover:border-purple-300"
              onClick={() => setStage(nextStage)}
            >
              Jump to next
            </button>
          </div>
        </div>
      )}

      {showAllSteps && (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-gray-700"
            onClick={() => setLaterOpen(!laterOpen)}
          >
            {laterOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Later steps
          </button>
          {laterOpen && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {laterStages.map(stage => {
                const meta = STAGE_LABELS[stage];
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setStage(stage)}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left hover:border-purple-200"
                  >
                    <div className="text-xs uppercase tracking-wide text-gray-400">Later</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {meta.addie} — {GUIDED_STAGES.find(step => step.id === stage)?.shortLabel}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{meta.helper}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <AICommandBar />

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Version history</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">Recent snapshots</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-purple-200 px-3 py-1 text-[11px] font-semibold text-purple-700"
              onClick={() => {
                if (!program) return;
                const blob = new Blob([JSON.stringify(program, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `guided_program_${program.id}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download JSON
            </button>
            <button
              type="button"
              className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-700"
              onClick={() => {
                const rows = program?.design?.sourceConfidence ?? [];
                if (!rows.length) return;
                const csv = [
                  'sourceId,sourceName,confidence,matched',
                  ...rows.map(row => (
                    `${row.sourceId},"${row.sourceName.replace(/"/g, '""')}",${row.confidence},` +
                    `"${row.matched.join(' | ').replace(/"/g, '""')}"`
                  ))
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `guided_objective_confidence_${program?.id ?? 'program'}.csv`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!program?.design?.sourceConfidence?.length}
            >
              Export confidence CSV
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-xs text-gray-600">
          {versionsLoading && <div>Loading versions…</div>}
          {versionsError && <div className="text-red-600">{versionsError}</div>}
          {!versionsLoading && !versionsError && versions.length === 0 && <div>No versions yet.</div>}
          {versions.slice(0, 5).map(version => (
            <div key={version.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedVersionId(expandedVersionId === version.id ? null : version.id)}
              >
                <div>
                  <div className="font-semibold text-gray-800">Stage: {version.stage}</div>
                  <div className="text-[11px] text-gray-500">{version.createdAt.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!version.snapshot) return;
                      const blob = new Blob([JSON.stringify(version.snapshot, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `guided_snapshot_${version.stage}_${version.id}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    JSON
                  </button>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                    {expandedVersionId === version.id ? 'Hide' : 'View'}
                  </span>
                </div>
              </button>
              {expandedVersionId === version.id && version.snapshot && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-gray-500">Snapshot JSON</div>
                    <button
                      type="button"
                      className="rounded-full border border-purple-200 px-3 py-1 text-[11px] font-semibold text-purple-700"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(version.snapshot, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `guided_snapshot_${version.stage}_${version.id}.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Download JSON
                    </button>
                  </div>
                  <pre className="max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-[11px] text-gray-600">
{JSON.stringify(version.snapshot, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProgramWorkspace: React.FC = () => {
  return <WorkspaceInner />;
};

export default ProgramWorkspace;
