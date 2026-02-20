import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layout,
  Target,
  Layers,
  Sparkles,
  RefreshCw,
  PlusCircle,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Pyramid
} from 'lucide-react';
import { useGeniePipeline } from '../../../context/GeniePipelineContext';
import AdminSection from '../AdminSection';
import { useLMSStore } from '../../../store/lmsStore';
import { generateGenieOutline } from '../../../lib/genie';
import { validateOutline } from '../../../lib/genieValidation';

interface GenieStageDesignProps {
  isDarkMode: boolean;
}

interface ModuleStructure {
  title: string;
  description: string;
  topics: string[];
}

const GenieStageDesign: React.FC<GenieStageDesignProps> = ({ isDarkMode }) => {
  const { project, updateProject, markStageComplete, markStageInProgress, registerStageActions, autopilotEnabled, setAutopilotStatus } = useGeniePipeline();
  const { genieSources, currentOrg, logAction } = useLMSStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [courseTitle, setCourseTitle] = useState(project?.design?.courseTitle || project?.name || '');
  const [learningObjectives, setLearningObjectives] = useState<string[]>(project?.design?.learningObjectives || []);
  const [modules, setModules] = useState<ModuleStructure[]>(project?.design?.moduleStructure || []);
  const [assessmentStrategy, setAssessmentStrategy] = useState(project?.design?.assessmentStrategy || '');
  const [deliveryMethod, setDeliveryMethod] = useState(project?.design?.deliveryMethod || 'blended');
  const [newObjective, setNewObjective] = useState('');
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [useAnalyzeObjectives, setUseAnalyzeObjectives] = useState(Boolean(project?.analysis?.learningObjectives?.length));
  const [instructionalStrategies, setInstructionalStrategies] = useState<Array<{
    moduleIndex: number;
    activeLearning: string[];
    multimedia: string[];
  }>>(project?.design?.instructionalStrategies || []);
  const canDesign = Boolean(project?.analysis?.learningNeeds?.length || project?.analysis?.learningObjectives?.length);
  const [adultLearningChecklist, setAdultLearningChecklist] = useState({
    practicalRelevance: project?.design?.adultLearningChecklist?.practicalRelevance ?? true,
    selfDirected: project?.design?.adultLearningChecklist?.selfDirected ?? false,
    reflectiveActivities: project?.design?.adultLearningChecklist?.reflectiveActivities ?? false
  });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    markStageInProgress('design');
  }, [markStageInProgress]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    const el = document.querySelector(`[data-section="${section}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('section-highlight');
      window.setTimeout(() => el.classList.remove('section-highlight'), 1600);
    }
  }, [searchParams]);

  const jumpTo = (section: string) => {
    if (section === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const params = new URLSearchParams(searchParams);
      params.delete('section');
      setSearchParams(params, { replace: true });
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.set('section', section);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (!project?.analysis) return;
    if (useAnalyzeObjectives && project.analysis.learningObjectives?.length) {
      setLearningObjectives(project.analysis.learningObjectives);
    }
    if (!courseTitle && project.analysis.targetAudience) {
      setCourseTitle(project.name || project.analysis.targetAudience);
    }
    if (!useAnalyzeObjectives && project.analysis.learningObjectives?.length && learningObjectives.length === 0) {
      setUseAnalyzeObjectives(true);
    }
  }, [project?.analysis, useAnalyzeObjectives, courseTitle, project?.name, learningObjectives.length]);

  useEffect(() => {
    if (modules.length === 0) {
      setInstructionalStrategies([]);
      return;
    }
    if (instructionalStrategies.length === modules.length) return;
    setInstructionalStrategies((prev) =>
      modules.map((_, index) => prev[index] || { moduleIndex: index, activeLearning: [], multimedia: [] })
    );
  }, [modules, instructionalStrategies.length]);

  // Save design on changes
  useEffect(() => {
    if (courseTitle || learningObjectives.length > 0 || modules.length > 0) {
      updateProject({
        design: {
          courseTitle,
          learningObjectives,
          moduleStructure: modules,
          instructionalStrategies,
          adultLearningChecklist,
          assessmentStrategy,
          deliveryMethod
        }
      });

      // Mark complete if we have minimum data
      const hasActiveLearning = modules.length > 0 && instructionalStrategies.length === modules.length &&
        instructionalStrategies.every((entry) => entry.activeLearning.length > 0);
      const hasMultimedia = modules.length > 0 && instructionalStrategies.length === modules.length &&
        instructionalStrategies.every((entry) => entry.multimedia.length > 0);
      if (courseTitle && learningObjectives.length > 0 && modules.length > 0 && hasActiveLearning && hasMultimedia) {
        markStageComplete('design');
      }
    }
  }, [
    courseTitle,
    learningObjectives,
    modules,
    instructionalStrategies,
    adultLearningChecklist,
    assessmentStrategy,
    deliveryMethod,
    updateProject,
    markStageComplete
  ]);

  const handleAIDesign = useCallback(async () => {
    if (!canDesign) return;
    setIsGenerating(true);
    if (project) {
      logAction({
        action: 'ai_design_started',
        targetType: 'pipeline',
        targetId: project.id,
        targetName: project.name
      });
    }
    try {
      const selectedSources = genieSources.filter((s) => project?.sourceIds.includes(s.id));
      const prompt = `Create a course structure for ${project?.analysis?.targetAudience || 'learners'}.
Key needs: ${(project?.analysis?.learningNeeds || []).slice(0, 6).join('; ')}
Constraints: ${(project?.analysis?.constraints || []).slice(0, 4).join('; ')}`;
      const outline = await generateGenieOutline(
        project?.design?.courseTitle || project?.name || 'New Course',
        selectedSources.map((source) => ({
          title: source.title,
          description: source.description,
          type: source.type,
          tags: source.tags
        })),
        prompt,
        currentOrg?.id
      );
      const validated = validateOutline(outline);
      const suggestedModules: ModuleStructure[] = validated.map((module) => ({
        title: module.title,
        description: 'AI-generated module description',
        topics: module.lessons.map((lesson) => lesson.title)
      }));
      const suggestedObjectives = project?.analysis?.learningObjectives?.length
        ? project.analysis.learningObjectives
        : [];
      setLearningObjectives((prev) => [...new Set([...prev, ...suggestedObjectives])]);
      setModules(suggestedModules);
      setAssessmentStrategy('Combination of knowledge quizzes (60%) and practical scenario assessments (40%)');
      if (!courseTitle) {
        setCourseTitle(project?.name || 'Compliance Training Course');
      }
    } catch (error) {
      if (project) {
        logAction({
          action: 'ai_design_failed',
          targetType: 'pipeline',
          targetId: project.id,
          targetName: project.name,
          metadata: { error: (error as Error).message }
        });
      }
      alert((error as Error).message || 'Failed to generate design');
    } finally {
      setIsGenerating(false);
      if (project) {
        logAction({
          action: 'ai_design_completed',
          targetType: 'pipeline',
          targetId: project.id,
          targetName: project.name
        });
      }
    }
  }, [canDesign, project, logAction, genieSources, currentOrg?.id, courseTitle]);

  useEffect(() => {
    registerStageActions('design', {
      runDesign: handleAIDesign,
      useAnalysisObjectives: () => setUseAnalyzeObjectives(true)
    });
  }, [registerStageActions, handleAIDesign]);

  useEffect(() => {
    if (!autopilotEnabled) return;
    if (project?.stageApprovals.design !== 'approved') {
      setAutopilotStatus('blocked');
      return;
    }
    if (canDesign) {
      setAutopilotStatus('running');
      handleAIDesign().finally(() => setAutopilotStatus('idle'));
    }
  }, [autopilotEnabled, canDesign, project?.stageApprovals.design, setAutopilotStatus, handleAIDesign]);

  const addObjective = () => {
    if (newObjective.trim()) {
      setLearningObjectives([...learningObjectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const addModule = () => {
    setModules([...modules, { title: 'New Module', description: '', topics: [] }]);
    setExpandedModule(modules.length);
    setInstructionalStrategies((prev) => [...prev, { moduleIndex: modules.length, activeLearning: [], multimedia: [] }]);
  };

  const updateModule = (index: number, updates: Partial<ModuleStructure>) => {
    setModules(modules.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
    if (expandedModule === index) setExpandedModule(null);
    setInstructionalStrategies((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      moduleIndex: i
    })));
  };

  const moveModule = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;
    const newModules = [...modules];
    [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];
    setModules(newModules);
    setExpandedModule(newIndex);
    setInstructionalStrategies((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next.map((item, i) => ({ ...item, moduleIndex: i }));
    });
  };

  const toggleStrategyItem = (
    moduleIndex: number,
    type: 'activeLearning' | 'multimedia',
    item: string
  ) => {
    setInstructionalStrategies((prev) => {
      const next = [...prev];
      const entry = next[moduleIndex] || { moduleIndex, activeLearning: [], multimedia: [] };
      const list = entry[type];
      const updated = list.includes(item)
        ? list.filter((value) => value !== item)
        : [...list, item];
      next[moduleIndex] = { ...entry, [type]: updated };
      return next;
    });
    if (type === 'activeLearning') {
      setModules((prev) => {
        const next = [...prev];
        const topics = next[moduleIndex]?.topics || [];
        const hasTopic = topics.includes(item);
        if (hasTopic) {
          next[moduleIndex] = {
            ...next[moduleIndex],
            topics: topics.filter((topic) => topic !== item)
          };
        } else {
          next[moduleIndex] = {
            ...next[moduleIndex],
            topics: [...topics, item]
          };
        }
        return next;
      });
    }
  };

  const activeLearningCoverage = modules.length === 0
    ? 0
    : Math.round(
      (instructionalStrategies.filter((entry) => entry.activeLearning.length > 0).length / modules.length) * 100
    );

  const addTopic = (moduleIndex: number, topic: string) => {
    if (topic.trim()) {
      const newModules = [...modules];
      newModules[moduleIndex].topics.push(topic.trim());
      setModules(newModules);
    }
  };

  const removeTopic = (moduleIndex: number, topicIndex: number) => {
    const newModules = [...modules];
    newModules[moduleIndex].topics = newModules[moduleIndex].topics.filter((_, i) => i !== topicIndex);
    setModules(newModules);
  };

  return (
    <div className="p-6 space-y-6" data-section="objectives">
      {/* Stage Header */}
      <div
        className={`rounded-2xl p-6 ${
          isDarkMode
            ? 'bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/20'
            : 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
            }`}
          >
            <Layout className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Design (ADDIE + Adult Learning + Learning Pyramid)
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Create clear learning objectives and design the course structure. Our AI applies
              adult learning principles and the learning pyramid for optimal retention.
            </p>
            {!canDesign && (
              <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
                isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-700'
              }`}>
                Design is locked until Analysis produces learning needs/objectives.
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleAIDesign}
                disabled={isGenerating || !canDesign}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isGenerating
                    ? 'bg-purple-500/50 text-white cursor-wait'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                } disabled:opacity-50`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Designing course...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI Design Course
                  </>
                )}
              </button>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                  isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                }`}
              >
                <Pyramid className="w-4 h-4" />
                Learning Pyramid Applied
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className="rounded-full border border-purple-200 px-3 py-1 font-semibold text-purple-700"
          onClick={() => jumpTo('top')}
        >
          Top
        </button>
        <button
          type="button"
          className="rounded-full border border-purple-200 px-3 py-1 font-semibold text-purple-700"
          onClick={() => jumpTo('objectives')}
        >
          Objectives
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Details */}
        <AdminSection title="Course Details" isDarkMode={isDarkMode} minHeight="200px">
          <div className="space-y-4">
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Course Title
              </label>
              <input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Enter course title..."
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Delivery Method
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'self-paced', label: 'Self-Paced' },
                  { id: 'instructor-led', label: 'Instructor-Led' },
                  { id: 'blended', label: 'Blended' },
                  { id: 'microlearning', label: 'Microlearning' }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setDeliveryMethod(method.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      deliveryMethod === method.id
                        ? isDarkMode
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-700 border border-purple-300'
                        : isDarkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Assessment Strategy
              </label>
              <textarea
                value={assessmentStrategy}
                onChange={(e) => setAssessmentStrategy(e.target.value)}
                placeholder="Describe how learners will be assessed..."
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
          </div>
        </AdminSection>

        {project?.analysis && (
          <AdminSection title="Analyze Summary" subtitle="Inputs pulled from the Analyze phase." isDarkMode={isDarkMode} minHeight="160px">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold">Learning Needs</p>
                <ul className="mt-2 space-y-1 text-app-muted">
                  {(project.analysis.learningNeeds || []).slice(0, 4).map((need) => (
                    <li key={need}>• {need}</li>
                  ))}
                  {project.analysis.learningNeeds?.length === 0 && <li>No needs identified yet.</li>}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Content Gaps</p>
                <ul className="mt-2 space-y-1 text-app-muted">
                  {(project.analysis.contentGaps || []).slice(0, 4).map((gap) => (
                    <li key={gap}>• {gap}</li>
                  ))}
                  {project.analysis.contentGaps?.length === 0 && <li>No gaps detected.</li>}
                </ul>
              </div>
            </div>
          </AdminSection>
        )}

        {/* Learning Objectives */}
        <AdminSection title="Learning Objectives" subtitle="What will learners be able to do?" isDarkMode={isDarkMode} minHeight="200px">
          <div className="space-y-3">
            {learningObjectives.length < 2 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLearningObjectives((prev) => [...prev, 'Apply core policies in daily workflows'])}
                  className={`text-[11px] px-2 py-1 rounded-full ${
                    isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  AI Suggest: Apply core policies in daily workflows
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={useAnalyzeObjectives}
                onChange={(e) => setUseAnalyzeObjectives(e.target.checked)}
                className="accent-purple-500"
              />
              Use Analyze objectives as the base
            </label>
            <div className="flex gap-2">
              <input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addObjective()}
                placeholder="Add a learning objective..."
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                onClick={addObjective}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {learningObjectives.length === 0 ? (
                <div
                  className={`p-4 rounded-lg text-center ${
                    isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <Target className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Click "AI Design Course" to generate objectives</p>
                </div>
              ) : (
                learningObjectives.map((objective, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <Target className={`w-4 h-4 mt-0.5 ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                    <span className={`flex-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {objective}
                    </span>
                    <button
                      onClick={() => removeObjective(index)}
                      className={`p-1 rounded hover:bg-red-500/20 ${
                        isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </AdminSection>
      </div>

      {/* Module Structure */}
      <AdminSection
        title="Module Structure"
        subtitle="Organize your course into modules and topics"
        isDarkMode={isDarkMode}
        minHeight="300px"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs">
            <span>Active learning coverage</span>
            <span className="font-semibold">{activeLearningCoverage}%</span>
          </div>
          <div className={`mt-2 h-2 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div
              className={`h-2 rounded-full ${activeLearningCoverage === 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
              style={{ width: `${activeLearningCoverage}%` }}
            />
          </div>
        </div>
        {modules.length > 0 && (
          <>
            {instructionalStrategies.some((entry) => entry.activeLearning.length === 0) && (
              <div className={`mb-4 rounded-xl border p-3 text-xs ${
                isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}>
                Add at least one Active Learning item for each module to continue.
              </div>
            )}
            {instructionalStrategies.some((entry) => entry.multimedia.length === 0) && (
              <div className={`mb-4 rounded-xl border p-3 text-xs ${
                isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}>
                Add at least one Multimedia item for each module to continue.
              </div>
            )}
          </>
        )}
        <div className="space-y-3">
          {modules.length === 0 ? (
            <div
              className={`p-8 rounded-xl border-2 border-dashed text-center ${
                isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <Layers className={`w-10 h-10 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No modules yet
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Use AI Design or add modules manually
              </p>
            </div>
          ) : (
            modules.map((module, moduleIndex) => (
              <div
                key={moduleIndex}
                className={`rounded-xl border ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`flex items-center gap-3 p-4 cursor-pointer ${
                    expandedModule === moduleIndex ? 'border-b' : ''
                  } ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  onClick={() => setExpandedModule(expandedModule === moduleIndex ? null : moduleIndex)}
                >
                  <GripVertical className={`w-4 h-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {moduleIndex + 1}
                  </div>
                  <div className="flex-1">
                    <input
                      value={module.title}
                      onChange={(e) => updateModule(moduleIndex, { title: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className={`bg-transparent text-sm font-semibold w-full outline-none ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    />
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {module.topics.length} topics
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveModule(moduleIndex, 'up'); }}
                      disabled={moduleIndex === 0}
                      className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} disabled:opacity-30`}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveModule(moduleIndex, 'down'); }}
                      disabled={moduleIndex === modules.length - 1}
                      className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} disabled:opacity-30`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeModule(moduleIndex); }}
                      className={`p-1 rounded hover:bg-red-500/20 ${
                        isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandedModule === moduleIndex && (
                  <div className="p-4 space-y-3">
                    <input
                      value={module.description}
                      onChange={(e) => updateModule(moduleIndex, { description: e.target.value })}
                      placeholder="Module description..."
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDarkMode
                          ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                          : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />

                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Topics
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {module.topics.map((topic, topicIndex) => (
                          <span
                            key={topicIndex}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {topic}
                            <button
                              onClick={() => removeTopic(moduleIndex, topicIndex)}
                              className={`ml-1 ${
                                isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                              }`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          placeholder="Add topic..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              addTopic(moduleIndex, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-xs w-24 ${
                            isDarkMode
                              ? 'bg-gray-700 text-white placeholder-gray-500'
                              : 'bg-gray-100 text-gray-900 placeholder-gray-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Instructional Strategies
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-semibold mb-1">Active Learning</p>
                          {['Practice Activities', 'Group Discussions', 'Teach-Back Tasks'].map((item) => (
                            <label key={item} className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={instructionalStrategies[moduleIndex]?.activeLearning?.includes(item) || false}
                                onChange={() => toggleStrategyItem(moduleIndex, 'activeLearning', item)}
                                className="accent-purple-500"
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Multimedia</p>
                          {['Text', 'Visuals', 'Audio', 'Interactive Simulations'].map((item) => (
                            <label key={item} className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={instructionalStrategies[moduleIndex]?.multimedia?.includes(item) || false}
                                onChange={() => toggleStrategyItem(moduleIndex, 'multimedia', item)}
                                className="accent-purple-500"
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          <button
            onClick={addModule}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${
              isDarkMode
                ? 'border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-400'
                : 'border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-600'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Add Module
          </button>
        </div>
      </AdminSection>

      <AdminSection title="Adult Learning Principles" subtitle="Confirm alignment with adult learning requirements." isDarkMode={isDarkMode} minHeight="160px">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={adultLearningChecklist.practicalRelevance}
              onChange={(e) => setAdultLearningChecklist((prev) => ({ ...prev, practicalRelevance: e.target.checked }))}
              className="accent-purple-500"
            />
            Practical Relevance
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={adultLearningChecklist.selfDirected}
              onChange={(e) => setAdultLearningChecklist((prev) => ({ ...prev, selfDirected: e.target.checked }))}
              className="accent-purple-500"
            />
            Self-Directed Pathways
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={adultLearningChecklist.reflectiveActivities}
              onChange={(e) => setAdultLearningChecklist((prev) => ({ ...prev, reflectiveActivities: e.target.checked }))}
              className="accent-purple-500"
            />
            Experiential / Reflective Activities
          </label>
        </div>
      </AdminSection>

      {/* Stage Summary */}
      {courseTitle && learningObjectives.length > 0 && modules.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            isDarkMode ? 'border-emerald-500/30 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
              Design complete: {modules.length} modules with {learningObjectives.length} objectives
            </span>
          </div>
          <p className={`text-xs mt-1 ml-7 ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600'}`}>
            Proceed to Develop to generate AI-powered content
          </p>
        </div>
      )}
    </div>
  );
};

export default GenieStageDesign;
