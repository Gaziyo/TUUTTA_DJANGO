import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderOpen,
  BarChart2,
  Layout,
  Edit3,
  PlayCircle,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Check,
  Circle,
  Sparkles,
  Mic,
  Square,
  Plus,
  X
} from 'lucide-react';
import { GeniePipelineProvider, useGeniePipeline, PIPELINE_STAGES, PipelineStage } from '../../context/GeniePipelineContext';
import AdminPageHeader from './AdminPageHeader';
import GenieAutoBuildLauncher from './GenieAutoBuildLauncher';
import { useLMSStore } from '../../store/lmsStore';
import { pipelineService } from '../../services';
import type { GeniePipelineProject } from '../../types/lms';
import { Switch } from '../ui/switch';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import { transcribeAudio } from '../../lib/voice';
import { SpeechSynthesizer } from '../../lib/speech';

// Stage icon mapping
const STAGE_ICONS: Record<PipelineStage, React.ReactNode> = {
  ingest: <FolderOpen className="w-4 h-4" />,
  analyze: <BarChart2 className="w-4 h-4" />,
  design: <Layout className="w-4 h-4" />,
  develop: <Edit3 className="w-4 h-4" />,
  implement: <PlayCircle className="w-4 h-4" />,
  evaluate: <TrendingUp className="w-4 h-4" />
};

interface GeniePipelineProps {
  isDarkMode?: boolean;
}

