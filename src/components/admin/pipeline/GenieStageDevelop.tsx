import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Edit3,
  FileText,
  Video,
  FileAudio,
  HelpCircle,
  Sparkles,
  RefreshCw,
  CheckCircle,
  Clock,
  Layers,
  Play,
  BookOpen,
  ClipboardCheck
} from 'lucide-react';
import { useGeniePipeline } from '../../../context/GeniePipelineContext';
import { useLMSStore } from '../../../store/lmsStore';
import { Lesson, LessonType, LessonContent } from '../../../types/lms';
import AdminSection from '../AdminSection';
import { generateGenieLessonContent } from '../../../lib/genie';
import { validateLessonContent } from '../../../lib/genieValidation';

interface GenieStageDevelopProps {
  isDarkMode: boolean;
}

interface DevelopedLesson extends Lesson {
  moduleTitle: string;
  generated: boolean;
}

const GenieStageDevelop: React.FC<GenieStageDevelopProps> = ({ isDarkMode }) => {
  const { project, updateProject: _updateProject, markStageComplete, markStageInProgress, registerStageActions, autopilotEnabled, setAutopilotStatus, setAutopilotProgress } = useGeniePipeline();
  const { genieSources, createGenieDraft: _createGenieDraft, updateGenieDraft: _updateGenieDraft, currentOrg, logAction } = useLMSStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [lessons, setLessons] = useState<DevelopedLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const canDevelop = Boolean(project?.design?.moduleStructure?.length || project?.analysis?.learningObjectives?.length);
  const strategyByModule = useMemo(() => {
    const map = new Map<number, { activeLearning: string[]; multimedia: string[] }>();
    project?.design?.instructionalStrategies?.forEach((entry) => {
      map.set(entry.moduleIndex, {
        activeLearning: entry.activeLearning,
        multimedia: entry.multimedia
      });
    });
    return map;
  }, [project?.design?.instructionalStrategies]);

  useEffect(() => {
    markStageInProgress('develop');
  }, [markStageInProgress]);

  // Initialize lessons from design modules
  useEffect(() => {
    if (project?.design?.moduleStructure && lessons.length === 0) {
      const initialLessons: DevelopedLesson[] = [];
      project.design.moduleStructure.forEach((module, moduleIndex) => {
        const strategy = strategyByModule.get(moduleIndex);
        module.topics.forEach((topic, topicIndex) => {
          const multimedia = strategy?.multimedia || [];
          const mappedType: LessonType =
            multimedia.includes('Interactive Simulations')
              ? 'interactive'
              : multimedia.includes('Audio')
                ? 'audio'
                : multimedia.includes('Visuals')
                  ? 'document'
                  : multimedia.includes('Text')
                    ? 'text'
                    : topicIndex === module.topics.length - 1
                      ? 'quiz'
                      : 'text';

          initialLessons.push({
            id: `lesson_${moduleIndex}_${topicIndex}_${Date.now()}`,
            title: topic,
            moduleTitle: module.title,
            type: mappedType,
            content: { htmlContent: '' },
            duration: 10,
            order: topicIndex + 1,
            isRequired: true,
            generated: false
          });
        });
      });
      setLessons(initialLessons);
    }
  }, [project?.design?.moduleStructure, lessons.length, strategyByModule]);

  useEffect(() => {
    if (lessons.length > 0) return;
    const objectives = project?.analysis?.learningObjectives || [];
    if (!project?.design?.moduleStructure && objectives.length > 0) {
      const initialLessons: DevelopedLesson[] = objectives.map((objective, index) => ({
        id: `lesson_obj_${index}_${Date.now()}`,
        title: objective,
        moduleTitle: 'Learning Objectives',
        type: 'text',
        content: { htmlContent: '' },
        duration: 10,
        order: index + 1,
        isRequired: true,
        generated: false
      }));
      setLessons(initialLessons);
    }
  }, [project?.analysis?.learningObjectives, project?.design?.moduleStructure, lessons.length]);

  const selectedLesson = useMemo(() => {
    return lessons.find((l) => l.id === selectedLessonId);
  }, [lessons, selectedLessonId]);

  const generatedCount = useMemo(() => {
    return lessons.filter((l) => l.generated).length;
  }, [lessons]);

  // Mark stage complete when all lessons are generated
  useEffect(() => {
    if (lessons.length > 0 && generatedCount === lessons.length) {
      markStageComplete('develop');
    }
  }, [lessons.length, generatedCount, markStageComplete]);

  const handleGenerateAll = useCallback(async () => {
    if (!canDevelop) return;
    setIsGenerating(true);
    if (project) {
      logAction({
        action: 'ai_develop_started',
        targetType: 'pipeline',
        targetId: project.id,
        targetName: project.name
      });
    }
    const toGenerate = lessons.filter((l) => !l.generated);
    setGenerationProgress({ current: 0, total: toGenerate.length });
    setAutopilotProgress({ current: 0, total: toGenerate.length });
    const selectedSources = genieSources.filter((s) => project?.sourceIds.includes(s.id));

    for (let i = 0; i < toGenerate.length; i++) {
      const lesson = toGenerate[i];
      setGenerationProgress({ current: i + 1, total: toGenerate.length });
      setAutopilotProgress({ current: i + 1, total: toGenerate.length });

      try {
        const generated = await generateGenieLessonContent(
          project?.design?.courseTitle || project?.name || 'Course',
          lesson.moduleTitle,
          lesson.title,
          lesson.type,
          selectedSources.map((source) => ({
            title: source.title,
            description: source.description,
            type: source.type,
            tags: source.tags
          })),
          `Generate concise ${lesson.type} content for ${lesson.title}.`,
          currentOrg?.id
        );
        const validated = validateLessonContent(generated, lesson.type);
        const generatedContent = validated.content as LessonContent;

        setLessons((prev) =>
          prev.map((l) =>
            l.id === lesson.id
              ? { ...l, content: generatedContent, generated: true, duration: Math.floor(Math.random() * 10) + 5 }
              : l
          )
        );
      } catch (error) {
        if (project) {
          logAction({
            action: 'ai_develop_failed',
            targetType: 'pipeline',
            targetId: project.id,
            targetName: project.name,
            metadata: { lessonId: lesson.id, error: (error as Error).message }
          });
        }
      }
    }

    setIsGenerating(false);
    setGenerationProgress(null);
    setAutopilotProgress(null);
    if (project) {
      logAction({
        action: 'ai_develop_completed',
        targetType: 'pipeline',
        targetId: project.id,
        targetName: project.name
      });
    }
  }, [canDevelop, project, logAction, lessons, setAutopilotProgress, genieSources, currentOrg?.id]);

  const handleRegenerateLesson = async (lessonId: string) => {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    setIsGenerating(true);
    const selectedSources = genieSources.filter((s) => project?.sourceIds.includes(s.id));
    const generated = await generateGenieLessonContent(
      project?.design?.courseTitle || project?.name || 'Course',
      lesson.moduleTitle,
      lesson.title,
      lesson.type,
      selectedSources.map((source) => ({
        title: source.title,
        description: source.description,
        type: source.type,
        tags: source.tags
      })),
      `Regenerate content for ${lesson.title}.`,
      currentOrg?.id
    );
    const validated = validateLessonContent(generated, lesson.type);
    const generatedContent = validated.content as LessonContent;

    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? { ...l, content: generatedContent, generated: true }
          : l
      )
    );

    setIsGenerating(false);
  };

  useEffect(() => {
    registerStageActions('develop', {
      generateAll: handleGenerateAll
    });
  }, [registerStageActions, handleGenerateAll]);

  useEffect(() => {
    if (!autopilotEnabled) return;
    if (project?.stageApprovals.develop !== 'approved') {
      setAutopilotStatus('blocked');
      return;
    }
    if (canDevelop) {
      setAutopilotStatus('running');
      handleGenerateAll().finally(() => setAutopilotStatus('idle'));
    }
  }, [autopilotEnabled, canDevelop, project?.stageApprovals.develop, setAutopilotStatus, handleGenerateAll]);

  const getLessonTypeIcon = (type: LessonType) => {
    switch (type) {
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <FileAudio className="w-4 h-4" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4" />;
      case 'assignment':
        return <ClipboardCheck className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const groupedLessons = useMemo(() => {
    const groups: Record<string, DevelopedLesson[]> = {};
    lessons.forEach((lesson) => {
      if (!groups[lesson.moduleTitle]) {
        groups[lesson.moduleTitle] = [];
      }
      groups[lesson.moduleTitle].push(lesson);
    });
    return groups;
  }, [lessons]);

  return (
    <div className="p-6 space-y-6">
      {project?.design?.instructionalStrategies && (
        <AdminSection title="Design Strategy" subtitle="Active learning + multimedia plan from Design." isDarkMode={isDarkMode} minHeight="140px">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {(project.design?.moduleStructure ?? []).map((module, index) => {
              const strategy = strategyByModule.get(index);
              return (
                <div key={module.title} className={`rounded-lg border px-3 py-2 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <p className="font-semibold">{module.title}</p>
                  <p className="text-app-muted mt-1">
                    Active: {strategy?.activeLearning?.join(', ') || 'None'}
                  </p>
                  <p className="text-app-muted">
                    Media: {strategy?.multimedia?.join(', ') || 'None'}
                  </p>
                </div>
              );
            })}
          </div>
        </AdminSection>
      )}
      {/* Stage Header */}
      <div
        className={`rounded-2xl p-6 ${
          isDarkMode
            ? 'bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-500/20'
            : 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
            }`}
          >
            <Edit3 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Develop (ADDIE + AI Content + Assessment)
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Generate AI-powered lesson content, assessments, and interactive activities based on
              your design. Review and refine as needed.
            </p>
            {!canDevelop && (
              <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
                isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-700'
              }`}>
                Develop is locked until Design produces a module structure or objectives.
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={handleGenerateAll}
                disabled={isGenerating || generatedCount === lessons.length || !canDevelop}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isGenerating
                    ? 'bg-orange-500/50 text-white cursor-wait'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                } disabled:opacity-50`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating {generationProgress?.current}/{generationProgress?.total}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate All Content
                  </>
                )}
              </button>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                  isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                }`}
              >
                <CheckCircle className={`w-4 h-4 ${generatedCount === lessons.length ? 'text-emerald-500' : ''}`} />
                {generatedCount}/{lessons.length} lessons generated
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lesson List */}
        <div className="lg:col-span-1">
          <AdminSection title="Lessons" subtitle="Click to preview content" isDarkMode={isDarkMode} minHeight="400px">
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {Object.entries(groupedLessons).map(([moduleTitle, moduleLessons]) => (
                <div key={moduleTitle}>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className={`w-4 h-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {moduleTitle}
                    </span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {moduleLessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`w-full text-left flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          selectedLessonId === lesson.id
                            ? isDarkMode
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-orange-100 text-orange-700'
                            : isDarkMode
                              ? 'hover:bg-gray-800 text-gray-300'
                              : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className={`${lesson.generated ? 'text-emerald-500' : isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                          {lesson.generated ? <CheckCircle className="w-4 h-4" /> : getLessonTypeIcon(lesson.type)}
                        </div>
                        <span className="flex-1 text-sm truncate">{lesson.title}</span>
                        <div className="flex items-center gap-1 text-xs opacity-60">
                          <Clock className="w-3 h-3" />
                          {lesson.duration}m
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AdminSection>
        </div>

        {/* Content Preview */}
        <div className="lg:col-span-2">
          <AdminSection
            title={selectedLesson ? selectedLesson.title : 'Content Preview'}
            subtitle={selectedLesson ? `${selectedLesson.moduleTitle} • ${selectedLesson.type}` : 'Select a lesson to preview'}
            isDarkMode={isDarkMode}
            minHeight="400px"
          >
            {selectedLesson ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getLessonTypeIcon(selectedLesson.type)}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedLesson.type.replace('_', ' ')}
                    </span>
                    {selectedLesson.generated && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        Generated
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRegenerateLesson(selectedLesson.id)}
                    disabled={isGenerating}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isDarkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>

                <div
                  className={`rounded-xl border p-4 min-h-[300px] ${
                    isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  {selectedLesson.generated ? (
                    selectedLesson.type === 'quiz' && selectedLesson.content.questions ? (
                      <div className="space-y-4">
                        {selectedLesson.content.questions.map((q: { id: string; question: string; options?: string[] }, qIndex: number) => (
                          <div key={q.id} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                            <p className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {qIndex + 1}. {q.question}
                            </p>
                            {q.options && (
                              <div className="space-y-2 pl-4">
                                {q.options.map((option: string, oIndex: number) => (
                                  <label key={oIndex} className="flex items-center gap-2">
                                    <input type="radio" name={q.id} className="accent-orange-500" />
                                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {option}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}
                        dangerouslySetInnerHTML={{ __html: selectedLesson.content.htmlContent || '' }}
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Sparkles className={`w-12 h-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Content not yet generated
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Click "Generate All Content" or "Regenerate" to create AI content
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <Play className={`w-12 h-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select a lesson from the list
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Preview and edit generated content
                </p>
              </div>
            )}
          </AdminSection>
        </div>
      </div>

      {/* Stage Summary */}
      {generatedCount === lessons.length && lessons.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            isDarkMode ? 'border-emerald-500/30 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
              All {lessons.length} lessons generated and ready for implementation
            </span>
          </div>
          <p className={`text-xs mt-1 ml-7 ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600'}`}>
            Proceed to Implement to deploy and enroll learners
          </p>
        </div>
      )}
    </div>
  );
};

export default GenieStageDevelop;
