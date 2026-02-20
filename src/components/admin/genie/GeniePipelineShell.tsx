import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Sparkles, X, Plus, BarChart3, Award, Bell, ChevronDown, LayoutTemplate } from 'lucide-react';
import { GeniePipelineProvider, useGeniePipeline, PIPELINE_STAGES, PipelineStage } from '../../../context/GeniePipelineContext';
import { useLMSStore } from '../../../store/lmsStore';
import { pipelineService } from '../../../services';
import CopilotSidebar from './CopilotSidebar';
import { BreadcrumbNav, PipelineProgress } from './BreadcrumbNav';
import { getStageColor } from './StageColors';
import { StageContentSkeleton } from './SkeletonLoader';
import { OnboardingTour } from './OnboardingTour';
import { TemplateGallery, ProjectTemplate } from './TemplateGallery';
import { SplitView, SplitViewToggle, useSplitView } from './SplitView';
import { MobileBottomSheet, MobileStageSelector, useIsMobile } from './MobileBottomSheet';
import './animations.css';

// Lazy load stage components
const GenieStageIngest = lazy(() => import('../pipeline/GenieStageIngest'));
const GenieStageAnalyze = lazy(() => import('../pipeline/GenieStageAnalyze'));
const GenieStageDesign = lazy(() => import('../pipeline/GenieStageDesign'));
const GenieStageDevelop = lazy(() => import('../pipeline/GenieStageDevelop'));
const GenieStageImplement = lazy(() => import('../pipeline/GenieStageImplement'));
const GenieStageEvaluate = lazy(() => import('../pipeline/GenieStageEvaluate'));

// Lazy load toolkit panels
const GenieAnalytics = lazy(() => import('../GenieAnalytics'));
const GenieCompliance = lazy(() => import('../GenieCompliance'));
const GenieNotifications = lazy(() => import('../GenieNotifications'));

interface GeniePipelineShellProps {
  isDarkMode?: boolean;
}

