import React, { useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
  PIPELINE_STAGES,
  PipelineStage,
  useGeniePipeline
} from '../../../context/GeniePipelineContext';
import { useAppContext } from '../../../context/AppContext';
import GenieStageIngest from '../pipeline/GenieStageIngest';
import GenieStageAnalyze from '../pipeline/GenieStageAnalyze';
import GenieStageDesign from '../pipeline/GenieStageDesign';
import GenieStageDevelop from '../pipeline/GenieStageDevelop';
import GenieStageImplement from '../pipeline/GenieStageImplement';
import GenieStageEvaluate from '../pipeline/GenieStageEvaluate';

interface GuidedStagePageProps {
  stage: PipelineStage;
  isDarkMode?: boolean;
}

const STAGE_ROUTES: Record<PipelineStage, string> = {
  ingest: '/admin/genie/ingestion',
  analyze: '/admin/genie/analyze',
  design: '/admin/genie/design',
  develop: '/admin/genie/develop',
  implement: '/admin/genie/implement',
  evaluate: '/admin/genie/evaluate'
};

const StageRenderer: React.FC<{ stage: PipelineStage; isDarkMode: boolean }> = ({ stage, isDarkMode }) => {
  switch (stage) {
    case 'ingest':
      return <GenieStageIngest isDarkMode={isDarkMode} />;
    case 'analyze':
      return <GenieStageAnalyze isDarkMode={isDarkMode} />;
    case 'design':
      return <GenieStageDesign isDarkMode={isDarkMode} />;
    case 'develop':
      return <GenieStageDevelop isDarkMode={isDarkMode} />;
    case 'implement':
      return <GenieStageImplement isDarkMode={isDarkMode} />;
    case 'evaluate':
      return <GenieStageEvaluate isDarkMode={isDarkMode} />;
    default:
      return null;
  }
};

const GuidedStagePage: React.FC<GuidedStagePageProps> = ({ stage, isDarkMode = false }) => {
  const { navigate } = useAppContext();
  const {
    project,
    setStage,
    createProject,
    markStageInProgress
  } = useGeniePipeline();

  const stageIndex = useMemo(() => PIPELINE_STAGES.findIndex(s => s.id === stage), [stage]);
  const stageConfig = PIPELINE_STAGES[stageIndex];
  const prevStage = stageIndex > 0 ? PIPELINE_STAGES[stageIndex - 1].id : null;
  const nextStage = stageIndex < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[stageIndex + 1].id : null;

  useEffect(() => {
    setStage(stage);
    if (project && project.stageStatus[stage] === 'pending') {
      markStageInProgress(stage);
    }
  }, [project, stage, markStageInProgress, setStage]);

  if (!project) {
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
            createProject('New Genie Program');
            markStageInProgress(stage);
            setStage(stage);
          }}
        >
          Start new program
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-purple-500">Genie AI Guided Flow</div>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              {stageConfig.label}
            </h1>
            <p className="mt-2 text-sm text-gray-600">{stageConfig.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              Step {stageIndex + 1} of {PIPELINE_STAGES.length}
            </span>
            <button
              type="button"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
              onClick={() => navigate('/admin/genie-guided')}
            >
              Guided overview
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <StageRenderer stage={stage} isDarkMode={isDarkMode} />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
            prevStage ? 'border-gray-200 text-gray-700 hover:border-gray-300' : 'border-gray-100 text-gray-300 cursor-not-allowed'
          }`}
          onClick={() => {
            if (!prevStage) return;
            navigate(STAGE_ROUTES[prevStage]);
          }}
          disabled={!prevStage}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
            nextStage ? 'border-purple-200 text-purple-700 hover:border-purple-300' : 'border-gray-100 text-gray-300 cursor-not-allowed'
          }`}
          onClick={() => {
            if (!nextStage) return;
            navigate(STAGE_ROUTES[nextStage]);
          }}
          disabled={!nextStage}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default GuidedStagePage;