// Pipeline Step Indicator Component
function PipelineStepIndicator({ isDarkMode }: { isDarkMode: boolean }) {
  const { currentStage, setStage, project, isStageComplete, isStageAccessible } = useGeniePipeline();
  const activeLearningCoverage = (() => {
    if (!project?.design?.instructionalStrategies?.length || !project.design.moduleStructure?.length) return null;
    const modulesCount = project.design.moduleStructure.length;
    if (modulesCount === 0) return null;
    const covered = project.design.instructionalStrategies.filter((entry) => entry.activeLearning.length > 0).length;
    return Math.round((covered / modulesCount) * 100);
  })();

  return (
    <div className={`border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {PIPELINE_STAGES.map((stage, index) => {
            const isActive = currentStage === stage.id;
            const isComplete = isStageComplete(stage.id);
            const isAccessible = isStageAccessible(stage.id);
            const isLast = index === PIPELINE_STAGES.length - 1;

            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => isAccessible && setStage(stage.id)}
                  disabled={!isAccessible}
                  className={`flex flex-col items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? isDarkMode
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'bg-indigo-50 text-indigo-700'
                      : isComplete
                        ? isDarkMode
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isAccessible
                          ? isDarkMode
                            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          : isDarkMode
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? isDarkMode
                          ? 'border-indigo-400 bg-indigo-500/30'
                          : 'border-indigo-500 bg-indigo-100'
                        : isComplete
                          ? isDarkMode
                            ? 'border-emerald-400 bg-emerald-500/30'
                            : 'border-emerald-500 bg-emerald-100'
                          : isAccessible
                            ? isDarkMode
                              ? 'border-gray-500 bg-gray-700'
                              : 'border-gray-300 bg-white'
                            : isDarkMode
                              ? 'border-gray-700 bg-gray-800'
                              : 'border-gray-200 bg-gray-100'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-5 h-5" />
                    ) : isActive ? (
                      STAGE_ICONS[stage.id]
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-semibold ${isActive ? '' : 'opacity-80'}`}>
                      {stage.shortLabel}
                    </p>
                    <p
                      className={`text-[10px] max-w-[100px] truncate ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {isComplete ? 'Complete' : isActive ? 'In progress' : 'Pending'}
                    </p>
                    {stage.id === 'design' && activeLearningCoverage !== null && (
                      <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                        activeLearningCoverage === 100
                          ? isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                          : isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {activeLearningCoverage}% active
                      </span>
                    )}
                  </div>
                </button>

                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isComplete
                        ? isDarkMode
                          ? 'bg-emerald-500/50'
                          : 'bg-emerald-300'
                        : isDarkMode
                          ? 'bg-gray-700'
                          : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
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
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-xl border p-6 ${
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                New Learning Project
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Start your AI-powered course creation journey
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
            <label
              className={`block text-xs font-semibold uppercase tracking-wide mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Workplace Safety Compliance Training"
              className={`w-full px-4 py-3 rounded-xl border text-sm ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              autoFocus
            />
          </div>

          <div>
            <label
              className={`block text-xs font-semibold uppercase tracking-wide mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of the learning objectives..."
              rows={3}
              className={`w-full px-4 py-3 rounded-xl border text-sm resize-none ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
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
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Stage Content Components (will be expanded)
import GenieStageIngest from './pipeline/GenieStageIngest';
import GenieStageAnalyze from './pipeline/GenieStageAnalyze';
import GenieStageDesign from './pipeline/GenieStageDesign';
import GenieStageDevelop from './pipeline/GenieStageDevelop';
import GenieStageImplement from './pipeline/GenieStageImplement';
import GenieStageEvaluate from './pipeline/GenieStageEvaluate';

function StageContent({ isDarkMode }: { isDarkMode: boolean }) {
  const { currentStage } = useGeniePipeline();

  switch (currentStage) {
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
}

function CopilotPanel({
  isDarkMode,
  open,
  onToggle,
  stage,
  project,
  counts,
  autopilotEnabled,
  setAutopilotEnabled,
  autopilotStatus,
  autopilotProgress,
  onAction,
  onUpdatePrompts,
  onAddChatMessage,
  onSendChat,
  width,
  onResizeStart
}: {
  isDarkMode: boolean;
  open: boolean;
  onToggle: () => void;
  stage: PipelineStage;
  project: GeniePipelineProject | null;
  counts: { sources: number; members: number; departments: number; teams: number; enrollments: number };
  autopilotEnabled: boolean;
  setAutopilotEnabled: (value: boolean) => void;
  autopilotStatus: 'idle' | 'running' | 'blocked';
  autopilotProgress: { current: number; total: number } | null;
  onAction: (action: string, payload?: unknown) => void;
  onUpdatePrompts: (stage: PipelineStage, prompts: string[]) => void;
  onAddChatMessage: (message: { role: 'user' | 'assistant'; content: string }) => void;
  onSendChat: (message: string) => Promise<string>;
  width: number;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  type CopilotMessage = NonNullable<GeniePipelineProject['copilot']>['history'][number];
  type CopilotAction = NonNullable<NonNullable<GeniePipelineProject['copilot']>['actionsTaken']>[number];
  const stageMeta: Record<PipelineStage, { title: string; summary: string; needs: string[]; actions: Array<{ id: string; label: string }>; prompts: Array<{ label: string; action: string }> }> = {
    ingest: {
      title: 'Ingest Guidance',
      summary: 'Upload policies, SOPs, and media so AI can analyze your content.',
      needs: ['At least 1 source uploaded'],
      actions: [{ id: 'openUpload', label: 'Show Upload Area' }],
      prompts: []
    },
    analyze: {
      title: 'Analyze Guidance',
      summary: 'AI maps skill gaps, compliance needs, and audience profiles.',
      needs: ['Sources', 'Members', 'Departments', 'Teams'],
      actions: [{ id: 'runAnalysis', label: 'Generate Analysis' }],
      prompts: [
        { label: 'Audience: All learners', action: 'setAudienceAll' },
        { label: 'Audience: By role', action: 'setAudienceRoles' }
      ]
    },
    design: {
      title: 'Design Guidance',
      summary: 'AI proposes objectives, modules, and instructional strategies.',
      needs: ['Analysis results'],
      actions: [{ id: 'runDesign', label: 'Generate Design' }],
      prompts: [
        { label: 'Use analysis objectives', action: 'useAnalysisObjectives' }
      ]
    },
    develop: {
      title: 'Develop Guidance',
      summary: 'AI generates lesson content and assessment drafts.',
      needs: ['Module structure or objectives'],
      actions: [{ id: 'generateAll', label: 'Generate Content' }],
      prompts: []
    },
    implement: {
      title: 'Implement Guidance',
      summary: 'Deploy course, enroll learners, and schedule delivery.',
      needs: ['Enrollment rules', 'Published course'],
      actions: [
        { id: 'addAll', label: 'Add All Employees' },
        { id: 'setSchedule', label: 'Set Dates & Notifications' },
        { id: 'openNotifications', label: 'Open Notification Template' },
        { id: 'deploy', label: 'One‑click Publish' }
      ],
      prompts: []
    },
    evaluate: {
      title: 'Evaluate Guidance',
      summary: 'Track outcomes and schedule reports.',
      needs: ['Enrollments'],
      actions: [
        { id: 'runReport', label: 'Run Report Now' },
        { id: 'enableManagerDigest', label: 'Enable Manager Digest' }
      ],
      prompts: []
    }
  };

  const confidence = (() => {
    switch (stage) {
      case 'analyze':
        return Math.min(100, Math.round((counts.sources > 0 ? 25 : 0) + (counts.members > 0 ? 25 : 0) + (counts.departments > 0 ? 25 : 0) + (counts.teams > 0 ? 25 : 0)));
      case 'design':
        return project?.analysis ? 80 : 40;
      case 'develop':
        return project?.design?.moduleStructure?.length ? 85 : 50;
      case 'implement':
        return project?.implementation?.enrollmentRules?.length ? 80 : 50;
      case 'evaluate':
        return counts.enrollments > 0 ? 85 : 40;
      default:
        return counts.sources > 0 ? 75 : 35;
    }
  })();

  const meta = stageMeta[stage];
  const customPrompts = project?.copilot?.prompts?.[stage] || [];
  const [promptInput, setPromptInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const speechRef = React.useRef<SpeechSynthesizer | null>(null);
  const chatHistory = project?.copilot?.history || [];
  const actionHistory = project?.copilot?.actionsTaken || [];
  const actionableSuggestions = (project?.copilot?.suggestions || []).filter((entry: { action?: string }) => entry.action);
  const suggestionsFollowedCount = actionableSuggestions.filter((entry: { followed?: boolean }) => entry.followed).length;
  const suggestionsIgnoredCount = actionableSuggestions.filter((entry: { followed?: boolean }) => !entry.followed).length;

  useEffect(() => {
    if (!speechRef.current) {
      speechRef.current = new SpeechSynthesizer();
    }
  }, []);

  const addPrompt = () => {
    const next = promptInput.trim();
    if (!next) return;
    onUpdatePrompts(stage, [...customPrompts, next]);
    setPromptInput('');
  };

  const removePrompt = (index: number) => {
    const next = customPrompts.filter((_prompt: string, i: number) => i !== index);
    onUpdatePrompts(stage, next);
  };

  const sendChat = async (override?: string) => {
    if (isSending) return;
    const content = (override ?? chatInput).trim();
    if (!content) return;
    onAddChatMessage({ role: 'user', content });
    setIsSending(true);
    try {
      const reply = await onSendChat(content);
      onAddChatMessage({ role: 'assistant', content: reply });
      await speechRef.current?.speak(reply);
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'AI request failed.';
      const message = raw.startsWith('AI:') || raw.includes('INTERNAL')
        ? 'AI error. Please try again in a moment.'
        : raw;
      onAddChatMessage({ role: 'assistant', content: message });
    } finally {
      setIsSending(false);
    }
    setChatInput('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        audioChunksRef.current = [];
        try {
          const text = await transcribeAudio(blob);
          setChatInput(text);
          await sendChat(text);
        } catch (error) {
          alert((error as Error).message);
        }
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert('Microphone access is required to record audio.');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecording(false);
  };

  return (
    <aside
      className={`transition-all ${
        open ? 'w-80' : 'w-12'
      } absolute right-4 top-4 bottom-4 z-20`}
      style={open ? { width } : undefined}
    >
      <div className={`h-full flex flex-col rounded-2xl shadow-2xl border ${
        isDarkMode ? 'border-indigo-500/30' : 'border-indigo-200'
      } bg-gradient-to-br ${isDarkMode ? 'from-[#2a124d] via-[#1b0f33] to-[#0f0b1f]' : 'from-[#f5e8ff] via-white to-[#efe3ff]'} backdrop-blur`}>
        {open && (
          <div
            onMouseDown={onResizeStart}
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
            title="Drag to resize"
          />
        )}
        <div className={`p-3 border-b ${isDarkMode ? 'border-indigo-500/30' : 'border-indigo-200'} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-indigo-400/30 text-indigo-200' : 'bg-indigo-200 text-indigo-700'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            {open && <span className={`text-sm font-semibold ${isDarkMode ? 'text-indigo-100' : 'text-indigo-900'}`}>AI Co‑Pilot</span>}
          </div>
          <button
            onClick={onToggle}
            className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-indigo-500/20 text-indigo-100' : 'bg-indigo-100 text-indigo-700'}`}
          >
            {open ? 'Collapse' : 'Open'}
          </button>
        </div>

        {open && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Stage</p>
              <p className="text-sm font-semibold">{meta.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{meta.summary}</p>
            </div>

            <div className={`rounded-lg border p-3 ${isDarkMode ? 'border-indigo-500/30 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50'}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">AI confidence</p>
                <span className="text-xs font-semibold">{confidence}%</span>
              </div>
              <div className={`mt-2 h-2 rounded ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
                <div className="h-2 rounded bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" style={{ width: `${confidence}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">Based on available sources and org data.</p>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2">Needs</p>
              <div className="flex flex-wrap gap-2">
                {meta.needs.map((need) => {
                  const met = stage === 'analyze'
                    ? (need === 'Sources' && counts.sources > 0)
                      || (need === 'Members' && counts.members > 0)
                      || (need === 'Departments' && counts.departments > 0)
                      || (need === 'Teams' && counts.teams > 0)
                    : stage === 'evaluate'
                      ? counts.enrollments > 0
                      : true;
                  return (
                    <span
                      key={need}
                      className={`text-[11px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                        met
                          ? isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                          : isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {met ? '✓' : '•'} {need}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-lg border p-3 ${isDarkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <p className="text-xs font-semibold">Suggestion Follow‑Through</p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Followed</span>
                <span className={`font-semibold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>{suggestionsFollowedCount}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Ignored</span>
                <span className={`font-semibold ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>{suggestionsIgnoredCount}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2">Quick Actions</p>
              <div className="space-y-2">
                {meta.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => onAction(action.id)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {meta.prompts.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2">Micro Prompts</p>
                <div className="flex flex-wrap gap-2">
                  {meta.prompts.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => onAction(prompt.action)}
                      className={`text-[11px] px-2 py-1 rounded-full ${
                        isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold mb-2">Editable Prompts</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPrompt()}
                    placeholder="Add a prompt for this stage..."
                    className={`flex-1 px-2.5 py-2 rounded-lg text-xs border ${
                      isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  />
                  <button
                    onClick={addPrompt}
                    className="px-2.5 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customPrompts.map((prompt: string, index: number) => (
                    <span
                      key={`${prompt}-${index}`}
                      className={`text-[11px] px-2 py-1 rounded-full inline-flex items-center gap-2 ${
                        isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {prompt}
                      <button
                        onClick={() => removePrompt(index)}
                        className="text-[10px] opacity-70 hover:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2">Co‑Pilot Chat</p>
              <div className={`rounded-lg border p-2 space-y-2 h-40 overflow-auto ${
                isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'
              }`}>
                {chatHistory.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No messages yet. Ask the co‑pilot for guidance.</p>
                )}
                {chatHistory.map((msg: CopilotMessage) => (
                  <div key={msg.id} className={`text-[11px] ${msg.role === 'assistant' ? 'text-indigo-400' : 'text-gray-500'}`}>
                    <strong className="mr-1">{msg.role === 'assistant' ? 'AI' : 'You'}:</strong>
                    {msg.content}
                  </div>
                ))}
                {actionHistory.length > 0 && (
                  <div className="pt-1 space-y-1">
                    {actionHistory.slice(-6).map((entry: CopilotAction) => {
                      const status = entry.status || 'success';
                      const badgeClass = status === 'success'
                        ? isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                        : status === 'error'
                          ? isDarkMode ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-100 text-rose-700'
                          : isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700';
                      const label = status === 'pending' ? 'Pending' : status === 'error' ? 'Failed' : 'Success';
                      return (
                        <div key={entry.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{entry.action}</span>
                          <span className={`px-2 py-0.5 rounded-full ${badgeClass}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Explain this decision', 'Generate alternatives'].map((label) => (
                  <button
                    key={label}
                    onClick={() => sendChat(label)}
                    className={`text-[11px] px-2 py-1 rounded-full ${
                      isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  placeholder="Ask the co‑pilot..."
                  className={`flex-1 px-2.5 py-2 rounded-lg text-xs border ${
                    isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-2.5 py-2 rounded-lg text-xs font-medium ${
                    isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : isDarkMode
                        ? 'bg-indigo-500/30 text-indigo-100 hover:bg-indigo-500/50'
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Record voice'}
                >
                  {isRecording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => sendChat()}
                  disabled={isSending}
                  className={`px-2.5 py-2 rounded-lg text-xs font-medium ${
                    isSending ? 'bg-indigo-500/50 text-white cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isSending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>

            <div className={`pt-2 border-t ${isDarkMode ? 'border-indigo-500/30' : 'border-indigo-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">AI Co‑Pilot Mode</p>
                  <p className="text-[11px] text-muted-foreground">Auto-suggest and prefill when possible.</p>
                </div>
                <Switch checked={autopilotEnabled} onCheckedChange={setAutopilotEnabled} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-semibold ${
                  autopilotStatus === 'running'
                    ? 'text-emerald-400'
                    : autopilotStatus === 'blocked'
                      ? 'text-amber-400'
                      : 'text-gray-400'
                }`}>
                  {autopilotStatus}
                </span>
              </div>
              {autopilotStatus === 'running' && (
                <button
                  onClick={() => setAutopilotEnabled(false)}
                  className="mt-2 text-[11px] px-2 py-1 rounded bg-red-500/20 text-red-200 hover:bg-red-500/30"
                >
                  Pause Autopilot
                </button>
              )}
              {autopilotProgress && (
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Progress</span>
                    <span>{autopilotProgress.current}/{autopilotProgress.total}</span>
                  </div>
                  <div className={`mt-1 h-1.5 rounded ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
                    <div
                      className="h-1.5 rounded bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500"
                      style={{ width: `${Math.min(100, Math.round((autopilotProgress.current / Math.max(1, autopilotProgress.total)) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// Navigation Footer
function PipelineNavigation({ isDarkMode }: { isDarkMode: boolean }) {
  const {
    currentStage,
    nextStage,
    prevStage,
    canAdvance,
    canGoBack,
    getStageConfig,
    project,
    updateProject
  } = useGeniePipeline();
  const { createGenieDraft, updateGenieDraft, currentOrg, currentMember: _currentMember } = useLMSStore();

  const currentConfig = getStageConfig(currentStage);
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
  const nextConfig = currentIndex < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[currentIndex + 1] : null;
  const prevConfig = currentIndex > 0 ? PIPELINE_STAGES[currentIndex - 1] : null;

  if (!project) return null;

  const handleNext = async () => {
    if (!project) return;
    if (currentStage === 'design') {
      const objectives = project.analysis?.learningObjectives || project.design?.learningObjectives || [];
      const contentGaps = project.analysis?.contentGaps || [];
      const skillGaps = project.analysis?.skillGaps || [];
      const instructionalStrategies = project.design?.instructionalStrategies || [];
      const adultLearningChecklist = project.design?.adultLearningChecklist;
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
          contentGaps,
          skillGaps,
          instructionalStrategies,
          adultLearningChecklist,
          outline
        });
        updateProject({
          draft: {
            ...project.draft,
            learningObjectives: objectives,
            contentGaps,
            skillGaps,
            instructionalStrategies,
            adultLearningChecklist,
            outline
          }
        });
      } else {
        const created = await createGenieDraft({
          orgId: currentOrg?.id || '',
          title: project.design?.courseTitle || project.name,
          sourceIds: project.sourceIds,
          status: 'draft',
          outline,
          learningObjectives: objectives,
          contentGaps,
          skillGaps,
          instructionalStrategies,
          adultLearningChecklist
        });
        updateProject({ draft: created });
      }
    }
    nextStage();
  };

  const stageIsComplete = project.stageStatus[currentStage] === 'completed';

  return (
    <div
      className={`border-t px-6 py-4 flex items-center justify-between ${
        isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <button
        onClick={prevStage}
        disabled={!canGoBack()}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          canGoBack()
            ? isDarkMode
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            : isDarkMode
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
        {prevConfig ? `Back to ${prevConfig.shortLabel}` : 'Back'}
      </button>

      <div className="text-center">
        <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {currentConfig?.label}
        </p>
        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Step {currentIndex + 1} of {PIPELINE_STAGES.length}
        </p>
        {stageIsComplete && (
          <div className="mt-2 text-[11px] text-gray-500">
            Stage completed. You can advance or revisit previous steps.
          </div>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!canAdvance()}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
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
  );
}

// Welcome Screen (when no project is active)
function WelcomeScreen({
  isDarkMode,
  onCreateProject
}: {
  isDarkMode: boolean;
  onCreateProject: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div
          className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center ${
            isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'
          }`}
        >
          <Sparkles className={`w-10 h-10 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
        </div>

        <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          AI-Powered Course Builder
        </h2>
        <p className={`text-base mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Transform your policies, SOPs, and training materials into engaging learning experiences.
          Our AI guides you through the complete ADDIE instructional design framework.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: <FolderOpen className="w-5 h-5" />, label: 'Upload Content', desc: 'PDFs, docs, videos' },
            { icon: <Sparkles className="w-5 h-5" />, label: 'AI Analysis', desc: 'Gap identification' },
            { icon: <PlayCircle className="w-5 h-5" />, label: 'Auto Deploy', desc: 'Enroll & track' }
          ].map((feature) => (
            <div
              key={feature.label}
              className={`p-4 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                  isDarkMode ? 'bg-gray-700 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {feature.icon}
              </div>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {feature.label}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onCreateProject}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Start New Project
        </button>

        <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Follow the ADDIE framework: Analyze → Design → Develop → Implement → Evaluate
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Pipeline Content (inner component with context access)
function GeniePipelineContent({ isDarkMode }: GeniePipelineProps) {
  const {
    project,
    createProject,
    updateProject,
    loadProject,
    currentStage,
    setStage,
    invokeStageAction,
    autopilotEnabled,
    setAutopilotEnabled,
    autopilotStatus,
    autopilotProgress
  } = useGeniePipeline();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchParams] = useSearchParams();
  const {
    currentOrg,
    members,
    departments,
    teams,
    enrollments,
    genieSources
  } = useLMSStore();
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [copilotWidth, setCopilotWidth] = useState(360);
  const chatCompletion = httpsCallable(functions, 'genieChatCompletion');
  const isResizingRef = React.useRef(false);
  const suggestionRef = React.useRef(new Set<string>());

  useEffect(() => {
    const stageParam = searchParams.get('stage') as PipelineStage | null;
    if (!stageParam) return;
    if (PIPELINE_STAGES.some(stage => stage.id === stageParam) && stageParam !== currentStage) {
      setStage(stageParam);
    }
  }, [searchParams, currentStage, setStage]);

  const startResize = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!copilotOpen) return;
    event.preventDefault();
    isResizingRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      const rightEdge = window.innerWidth - 16;
      const nextWidth = Math.min(520, Math.max(280, rightEdge - event.clientX));
      setCopilotWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [currentOrg]);

  const addSuggestion = useCallback((stage: PipelineStage, message: string, action?: string) => {
    if (!project) return;
    const id = `${stage}_${action || message}`;
    if (suggestionRef.current.has(id)) return;
    suggestionRef.current.add(id);
    const suggestion = {
      id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      stage,
      message,
      createdAt: new Date(),
      followed: false,
      action
    };
    updateProject({
      copilot: {
        prompts: project.copilot?.prompts || {},
        history: [
          ...(project.copilot?.history || []),
          {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            role: 'assistant',
            content: `Suggestion: ${message}`,
            createdAt: new Date()
          }
        ],
        actionsTaken: project.copilot?.actionsTaken || [],
        suggestions: [...(project.copilot?.suggestions || []), suggestion]
      }
    });
  }, [project, updateProject]);

  const addStageSummary = useCallback(async (stage: PipelineStage) => {
    if (!project) return;
    const key = `summary_${stage}`;
    if (suggestionRef.current.has(key)) return;
    suggestionRef.current.add(key);
    const systemPrompt = 'You are a concise learning operations assistant. Summarize the completed stage in 2 short sentences.';
    const stageData = stage === 'analyze'
      ? JSON.stringify(project.analysis || {})
      : stage === 'design'
        ? JSON.stringify(project.design || {})
        : stage === 'develop'
          ? JSON.stringify(project.draft || {})
          : stage === 'implement'
            ? JSON.stringify(project.implementation || {})
            : stage === 'evaluate'
              ? JSON.stringify(project.evaluation || {})
              : 'No data';
    try {
      const result = await chatCompletion({
        systemPrompt,
        userPrompt: `Stage: ${stage}\nData: ${stageData}`,
        temperature: 0.2,
        maxTokens: 120,
        orgId: currentOrg?.id
      });
      const payload = result.data as { content?: string };
      const content = payload.content || `Summary for ${stage} completed.`;
      updateProject({
        copilot: {
          prompts: project.copilot?.prompts || {},
          history: [
            ...(project.copilot?.history || []),
            {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              role: 'assistant',
              content: `Summary: ${content}`,
              createdAt: new Date()
            }
          ],
          actionsTaken: project.copilot?.actionsTaken || [],
          suggestions: project.copilot?.suggestions || []
        }
      });
    } catch {
      // ignore summary failures
    }
  }, [project, updateProject, chatCompletion, currentOrg?.id]);

  useEffect(() => {
    if (!project) return;
    if (project.sourceIds.length > 0 && !project.analysis) {
      addSuggestion('analyze', 'Run AI analysis on uploaded sources.', 'runAnalysis');
    }
    if (project.analysis && !project.design) {
      addSuggestion('design', 'Generate design from analysis objectives.', 'runDesign');
    }
    if (project.design && !project.draft) {
      addSuggestion('develop', 'Generate all lesson content from the design.', 'generateAll');
    }
    if (project.implementation?.enrollmentRules?.length) {
      if (!project.implementation.startDate || !project.implementation.endDate) {
        addSuggestion('implement', 'Set start/due dates and notifications.', 'setSchedule');
      }
    }
    if (project.implementation?.courseId && !project.evaluation?.reportSchedule) {
      addSuggestion('evaluate', 'Configure a report schedule for outcomes.', 'runReport');
      addSuggestion('evaluate', 'Enable manager digest notifications for leadership updates.', 'enableManagerDigest');
    }
    if (project.implementation?.courseId) {
      addSuggestion('implement', 'Review and customize your learner notification template.', 'openNotifications');
    }
  }, [project, addSuggestion]);

  useEffect(() => {
    if (!project) return;
    (['analyze', 'design', 'develop', 'implement', 'evaluate'] as PipelineStage[]).forEach((stage) => {
      if (project.stageStatus[stage] === 'completed') {
        addStageSummary(stage);
      }
    });
  }, [project?.stageStatus, addStageSummary, project]);

  const serializeProject = useCallback((input: typeof project): GeniePipelineProject | null => {
    if (!input || !currentOrg) return null;
    const clean = (value: unknown): unknown => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (Array.isArray(value)) {
        const next = value.map(clean).filter((item) => item !== undefined);
        return next;
      }
      if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
          .map(([key, val]) => [key, clean(val)])
          .filter(([, val]) => val !== undefined);
        return Object.fromEntries(entries);
      }
      return value;
    };

    return {
      id: input.id,
      orgId: currentOrg.id,
      name: input.name,
      description: input.description,
      createdAt: input.createdAt.getTime(),
      updatedAt: input.updatedAt.getTime(),
      sourceIds: input.sourceIds,
      sources: clean(input.sources) || [],
      analysis: clean(input.analysis),
      design: clean(input.design),
      draft: clean(input.draft),
      implementation: input.implementation
        ? {
          ...input.implementation,
          startDate: input.implementation.startDate ? input.implementation.startDate.getTime() : undefined,
          endDate: input.implementation.endDate ? input.implementation.endDate.getTime() : undefined
        }
        : undefined,
      evaluation: clean(input.evaluation),
      stageStatus: input.stageStatus,
      stageApprovals: input.stageApprovals,
      approvalHistory: input.approvalHistory.map((entry) => clean({
        ...entry,
        approvedAt: entry.approvedAt.getTime()
      }))
      ,
      copilot: input.copilot
        ? {
          prompts: input.copilot.prompts,
          history: input.copilot.history.map((msg) => ({
            ...msg,
            createdAt: msg.createdAt.getTime()
          })),
          actionsTaken: (input.copilot.actionsTaken || []).map((entry) => ({
            ...entry,
            createdAt: entry.createdAt.getTime()
          })),
          suggestions: (input.copilot.suggestions || []).map((entry) => ({
            ...entry,
            createdAt: entry.createdAt.getTime()
          }))
        }
        : undefined
    };
  }, [currentOrg]);

  const deserializeProject = useCallback((input: GeniePipelineProject) => ({
    ...input,
    sources: input.sources || [],
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
    implementation: input.implementation
      ? {
        ...input.implementation,
        startDate: input.implementation.startDate ? new Date(input.implementation.startDate) : undefined,
        endDate: input.implementation.endDate ? new Date(input.implementation.endDate) : undefined
      }
      : undefined,
    approvalHistory: (input.approvalHistory || []).map((entry) => ({
      ...entry,
      approvedAt: new Date(entry.approvedAt)
    })),
    copilot: input.copilot
      ? {
        prompts: input.copilot.prompts || {},
        history: (input.copilot.history || []).map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        })),
        actionsTaken: (input.copilot.actionsTaken || []).map((entry) => ({
          ...entry,
          createdAt: new Date(entry.createdAt)
        })),
        suggestions: (input.copilot.suggestions || []).map((entry) => ({
          ...entry,
          createdAt: new Date(entry.createdAt)
        }))
      }
      : undefined
  }), []);

  useEffect(() => {
    if (!currentOrg?.id || project) return;
    let active = true;
    (async () => {
      const projects = await pipelineService.list(currentOrg.id, 1);
      if (!active || projects.length === 0) return;
      loadProject(deserializeProject(projects[0]));
    })();
    return () => {
      active = false;
    };
  }, [currentOrg?.id, project, loadProject, deserializeProject]);

  useEffect(() => {
    if (!project || !currentOrg?.id) return;
    const serialized = serializeProject(project);
    if (!serialized) return;

    const timeout = setTimeout(async () => {
      if (serialized.id.startsWith('project_')) {
        const created = await pipelineService.create({
          orgId: serialized.orgId,
          name: serialized.name,
          description: serialized.description,
          createdAt: serialized.createdAt,
          updatedAt: serialized.updatedAt,
          sourceIds: serialized.sourceIds,
          sources: serialized.sources || [],
          analysis: serialized.analysis,
          design: serialized.design,
          draft: serialized.draft,
          implementation: serialized.implementation,
          evaluation: serialized.evaluation,
          stageStatus: serialized.stageStatus,
          stageApprovals: serialized.stageApprovals,
          approvalHistory: serialized.approvalHistory
        });
        updateProject({ id: created.id });
        return;
      }
      await pipelineService.update(serialized.id, serialized);
    }, 600);

    return () => clearTimeout(timeout);
  }, [project, currentOrg?.id, updateProject, serializeProject]);

  const handleCreateProject = (name: string, description: string) => {
    createProject(name, description);
    setShowCreateModal(false);
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <AdminPageHeader
        title="Genie AI Pipeline"
        subtitle="Complete ADDIE instructional design workflow powered by AI"
        isDarkMode={isDarkMode ?? false}
        badge="AI"
        actions={
          <div className="flex items-center gap-3">
            <GenieAutoBuildLauncher
              isDarkMode={isDarkMode ?? false}
              buttonClassName="btn-primary-min flex items-center gap-2"
            />
            <button
              onClick={() => setCopilotOpen((prev) => !prev)}
              className={`px-3 py-2 rounded-lg text-xs font-medium ${
                isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copilotOpen ? 'Hide Co‑Pilot' : 'Show Co‑Pilot'}
            </button>
            {project && (
              <>
                <div className={`px-3 py-1.5 rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {project.name}
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-500 text-indigo-500 hover:bg-indigo-500/10 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </>
            )}
          </div>
        }
      />

      {project ? (
        <>
          <PipelineStepIndicator isDarkMode={isDarkMode ?? false} />
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-auto pr-24">
              <StageContent isDarkMode={isDarkMode ?? false} />
            </div>
            <CopilotPanel
              isDarkMode={isDarkMode ?? false}
              open={copilotOpen}
              onToggle={() => setCopilotOpen((prev) => !prev)}
              stage={currentStage}
              project={project}
              counts={{
                sources: genieSources.length,
                members: members.length,
                departments: departments.length,
                teams: teams.length,
                enrollments: enrollments.length
              }}
              autopilotEnabled={autopilotEnabled}
              setAutopilotEnabled={setAutopilotEnabled}
              autopilotStatus={autopilotStatus}
              autopilotProgress={autopilotProgress}
              onAction={async (action) => {
                if (!project) {
                  invokeStageAction(currentStage, action);
                  return;
                }
                const actionEntry = {
                  id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  stage: currentStage,
                  action,
                  status: 'pending' as const,
                  createdAt: new Date()
                };
                const suggestions = (project.copilot?.suggestions || []).map((entry) =>
                  entry.stage === currentStage && entry.action === action
                    ? { ...entry, followed: true }
                    : entry
                );
                const actionsTaken = [...(project.copilot?.actionsTaken || []), actionEntry];
                updateProject({
                  copilot: {
                    prompts: project.copilot?.prompts || {},
                    history: project.copilot?.history || [],
                    actionsTaken,
                    suggestions
                  }
                });
                try {
                  await invokeStageAction(currentStage, action);
                  updateProject({
                    copilot: {
                      prompts: project.copilot?.prompts || {},
                      history: project.copilot?.history || [],
                      actionsTaken: actionsTaken.map((entry) =>
                        entry.id === actionEntry.id
                          ? { ...entry, status: 'success' as const }
                          : entry
                      ),
                      suggestions
                    }
                  });
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Action failed.';
                  updateProject({
                    copilot: {
                      prompts: project.copilot?.prompts || {},
                      history: project.copilot?.history || [],
                      actionsTaken: actionsTaken.map((entry) =>
                        entry.id === actionEntry.id
                          ? { ...entry, status: 'error' as const, error: message }
                          : entry
                      ),
                      suggestions
                    }
                  });
                }
              }}
              width={copilotWidth}
              onResizeStart={startResize}
              onUpdatePrompts={(stage, prompts) => {
                updateProject({
                  copilot: {
                    prompts: {
                      ...(project.copilot?.prompts || {}),
                      [stage]: prompts
                    },
                    history: project.copilot?.history || [],
                    actionsTaken: project.copilot?.actionsTaken || [],
                    suggestions: project.copilot?.suggestions || []
                  }
                });
              }}
              onAddChatMessage={(message) => {
                const next = {
                  id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  role: message.role,
                  content: message.content,
                  createdAt: new Date()
                };
                updateProject({
                  copilot: {
                    prompts: project.copilot?.prompts || {},
                    history: [...(project.copilot?.history || []), next],
                    actionsTaken: project.copilot?.actionsTaken || [],
                    suggestions: project.copilot?.suggestions || []
                  }
                });
              }}
              onSendChat={async (message) => {
                const suggestionsList = project?.copilot?.suggestions || [];
                const actionableSuggestions = suggestionsList.filter((entry) => entry.action);
                const suggestionsFollowed = actionableSuggestions.filter((entry) => entry.followed).length;
                const suggestionsIgnored = actionableSuggestions.filter((entry) => !entry.followed).length;
                const actionsTaken = project?.copilot?.actionsTaken || [];
                const actionErrors = actionsTaken.filter((entry) => entry.status === 'error');
                const lastAction = actionsTaken.length ? actionsTaken[actionsTaken.length - 1] : null;
                const analysisSummary = project?.analysis
                  ? {
                    targetAudience: project.analysis.targetAudience,
                    learningNeeds: project.analysis.learningNeeds?.slice(0, 5),
                    skillGaps: project.analysis.skillGaps?.slice(0, 5),
                    constraints: project.analysis.constraints?.slice(0, 4),
                    objectives: project.analysis.learningObjectives?.slice(0, 5),
                    complianceMapping: project.analysis.complianceMapping
                      ? {
                        sources: project.analysis.complianceMapping.sources?.slice(0, 5),
                        tags: project.analysis.complianceMapping.tags?.slice(0, 8),
                        suggestedRoles: project.analysis.complianceMapping.suggestedRoles?.slice(0, 5)
                      }
                      : null,
                    contentGaps: project.analysis.contentGaps?.slice(0, 5),
                    learnerProfiles: project.analysis.learnerProfiles
                      ? {
                        roles: project.analysis.learnerProfiles.roles?.slice(0, 6),
                        departments: project.analysis.learnerProfiles.departments?.slice(0, 6),
                        teams: project.analysis.learnerProfiles.teams?.slice(0, 6)
                      }
                      : null
                  }
                  : null;
                const designSummary = project?.design
                  ? {
                    courseTitle: project.design.courseTitle,
                    objectives: project.design.learningObjectives?.slice(0, 5),
                    modules: project.design.moduleStructure?.slice(0, 4)?.map((m) => m.title)
                  }
                  : null;
                const developSummary = project?.draft
                  ? {
                    draftTitle: project.draft.title,
                    outlineModules: project.draft.outline?.slice(0, 4)?.map((m) => m.title)
                  }
                  : null;
                const implementSummary = project?.implementation
                  ? {
                    enrollmentRules: project.implementation.enrollmentRules?.slice(0, 5),
                    startDate: project.implementation.startDate,
                    endDate: project.implementation.endDate
                  }
                  : null;
                const evaluationSummary = project?.evaluation
                  ? {
                    metrics: project.evaluation.metrics?.slice(0, 6),
                    feedbackEnabled: project.evaluation.feedbackEnabled,
                    reportSchedule: project.evaluation.reportSchedule
                  }
                  : null;
                const enrollmentStats = enrollments.length
                  ? {
                    total: enrollments.length,
                    completed: enrollments.filter((e) => e.status === 'completed').length,
                    inProgress: enrollments.filter((e) => e.status === 'in_progress').length,
                    overdue: enrollments.filter((e) => e.status === 'overdue').length,
                    sample: enrollments.slice(0, 5).map((e) => ({
                      id: e.id,
                      status: e.status,
                      progress: e.progress ?? 0
                    }))
                  }
                  : null;
                const avgProgress = enrollments.length
                  ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress ?? 0), 0) / enrollments.length)
                  : null;
                const completionRate = enrollments.length
                  ? Math.round((enrollments.filter((e) => e.status === 'completed').length / enrollments.length) * 100)
                  : null;
                const coursePerformance = enrollments.length
                  ? {
                    avgScore: Math.round(
                      enrollments.reduce((sum, e) => sum + (e.score ?? 0), 0) / enrollments.length
                    )
                  }
                  : null;
                const complianceCompletionRate = enrollments.length
                  ? Math.round((enrollments.filter((e) => e.status === 'completed').length / enrollments.length) * 100)
                  : null;
                const assessmentSummary = project?.draft?.outline
                  ? {
                    assessmentsLinked: project.draft.outline.filter((m) =>
                      m.lessons?.some((lesson) => lesson.type === 'quiz' || lesson.type === 'assignment')
                    ).length,
                    totalAssessments: project.draft.outline.reduce((sum, m) =>
                      sum + m.lessons.filter((lesson) => lesson.type === 'quiz' || lesson.type === 'assignment').length, 0)
                  }
                  : null;
                const assessmentResults = enrollments.filter((e) => typeof e.score === 'number');
                const assessmentResultsSummary = assessmentResults.length
                  ? {
                    count: assessmentResults.length,
                    avgScore: Math.round(assessmentResults.reduce((sum, e) => sum + (e.score ?? 0), 0) / assessmentResults.length),
                    passRate: Math.round((assessmentResults.filter((e) => (e.score ?? 0) >= 70).length / assessmentResults.length) * 100),
                    sample: assessmentResults.slice(0, 5).map((e) => ({
                      enrollmentId: e.id,
                      score: e.score,
                      status: e.status
                    }))
                  }
                  : null;
                const systemPrompt = `You are the Tuutta Genie AI co-pilot. Provide concise, actionable guidance for the ${currentStage} stage.`;
                const userPrompt = `Stage: ${currentStage}
Project: ${project?.name || 'Untitled'}
Data counts: sources=${genieSources.length}, members=${members.length}, departments=${departments.length}, teams=${teams.length}, enrollments=${enrollments.length}
Analysis summary: ${analysisSummary ? JSON.stringify(analysisSummary) : 'N/A'}
Design summary: ${designSummary ? JSON.stringify(designSummary) : 'N/A'}
Develop summary: ${developSummary ? JSON.stringify(developSummary) : 'N/A'}
Implement summary: ${implementSummary ? JSON.stringify(implementSummary) : 'N/A'}
Evaluation summary: ${evaluationSummary ? JSON.stringify(evaluationSummary) : 'N/A'}
Enrollment stats: ${enrollmentStats ? JSON.stringify(enrollmentStats) : 'N/A'}
Average progress: ${avgProgress !== null ? avgProgress + '%' : 'N/A'}
Completion rate: ${completionRate !== null ? completionRate + '%' : 'N/A'}
Course performance: ${coursePerformance ? JSON.stringify(coursePerformance) : 'N/A'}
Compliance completion rate: ${complianceCompletionRate !== null ? complianceCompletionRate + '%' : 'N/A'}
Assessment summary: ${assessmentSummary ? JSON.stringify(assessmentSummary) : 'N/A'}
Assessment results summary: ${assessmentResultsSummary ? JSON.stringify(assessmentResultsSummary) : 'N/A'}
Suggestions followed: ${suggestionsFollowed}
Suggestions ignored: ${suggestionsIgnored}
Actions taken: ${actionsTaken.length}
Action errors: ${actionErrors.length}
Last action: ${lastAction ? `${lastAction.action} (${lastAction.status || 'success'})` : 'N/A'}
User: ${message}

Respond in 2-4 short sentences with next steps tailored to this stage.`;
                const result = await chatCompletion({
                  systemPrompt,
                  userPrompt,
                  temperature: 0.3,
                  maxTokens: 220,
                  orgId: currentOrg?.id
                });
                const payload = result.data as { content?: string };
                return payload.content || 'No response returned.';
              }}
            />
          </div>
          <PipelineNavigation isDarkMode={isDarkMode ?? false} />
        </>
      ) : (
        <WelcomeScreen isDarkMode={isDarkMode ?? false} onCreateProject={() => setShowCreateModal(true)} />
      )}

      {showCreateModal && (
        <ProjectCreationModal
          isDarkMode={isDarkMode ?? false}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
        />
      )}
    </div>
  );
}

// Main Component with Provider wrapper
const GeniePipeline: React.FC<GeniePipelineProps> = ({ isDarkMode = false }) => {
  return (
    <GeniePipelineProvider>
      <GeniePipelineContent isDarkMode={isDarkMode} />
    </GeniePipelineProvider>
  );
};

export default GeniePipeline;