// Stage Rail Component - horizontal navigation with color coding
function StageRail({ isDarkMode }: { isDarkMode: boolean }) {
  const { currentStage, setStage, isStageComplete, isStageAccessible } = useGeniePipeline();

  return (
    <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-center justify-center gap-1">
        {PIPELINE_STAGES.map((stage, index) => {
          const isActive = currentStage === stage.id;
          const isComplete = isStageComplete(stage.id);
          const isAccessible = isStageAccessible(stage.id);
          const isLast = index === PIPELINE_STAGES.length - 1;
          const stageColor = getStageColor(stage.id);

          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => isAccessible && setStage(stage.id)}
                disabled={!isAccessible}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl transition-all genie-btn-press ${
                  isActive
                    ? isDarkMode
                      ? `${stageColor.darkBg} ${stageColor.textColor}`
                      : `${stageColor.lightBg} ${stageColor.textColor}`
                    : isComplete
                      ? isDarkMode
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-emerald-600 hover:bg-emerald-50'
                      : isAccessible
                        ? isDarkMode
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        : isDarkMode
                          ? 'text-gray-700 cursor-not-allowed'
                          : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive
                      ? isDarkMode
                        ? `bg-gradient-to-br ${stageColor.gradient} text-white`
                        : `bg-gradient-to-br ${stageColor.gradient} text-white`
                      : isComplete
                        ? isDarkMode
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-emerald-100 text-emerald-600'
                        : isAccessible
                          ? isDarkMode
                            ? 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          : isDarkMode
                            ? 'bg-gray-900 text-gray-700'
                            : 'bg-gray-50 text-gray-300'
                  }`}
                >
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isActive ? '' : 'opacity-80'}`}>
                  {stage.shortLabel}
                </span>
              </button>

              {!isLast && (
                <div
                  className={`w-8 h-0.5 rounded-full ${
                    isComplete
                      ? isDarkMode
                        ? 'bg-emerald-500/50'
                        : 'bg-emerald-300'
                      : isDarkMode
                        ? 'bg-gray-800'
                        : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Project Header Component with Breadcrumbs
function ProjectHeader({
  isDarkMode,
  onNewProject,
  onToggleCopilot,
  copilotOpen
}: {
  isDarkMode: boolean;
  onNewProject: () => void;
  onToggleCopilot: () => void;
  copilotOpen: boolean;
}) {
  const { project, currentStage, stageStatus } = useGeniePipeline();
  
  // Calculate completed stages
  const completedStages = Object.entries(stageStatus)
    .filter(([, status]) => status === 'completed')
    .map(([stage]) => stage as PipelineStage);

  return (
    <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
          }`}>
            <Sparkles className="w-5 h-5 genie-sparkle" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {project?.name || 'Genie AI Pipeline'}
              </h1>
              {project && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  ADDIE
                </span>
              )}
            </div>
            {/* Breadcrumb Navigation */}
            <div className="mt-1">
              <BreadcrumbNav
                projectName={project?.name}
                currentStage={project ? currentStage : undefined}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Pipeline Progress Mini Indicator */}
          {project && (
            <PipelineProgress
              currentStage={currentStage}
              completedStages={completedStages}
              isDarkMode={isDarkMode}
            />
          )}
          
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleCopilot}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 genie-btn-press ${
                copilotOpen
                  ? isDarkMode
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-indigo-100 text-indigo-600'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
              Co-Pilot
            </button>
            {project && (
              <button
                onClick={onNewProject}
                className={`p-1.5 rounded-lg transition-colors genie-btn-press ${
                  isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stage Content Renderer
function StageContent({ isDarkMode }: { isDarkMode: boolean }) {
  const { currentStage } = useGeniePipeline();

  // Use skeleton loader for better perceived performance
  const fallback = <StageContentSkeleton isDarkMode={isDarkMode} />;

  return (
    <Suspense fallback={fallback}>
      {currentStage === 'ingest' && <GenieStageIngest isDarkMode={isDarkMode} />}
      {currentStage === 'analyze' && <GenieStageAnalyze isDarkMode={isDarkMode} />}
      {currentStage === 'design' && <GenieStageDesign isDarkMode={isDarkMode} />}
      {currentStage === 'develop' && <GenieStageDevelop isDarkMode={isDarkMode} />}
      {currentStage === 'implement' && <GenieStageImplement isDarkMode={isDarkMode} />}
      {currentStage === 'evaluate' && <GenieStageEvaluate isDarkMode={isDarkMode} />}
    </Suspense>
  );
}

// Navigation Footer
function StageNavigation({ isDarkMode }: { isDarkMode: boolean }) {
  const {
    currentStage,
    nextStage,
    prevStage,
    canAdvance,
    canGoBack,
    project,
    updateProject,
    approveStage
  } = useGeniePipeline();
  const { createGenieDraft, updateGenieDraft, currentOrg, currentMember } = useLMSStore();

  const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
  const nextConfig = currentIndex < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[currentIndex + 1] : null;
  const prevConfig = currentIndex > 0 ? PIPELINE_STAGES[currentIndex - 1] : null;

  if (!project) return null;

  const handleNext = async () => {
    if (!project) return;

    // Handle design → develop transition
    if (currentStage === 'design' && project.design) {
      const objectives = project.analysis?.learningObjectives || project.design?.learningObjectives || [];
      const modules = project.design?.moduleStructure || [];
      const outline = modules.map((module, index) => ({
        moduleId: `module_${index + 1}_${Date.now()}`,
        title: module.title,
        lessons: module.topics.map((topic, topicIndex) => ({
          id: `lesson_${index + 1}_${topicIndex + 1}_${Date.now()}`,
          title: topic,
          type: 'text' as const,
          content: { htmlContent: '<p>Lesson content placeholder.</p>' },
          duration: 10,
          order: topicIndex + 1,
          isRequired: true
        }))
      }));

      if (project.draft) {
        await updateGenieDraft(project.draft.id, {
          learningObjectives: objectives,
          outline
        });
        updateProject({
          draft: { ...project.draft, learningObjectives: objectives, outline }
        });
      } else {
        const created = await createGenieDraft({
          orgId: currentOrg?.id || '',
          title: project.design?.courseTitle || project.name,
          sourceIds: project.sourceIds,
          status: 'draft',
          outline,
          learningObjectives: objectives
        });
        updateProject({ draft: created });
      }
    }

    nextStage();
  };

  const approvalStatus = project.stageApprovals[currentStage];
  const stageIsComplete = project.stageStatus[currentStage] === 'completed';
  const needsApproval = stageIsComplete && approvalStatus !== 'approved';

  return (
    <div className={`px-6 py-3 border-t flex items-center justify-between ${
      isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'
    }`}>
      <button
        onClick={prevStage}
        disabled={!canGoBack()}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
          canGoBack()
            ? isDarkMode
              ? 'text-gray-300 hover:bg-gray-800'
              : 'text-gray-600 hover:bg-gray-100'
            : isDarkMode
              ? 'text-gray-700 cursor-not-allowed'
              : 'text-gray-300 cursor-not-allowed'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
        {prevConfig?.shortLabel || 'Back'}
      </button>

      <div className="flex items-center gap-3">
        {needsApproval && (
          <button
            onClick={() => approveStage(currentStage, currentMember ? { id: currentMember.id, name: currentMember.name } : undefined)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Check className="w-3.5 h-3.5 inline mr-1" />
            Approve Stage
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={!canAdvance()}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            canAdvance()
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : isDarkMode
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {nextConfig ? `Continue to ${nextConfig.shortLabel}` : 'Finish'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Toolkit Bar Component
type ToolkitPanel = 'analytics' | 'compliance' | 'notifications' | null;

function ToolkitBar({
  isDarkMode,
  activePanel,
  onPanelChange
}: {
  isDarkMode: boolean;
  activePanel: ToolkitPanel;
  onPanelChange: (panel: ToolkitPanel) => void;
}) {
  const tools = [
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'compliance' as const, label: 'Compliance', icon: Award },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell }
  ];

  return (
    <div className={`px-6 py-2 border-t flex items-center justify-center gap-1 ${
      isDarkMode ? 'border-gray-800 bg-gray-900/80' : 'border-gray-100 bg-gray-50'
    }`}>
      <span className={`text-[10px] uppercase tracking-wider mr-3 ${
        isDarkMode ? 'text-gray-600' : 'text-gray-400'
      }`}>
        Toolkit
      </span>
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onPanelChange(activePanel === tool.id ? null : tool.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activePanel === tool.id
              ? isDarkMode
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'bg-indigo-100 text-indigo-700'
              : isDarkMode
                ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          <tool.icon className="w-3.5 h-3.5" />
          {tool.label}
          <ChevronDown className={`w-3 h-3 transition-transform ${activePanel === tool.id ? 'rotate-180' : ''}`} />
        </button>
      ))}
    </div>
  );
}

// Toolkit Panel Slide-over
function ToolkitPanel({
  isDarkMode,
  activePanel,
  onClose
}: {
  isDarkMode: boolean;
  activePanel: ToolkitPanel;
  onClose: () => void;
}) {
  if (!activePanel) return null;

  const titles: Record<Exclude<ToolkitPanel, null>, string> = {
    analytics: 'Analytics',
    compliance: 'Compliance',
    notifications: 'Notifications'
  };

  return (
    <div className={`border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      <div className={`flex items-center justify-between px-6 py-2 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {titles[activePanel]}
        </span>
        <button
          onClick={onClose}
          className={`p-1 rounded transition-colors ${
            isDarkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-200 text-gray-400'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className={`h-80 overflow-auto ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
        <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
          {activePanel === 'analytics' && <GenieAnalytics isDarkMode={isDarkMode} embedded />}
          {activePanel === 'compliance' && <GenieCompliance isDarkMode={isDarkMode} embedded />}
          {activePanel === 'notifications' && <GenieNotifications isDarkMode={isDarkMode} embedded />}
        </Suspense>
      </div>
    </div>
  );
}

// Project Creation Modal
function ProjectCreationModal({
  isDarkMode,
  onClose,
  onSubmit
}: {
  isDarkMode: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), description.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl shadow-xl border p-6 ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                New Genie Project
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Create an AI-powered learning project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q1 Compliance Training"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              autoFocus
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of the learning initiative..."
              rows={2}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium ${
                isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Welcome Screen - ADDIE Framework
function WelcomeScreen({
  isDarkMode,
  onCreateProject,
  onBrowseTemplates
}: {
  isDarkMode: boolean;
  onCreateProject: () => void;
  onBrowseTemplates?: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${
          isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'
        }`}>
          <Sparkles className={`w-8 h-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
        </div>

        <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Genie AI Pipeline
        </h2>
        <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Transform content into effective learning experiences using the ADDIE instructional design framework.
        </p>

        {/* ADDIE Framework Overview */}
        <div className="grid grid-cols-6 gap-2 mb-6">
          {[
            { num: 1, name: 'Ingest', desc: 'Upload Content', color: '#3b82f6' },
            { num: 2, name: 'Analyze', desc: 'Identify Gaps', color: '#8b5cf6' },
            { num: 3, name: 'Design', desc: 'Structure Course', color: '#f59e0b' },
            { num: 4, name: 'Develop', desc: 'Create Content', color: '#10b981' },
            { num: 5, name: 'Implement', desc: 'Deploy & Enroll', color: '#6366f1' },
            { num: 6, name: 'Evaluate', desc: 'Track Outcomes', color: '#f43f5e' }
          ].map((stage) => (
            <div
              key={stage.num}
              className={`p-3 rounded-xl genie-card-hover ${
                isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'
              }`}
            >
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: stage.color }}
              >
                {stage.num}
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stage.name}
              </p>
              <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {stage.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Key Features */}
        <div className={`text-left p-4 rounded-xl mb-6 ${isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            AI-Powered Features
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>AI Content Analysis</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Auto-Generated Objectives</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Smart Course Structure</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Assessment Generation</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>One-Click Deployment</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Progress Analytics</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onCreateProject}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all duration-200 genie-btn-press"
          >
            <Plus className="w-4 h-4" />
            Start New Project
          </button>
          {onBrowseTemplates && (
            <button
              onClick={onBrowseTemplates}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 genie-btn-press ${
                isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              Browse Templates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Shell Content
function GeniePipelineShellContent({ isDarkMode }: GeniePipelineShellProps) {
  const {
    project,
    createProject,
    updateProject,
    loadProject,
    currentStage,
    setStage
  } = useGeniePipeline();

  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [toolkitPanel, setToolkitPanel] = useState<ToolkitPanel>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const { isSplitView, secondaryStage, setSecondaryStage, toggleSplitView, closeSplitView } = useSplitView();
  const isMobile = useIsMobile();
  const { currentOrg, genieSources, members, departments, teams, enrollments } = useLMSStore();

  // Sync stage with URL
  useEffect(() => {
    const stageParam = searchParams.get('stage') as PipelineStage | null;
    if (stageParam && PIPELINE_STAGES.some(s => s.id === stageParam)) {
      // Stage sync handled by context
    }
  }, [searchParams]);

  useEffect(() => {
    const current = searchParams.get('stage');
    if (current !== currentStage) {
      const next = new URLSearchParams(searchParams);
      next.set('stage', currentStage);
      if (next.toString() === searchParams.toString()) {
        return;
      }
      setSearchParams(next, { replace: true });
    }
  }, [currentStage, searchParams, setSearchParams]);

  // Load existing project
  useEffect(() => {
    if (!currentOrg?.id || project) return;
    let active = true;
    (async () => {
      const projects = await pipelineService.list(currentOrg.id, 1);
      if (!active || projects.length === 0) return;
      loadProject({
        ...projects[0],
        sources: projects[0].sources || [],
        createdAt: new Date(projects[0].createdAt),
        updatedAt: new Date(projects[0].updatedAt),
        approvalHistory: (projects[0].approvalHistory || []).map((entry) => ({
          ...entry,
          approvedAt: new Date(entry.approvedAt)
        }))
      });
    })();
    return () => { active = false; };
  }, [currentOrg?.id, project, loadProject]);

  // Auto-save project
  useEffect(() => {
    if (!project || !currentOrg?.id) return;

    const timeout = setTimeout(async () => {
      const serialized = {
        ...project,
        orgId: currentOrg.id,
        createdAt: project.createdAt.getTime(),
        updatedAt: Date.now(),
        approvalHistory: project.approvalHistory.map((entry) => ({
          ...entry,
          approvedAt: entry.approvedAt.getTime()
        }))
      };

      if (project.id.startsWith('project_')) {
        const created = await pipelineService.create(serialized);
        updateProject({ id: created.id });
      } else {
        await pipelineService.update(project.id, serialized);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [project, currentOrg?.id, updateProject]);

  const handleCreateProject = (name: string, description: string) => {
    createProject(name, description);
    setShowCreateModal(false);
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    createProject(template.name, template.description);
    setShowTemplateGallery(false);
    // Could pre-populate with template data here
  };

  // Available stages for split view (exclude current and adjacent)
  const availableStagesForSplit = PIPELINE_STAGES
    .filter(s => s.id !== currentStage)
    .map(s => s.id);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Onboarding Tour */}
      <OnboardingTour isDarkMode={isDarkMode} />

      {/* Header */}
      <ProjectHeader
        isDarkMode={isDarkMode ?? false}
        onNewProject={() => setShowCreateModal(true)}
        onToggleCopilot={() => setCopilotOpen(prev => !prev)}
        copilotOpen={copilotOpen}
      />

      {project ? (
        <>
          {/* Mobile Stage Selector */}
          {isMobile && (
            <div className="px-4 py-2 border-b md:hidden" data-tour="stage-rail">
              <MobileStageSelector
                currentStage={currentStage}
                stages={PIPELINE_STAGES.map(s => ({ 
                  id: s.id, 
                  label: s.label,
                  color: getStageColor(s.id).color 
                }))}
                isDarkMode={isDarkMode}
                onSelect={(stageId) => setStage(stageId as PipelineStage)}
              />
            </div>
          )}

          {/* Desktop Stage Rail */}
          {!isMobile && <div data-tour="stage-rail"><StageRail isDarkMode={isDarkMode ?? false} /></div>}

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {isSplitView ? (
              <SplitView
                primaryStage={currentStage}
                secondaryStage={secondaryStage}
                primaryContent={<StageContent isDarkMode={isDarkMode ?? false} />}
                secondaryContent={
                  <div className="p-4">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Split view content for {secondaryStage}
                    </p>
                  </div>
                }
                isDarkMode={isDarkMode ?? false}
                onClose={closeSplitView}
                onSwap={() => setStage(secondaryStage)}
              />
            ) : (
              <>
                {/* Stage Content */}
                <div className={`flex-1 overflow-auto ${copilotOpen && !isMobile ? 'mr-80' : ''}`}>
                  <StageContent isDarkMode={isDarkMode ?? false} />
                </div>

                {/* Copilot Sidebar - Desktop */}
                {copilotOpen && !isMobile && (
                  <div data-tour="copilot-sidebar">
                    <CopilotSidebar
                      isDarkMode={isDarkMode ?? false}
                      onClose={() => setCopilotOpen(false)}
                      counts={{
                        sources: genieSources.length,
                        members: members.length,
                        departments: departments.length,
                        teams: teams.length,
                        enrollments: enrollments.length
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stage Navigation */}
          <StageNavigation isDarkMode={isDarkMode ?? false} />

          {/* Toolkit Panel (slide-over) */}
          <ToolkitPanel
            isDarkMode={isDarkMode ?? false}
            activePanel={toolkitPanel}
            onClose={() => setToolkitPanel(null)}
          />

          {/* Toolkit Bar */}
          <ToolkitBar
            isDarkMode={isDarkMode ?? false}
            activePanel={toolkitPanel}
            onPanelChange={setToolkitPanel}
          />

          {/* Split View Toggle */}
          {!isMobile && project && (
            <div className="fixed bottom-4 left-4 z-30">
              <SplitViewToggle
                isActive={isSplitView}
                isDarkMode={isDarkMode}
                onClick={toggleSplitView}
              />
            </div>
          )}

          {/* Mobile Copilot Sheet */}
          <MobileBottomSheet
            isOpen={showMobileSheet}
            onClose={() => setShowMobileSheet(false)}
            title="AI Co-Pilot"
            isDarkMode={isDarkMode}
          >
            <div className="p-4">
              <CopilotSidebar
                isDarkMode={isDarkMode ?? false}
                onClose={() => setShowMobileSheet(false)}
                counts={{
                  sources: genieSources.length,
                  members: members.length,
                  departments: departments.length,
                  teams: teams.length,
                  enrollments: enrollments.length
                }}
              />
            </div>
          </MobileBottomSheet>

          {/* Mobile FAB for Copilot */}
          {isMobile && copilotOpen && (
            <button
              onClick={() => setShowMobileSheet(true)}
              className={`fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 ${
                isDarkMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              <Sparkles className="w-6 h-6" />
            </button>
          )}
        </>
      ) : (
        <WelcomeScreen
          isDarkMode={isDarkMode ?? false}
          onCreateProject={() => setShowCreateModal(true)}
          onBrowseTemplates={() => setShowTemplateGallery(true)}
        />
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <ProjectCreationModal
          isDarkMode={isDarkMode ?? false}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
        />
      )}

      {/* Template Gallery */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        isDarkMode={isDarkMode ?? false}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}

// Main Component with Provider
const GeniePipelineShell: React.FC<GeniePipelineShellProps> = ({ isDarkMode = false }) => {
  return (
    <GeniePipelineProvider>
      <GeniePipelineShellContent isDarkMode={isDarkMode} />
    </GeniePipelineProvider>
  );
};

export default GeniePipelineShell;
