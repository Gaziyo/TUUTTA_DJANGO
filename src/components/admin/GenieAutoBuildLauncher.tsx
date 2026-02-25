import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Rocket } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { generateGenieLessonContent, generateGenieOutline, generateGenieObjectives } from '../../lib/genie';
import { generateAssessment } from '../../lib/assessment';
import type { GenieAssessmentCategory, Lesson, LessonType, QuizQuestion } from '../../types/lms';

const AI_PIPELINE_PROMPT = `You are an intelligent AI Course Designer. Create a concise, practical outline with 3-6 modules and 2-5 lessons each. Use adult learning principles and keep lessons actionable.`;

type PipelineStep = 'sources' | 'outline' | 'lessons' | 'assessments' | 'enrollments' | 'notifications';
type PipelineStart = 'sources' | 'draft' | 'assess' | 'launch';

interface PipelinePreset {
  id: string;
  name: string;
  categories: GenieAssessmentCategory[];
  dueDate?: string;
  enrollAll: boolean;
  runNotifications: boolean;
  sourceIds: string[];
}

interface GenieAutoBuildLauncherProps {
  isDarkMode?: boolean;
  buttonLabel?: string;
  buttonClassName?: string;
}

const GenieAutoBuildLauncher: React.FC<GenieAutoBuildLauncherProps> = ({
  isDarkMode = false,
  buttonLabel = 'Build & Launch',
  buttonClassName = 'btn-primary-min flex items-center gap-2'
}) => {
  const { user } = useStore();
  const {
    currentOrg,
    members,
    genieSources,
    reportSchedules,
    loadMembers,
    loadCourses,
    createGenieDraft,
    updateGenieDraft,
    createCourse,
    publishCourse,
    createGenieAssessment,
    bulkEnroll,
    runReportNow,
    runManagerDigestNow,
    genieDrafts,
    courses
  } = useLMSStore();

  const [showPipeline, setShowPipeline] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('New Genie Course');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [assessmentCategories, setAssessmentCategories] = useState<GenieAssessmentCategory[]>(['general']);
  const [enrollAll, setEnrollAll] = useState(true);
  const [dueDate, setDueDate] = useState<string>('');
  const [runNotifications, setRunNotifications] = useState(true);
  const [startFrom, setStartFrom] = useState<PipelineStart>('sources');
  const [checkpointsEnabled, setCheckpointsEnabled] = useState(true);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [stepStatus, setStepStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({
    sources: 'idle',
    outline: 'idle',
    lessons: 'idle',
    assessments: 'idle',
    enrollments: 'idle',
    notifications: 'idle'
  });
  const [pendingStep, setPendingStep] = useState<PipelineStep | null>(null);
  const pendingResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [presets, setPresets] = useState<PipelinePreset[]>(() => {
    try {
      const raw = localStorage.getItem('geniePipelinePresets');
      return raw ? (JSON.parse(raw) as PipelinePreset[]) : [];
    } catch {
      return [];
    }
  });

  const activeSources = useMemo(() => genieSources.filter((s) => s.status === 'active'), [genieSources]);
  const canRunPipeline = useMemo(() => {
    if (startFrom === 'launch') return Boolean(selectedCourseId || courses.length > 0);
    if (startFrom === 'assess') return Boolean(selectedDraftId);
    return activeSources.length > 0;
  }, [startFrom, selectedCourseId, selectedDraftId, activeSources.length, courses.length]);

  const ensureSelectedSources = () => {
    if (selectedSourceIds.length === 0) {
      setSelectedSourceIds(activeSources.map((source) => source.id));
    }
  };

  const toggleCategory = (category: GenieAssessmentCategory) => {
    setAssessmentCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
  };

  const mapOutlineType = (type: string): LessonType => {
    const rawType = type.toLowerCase();
    if (rawType.includes('slide') || rawType.includes('document')) return 'document';
    if (rawType.includes('scenario') || rawType.includes('assignment')) return 'assignment';
    if (rawType.includes('quiz')) return 'quiz';
    if (rawType.includes('interactive')) return 'interactive';
    if (rawType.includes('audio')) return 'audio';
    if (rawType.includes('video')) return 'video';
    if (rawType.includes('external')) return 'external_link';
    if (rawType.includes('scorm')) return 'scorm';
    return 'text';
  };

  const getLessonTemplate = (type: LessonType): Lesson => {
    if (type === 'document') return { id: '', title: '', type, content: { documentUrl: '' }, duration: 10, order: 1, isRequired: true };
    if (type === 'assignment') return { id: '', title: '', type, content: { assignmentPrompt: 'Describe the response you would take.', submissionType: 'text' }, duration: 15, order: 1, isRequired: true };
    if (type === 'quiz') return { id: '', title: '', type, content: { questions: [] }, duration: 15, order: 1, isRequired: true };
    return { id: '', title: '', type, content: { htmlContent: '<p>Lesson content placeholder.</p>' }, duration: 10, order: 1, isRequired: true };
  };

  const buildAssessmentContent = (title: string, outline: { title: string; lessons: Lesson[] }[]) => {
    const outlineText = outline
      .map((module) => `${module.title}: ${module.lessons.map((lesson) => lesson.title).join(', ')}`)
      .join('\n');
    return `Course Draft: ${title}\nModules:\n${outlineText}`;
  };

  const mapAssessmentQuestions = (questions: Array<Record<string, unknown>>): QuizQuestion[] => {
    return questions.map((question, index) => {
      const type = question.type;
      let mappedType: QuizQuestion['type'] = 'short_answer';
      if (type === 'multiple' || type === 'single') mappedType = 'multiple_choice';
      if (type === 'truefalse') mappedType = 'true_false';
      if (type === 'fill') mappedType = 'fill_blank';
      if (type === 'match') mappedType = 'matching';

      const options = question.options || (question.pairs
        ? question.pairs.map((pair: { equation: string; solution: string }) => `${pair.equation}:${pair.solution}`)
        : undefined);

      const correctAnswer = question.correctAnswer ?? (question.pairs ? question.pairs.map((pair: { equation: string; solution: string }) => `${pair.equation}:${pair.solution}`) : '');

      return {
        id: question.id || `q-${Date.now()}-${index}`,
        type: mappedType,
        question: question.question || 'Generated question',
        options,
        correctAnswer,
        points: 10,
        explanation: question.explanation || '',
        bloomLevel: question.bloomLevel ?? question.bloom_level ?? undefined,
        bloomLabel: question.bloomLabel ?? question.bloom_label ?? undefined
      };
    });
  };

  const resetPipelineStatus = () => {
    setStepStatus({
      sources: 'idle',
      outline: 'idle',
      lessons: 'idle',
      assessments: 'idle',
      enrollments: 'idle',
      notifications: 'idle'
    });
    setPipelineError(null);
  };

  const updateStep = (step: string, status: 'idle' | 'running' | 'success' | 'error') => {
    setStepStatus((prev) => ({ ...prev, [step]: status }));
  };

  const waitForCheckpoint = async (step: PipelineStep) => {
    if (!checkpointsEnabled) return true;
    setPendingStep(step);
    return new Promise<boolean>((resolve) => {
      pendingResolveRef.current = resolve;
    });
  };

  const resolveCheckpoint = (ok: boolean) => {
    if (pendingResolveRef.current) {
      pendingResolveRef.current(ok);
      pendingResolveRef.current = null;
    }
    setPendingStep(null);
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const payload: PipelinePreset = {
      id: `preset_${Date.now()}`,
      name: presetName.trim(),
      categories: assessmentCategories,
      dueDate,
      enrollAll,
      runNotifications,
      sourceIds: selectedSourceIds.length ? selectedSourceIds : activeSources.map((source) => source.id)
    };
    const next = [...presets.filter((preset) => preset.name !== payload.name), payload];
    localStorage.setItem('geniePipelinePresets', JSON.stringify(next));
    setPresets(next);
    setSelectedPresetId(payload.id);
    setPresetName('');
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    setAssessmentCategories(preset.categories);
    setDueDate(preset.dueDate || '');
    setEnrollAll(preset.enrollAll);
    setRunNotifications(preset.runNotifications);
    setSelectedSourceIds(preset.sourceIds);
  };

  const runPipeline = async () => {
    resetPipelineStatus();
    setIsRunning(true);
    try {
      if (!currentOrg || !user) throw new Error('Select an organization and sign in.');
      ensureSelectedSources();
      const sourceIds = selectedSourceIds.length ? selectedSourceIds : activeSources.map((s) => s.id);
      const sources = activeSources.filter((source) => sourceIds.includes(source.id));
      if ((startFrom === 'sources' || startFrom === 'draft') && sources.length === 0) {
        throw new Error('Upload at least one Genie source first.');
      }

      let draftId = '';
      let draftTitleFinal = draftTitle.trim() || 'New Genie Course';
      let outline: { moduleId: string; title: string; lessons: Lesson[] }[] = [];
      let createdCourseId = '';

      if (startFrom === 'sources' || startFrom === 'draft') {
        updateStep('sources', 'running');
        const proceedSources = await waitForCheckpoint('sources');
        if (!proceedSources) throw new Error('Pipeline canceled.');
        updateStep('sources', 'success');

        updateStep('outline', 'running');
        const proceedOutline = await waitForCheckpoint('outline');
        if (!proceedOutline) throw new Error('Pipeline canceled.');
        let learningObjectives: string[] = [];
        let contentGaps: string[] = [];
        let skillGaps: string[] = [];

        try {
          learningObjectives = await generateGenieObjectives(
            sources.map((source) => ({
              title: source.title,
              description: source.description,
              type: source.type,
              tags: source.tags
            })),
            'Workforce training',
            6,
            currentOrg?.id
          );
        } catch {
          learningObjectives = sources.slice(0, 5).map((source) => `Explain ${source.title} requirements and apply them at work.`);
        }

        const roleLabels = members.map((member) => member.role.replace('_', ' '));
        contentGaps = roleLabels
          .filter((role) =>
            !sources.some((source) => source.tags.some((tag) => role.toLowerCase().includes(tag.toLowerCase())))
          )
          .map((role) => `No tagged sources mapped to ${role} role`);

        skillGaps = [
          ...new Set([
            enrollments.filter((e) => e.status === 'overdue').length > 0
              ? 'Learners are missing deadlines for required courses'
              : null,
            enrollments.filter((e) => (e.progress ?? 0) < 50).length > 0
              ? 'Low completion progress indicates knowledge gaps'
              : null
          ].filter(Boolean) as string[])
        ];

        const draft = await createGenieDraft({
          orgId: currentOrg.id,
          title: draftTitleFinal,
          sourceIds: sourceIds,
          status: 'draft',
          outline: [],
          learningObjectives,
          contentGaps,
          skillGaps
        });
        draftId = draft.id;
        const modules = await generateGenieOutline(draft.title, sources, AI_PIPELINE_PROMPT, currentOrg?.id);
        outline = modules.map((module, moduleIndex) => ({
          moduleId: `module_${moduleIndex + 1}_${Date.now()}`,
          title: module.title || `Module ${moduleIndex + 1}`,
          lessons: (module.lessons || []).map((lesson, lessonIndex) => {
            const type = mapOutlineType(lesson.type || 'text');
            const template = getLessonTemplate(type);
            return {
              ...template,
              id: `lesson_${moduleIndex + 1}_${lessonIndex + 1}_${Date.now()}`,
              title: lesson.title || `Lesson ${lessonIndex + 1}`,
              duration: lesson.duration || template.duration,
              order: lessonIndex + 1,
              isRequired: lesson.isRequired ?? true
            };
          })
        }));
        await updateGenieDraft(draft.id, { outline, status: 'generated' });
        updateStep('outline', 'success');
      } else {
        draftId = selectedDraftId;
        const existing = genieDrafts.find((draft) => draft.id === draftId);
        if (!existing) throw new Error('Select a valid draft to continue.');
        draftTitleFinal = existing.title;
        if (!existing.outline || existing.outline.length === 0) {
          throw new Error('Selected draft has no outline. Generate an outline first.');
        }
        outline = existing.outline;
      }

      if (startFrom === 'sources' || startFrom === 'draft') {
        updateStep('lessons', 'running');
        const proceedLessons = await waitForCheckpoint('lessons');
        if (!proceedLessons) throw new Error('Pipeline canceled.');
        const updatedOutline = [];
        for (const module of outline) {
          const updatedLessons = [];
          for (const lesson of module.lessons) {
            try {
              const result = await generateGenieLessonContent(
                draftTitleFinal,
                module.title,
                lesson.title,
                lesson.type,
                sources,
                AI_PIPELINE_PROMPT,
                currentOrg?.id
              );
              updatedLessons.push({
                ...lesson,
                title: result.title || lesson.title,
                duration: result.duration || lesson.duration,
                isRequired: result.isRequired ?? lesson.isRequired,
                content: {
                  ...lesson.content,
                  ...result.content
                }
              });
            } catch {
              updatedLessons.push(lesson);
            }
          }
          updatedOutline.push({ ...module, lessons: updatedLessons });
        }
        outline = updatedOutline;
        await updateGenieDraft(draftId, { outline: updatedOutline });
        updateStep('lessons', 'success');
      }

      if (startFrom !== 'launch') {
        updateStep('assessments', 'running');
        const proceedAssess = await waitForCheckpoint('assessments');
        if (!proceedAssess) throw new Error('Pipeline canceled.');
        if (assessmentCategories.length > 0) {
          const assessmentContent = buildAssessmentContent(draftTitleFinal, outline);
          for (const category of assessmentCategories) {
            const assessmentType = category === 'math' ? 'mathematics' : category;
            const aiAssessment = await generateAssessment(
              assessmentContent,
              '',
              '',
              assessmentType,
              6
            );
            const questions = mapAssessmentQuestions(aiAssessment.questions || []);
            await createGenieAssessment({
              orgId: currentOrg.id,
              title: `${category.toUpperCase()} Assessment`,
              category,
              draftId: draftId || undefined,
              questions,
              status: 'draft'
            });
          }
        }
        updateStep('assessments', 'success');
      }

      updateStep('enrollments', 'running');
      const proceedEnroll = await waitForCheckpoint('enrollments');
      if (!proceedEnroll) throw new Error('Pipeline canceled.');
      if (startFrom === 'launch') {
        createdCourseId = selectedCourseId;
        if (!createdCourseId) {
          await loadCourses();
          const latestCourses = useLMSStore.getState().courses;
          createdCourseId = latestCourses[0]?.id || '';
        }
        if (!createdCourseId) throw new Error('Select a course to enroll.');
      } else {
        const estimatedDuration = outline.reduce((sum, module) =>
          sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + (lesson.duration || 0), 0), 0);
        const course = await createCourse({
          orgId: currentOrg.id,
          title: draftTitleFinal,
          description: `Auto-generated by Genie on ${new Date().toLocaleDateString()}.`,
          category: 'Genie',
          tags: ['genie', 'auto'],
          difficulty: 'beginner',
          estimatedDuration,
          modules: outline.map((module, index) => ({
            id: module.moduleId,
            title: module.title,
            order: index + 1,
            lessons: module.lessons
          })),
          status: 'draft',
          version: 1,
          createdBy: user.id,
          settings: {
            allowSelfEnrollment: true,
            allowGuestAccess: false,
            allowCohortSync: false,
            requireSequentialProgress: false,
            showProgressBar: true,
            enableDiscussions: true,
            enableCertificate: true,
            passingScore: 70,
            maxAttempts: 3
          }
        });
        createdCourseId = course.id;
        await publishCourse(course.id);
      }

      if (enrollAll) {
        if (members.length === 0) await loadMembers();
        const latestMembers = useLMSStore.getState().members;
        const userIds = latestMembers.map((member) => member.userId || member.id);
        const dueTimestamp = dueDate ? new Date(dueDate).getTime() : undefined;
        if (userIds.length > 0) {
          await bulkEnroll(userIds, createdCourseId, { dueDate: dueTimestamp, priority: 'required', role: 'student' });
        }
      }
      updateStep('enrollments', 'success');

      updateStep('notifications', 'running');
      const proceedNotify = await waitForCheckpoint('notifications');
      if (!proceedNotify) throw new Error('Pipeline canceled.');
      if (runNotifications) {
        const latestScheduleId = reportSchedules[0]?.id;
        if (latestScheduleId) await runReportNow(latestScheduleId);
        await runManagerDigestNow();
      }
      updateStep('notifications', 'success');
    } catch (error) {
      const message = (error as Error).message || 'Auto-build failed.';
      setPipelineError(message);
      const failingStep = Object.entries(stepStatus).find(([, status]) => status === 'running')?.[0];
      if (failingStep) updateStep(failingStep, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          ensureSelectedSources();
          resetPipelineStatus();
          try {
            const raw = localStorage.getItem('geniePipelinePresets');
            setPresets(raw ? (JSON.parse(raw) as PipelinePreset[]) : []);
          } catch {
            setPresets([]);
          }
          setShowPipeline(true);
        }}
        className={buttonClassName}
      >
        <Rocket className="w-4 h-4" />
        {buttonLabel}
      </button>

      {showPipeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isRunning && setShowPipeline(false)} />
          <div className={`relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border shadow-xl ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div>
                <p className="text-sm font-semibold">Build & Launch</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  One‑click pipeline from sources to launch.
                </p>
              </div>
              <button
                onClick={() => !isRunning && setShowPipeline(false)}
                className="btn-secondary-min text-xs"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-app-muted">Start from</label>
                  <select
                    value={startFrom}
                    onChange={(e) => setStartFrom(e.target.value as PipelineStart)}
                    className="input-min mt-1 w-full"
                  >
                    <option value="sources">Sources → Full pipeline</option>
                    <option value="draft">Draft → Outline/Lessons/Assessments/Launch</option>
                    <option value="assess">Assess → Assessments/Launch</option>
                    <option value="launch">Launch → Enrollments/Notifications</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-app-muted">Checkpoints</label>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={checkpointsEnabled}
                      onChange={(e) => setCheckpointsEnabled(e.target.checked)}
                      className="accent-indigo-500"
                    />
                    Require confirmation between steps
                  </label>
                </div>
                {startFrom === 'assess' && (
                  <div>
                    <label className="text-xs uppercase tracking-wide text-app-muted">Existing draft</label>
                    <select
                      value={selectedDraftId}
                      onChange={(e) => setSelectedDraftId(e.target.value)}
                      className="input-min mt-1 w-full"
                    >
                      <option value="">Select draft</option>
                      {genieDrafts.map((draft) => (
                        <option key={draft.id} value={draft.id}>{draft.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                {startFrom === 'launch' && (
                  <div>
                    <label className="text-xs uppercase tracking-wide text-app-muted">Existing course</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="input-min mt-1 w-full"
                    >
                      <option value="">Select course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-app-muted">Course title</label>
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="input-min mt-1 w-full"
                    placeholder="Workplace Compliance Essentials"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-app-muted">Due date (optional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-min mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-app-muted">Assessments</label>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {(['general', 'reading', 'listening', 'speaking', 'math'] as GenieAssessmentCategory[]).map((category) => (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`px-3 py-1.5 rounded-full border ${
                          assessmentCategories.includes(category)
                            ? 'border-app-accent bg-app-accent/10 text-app-accent'
                            : 'border-app-border text-app-muted'
                        }`}
                        type="button"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-app-muted">Enrollment</label>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={enrollAll}
                      onChange={(e) => setEnrollAll(e.target.checked)}
                      className="accent-indigo-500"
                    />
                    Enroll all current members
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={runNotifications}
                      onChange={(e) => setRunNotifications(e.target.checked)}
                      className="accent-indigo-500"
                    />
                    Run notifications after launch
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-app-muted">Sources</label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {activeSources.length === 0 ? (
                    <div className="text-xs text-app-muted">No active sources found.</div>
                  ) : (
                    activeSources.map((source) => (
                      <label key={source.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={selectedSourceIds.includes(source.id)}
                          onChange={() =>
                            setSelectedSourceIds((prev) =>
                              prev.includes(source.id)
                                ? prev.filter((id) => id !== source.id)
                                : [...prev, source.id]
                            )
                          }
                          className="accent-indigo-500"
                        />
                        {source.title}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="card-min p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Presets</p>
                  <span className="text-xs text-app-muted">Save defaults for categories, due date, and audience.</span>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-app-muted">Preset name</label>
                    <input
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Compliance default"
                      className="input-min mt-1 w-full"
                    />
                    <button
                      className="btn-secondary-min mt-2 text-xs"
                      type="button"
                      onClick={savePreset}
                      disabled={!presetName.trim()}
                    >
                      Save preset
                    </button>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-app-muted">Load preset</label>
                    <select
                      value={selectedPresetId}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSelectedPresetId(next);
                        applyPreset(next);
                      }}
                      className="input-min mt-1 w-full"
                    >
                      <option value="">Select preset</option>
                      {presets.map((preset) => (
                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="card-min p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Pipeline steps</p>
                  {pipelineError && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {pipelineError}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'sources', label: 'Sources' },
                    { id: 'outline', label: 'Outline' },
                    { id: 'lessons', label: 'Lessons' },
                    { id: 'assessments', label: 'Assessments' },
                    { id: 'enrollments', label: 'Enrollments' },
                    { id: 'notifications', label: 'Notifications' }
                  ].map((step) => (
                    <div key={step.id} className="flex items-center justify-between rounded-lg border border-app-border px-3 py-2">
                      <span>{step.label}</span>
                      <span className={`flex items-center gap-1 ${
                        stepStatus[step.id] === 'success' ? 'text-emerald-500' :
                        stepStatus[step.id] === 'error' ? 'text-red-500' :
                        stepStatus[step.id] === 'running' ? 'text-indigo-500' : 'text-app-muted'
                      }`}>
                        {stepStatus[step.id] === 'success' && <CheckCircle className="w-3 h-3" />}
                        {stepStatus[step.id]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {pendingStep && (
                <div className="card-min p-4 border border-indigo-500/40">
                  <p className="text-sm font-semibold">Checkpoint: {pendingStep}</p>
                  <p className="text-xs text-app-muted mt-1">
                    Confirm to proceed with this step.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="btn-secondary-min text-xs"
                      onClick={() => resolveCheckpoint(false)}
                    >
                      Stop here
                    </button>
                    <button
                      className="btn-primary-min text-xs"
                      onClick={() => resolveCheckpoint(true)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  className="btn-secondary-min"
                  onClick={() => !isRunning && setShowPipeline(false)}
                  disabled={isRunning}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary-min"
                  onClick={runPipeline}
                  disabled={isRunning || !canRunPipeline}
                >
                  {isRunning ? 'Building...' : 'Build & Launch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GenieAutoBuildLauncher;
