import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Layers, FileText, Plus, Wand2, Edit3, CheckCircle, ArrowRight, ChevronUp, ChevronDown, Trash2, GripVertical, ClipboardCheck } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppContext } from '../../context/AppContext';
import { useLMSStore } from '../../store/lmsStore';
import { Lesson, LessonContent, LessonType, GenieCourseDraft } from '../../types/lms';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import { LessonEditor } from './LessonEditor';
import { generateGenieOutline, generateGenieLessonContent, generateGenieLessonCritique } from '../../lib/genie';
import GenieTutorPanel from './GenieTutorPanel';
import { buildGenieTutorContext } from '../../lib/genieTutorContext';

const AI_PROMPT_TEMPLATE = `You are an intelligent AI Course Designer. Your task is to create a complete course plan that follows the ADDIE instructional design model:
Analyze: Identify learner needs, goals, skills gaps, and context.
Design: Define clear, measurable learning outcomes and an effective course structure.
Develop: Generate engaging content that incorporates relevant examples, interactive activities, and multiple modalities.
Implement: Provide a rollout strategy including learner assignment, pacing, and delivery method.
Evaluate: Specify evaluation methods to measure learning effectiveness and suggest improvements based on feedback.
In your design, apply adult learning principles — ensure the course is practical, relevant, self-directed, and supports reflection and application. Incorporate the Learning Pyramid by emphasizing active learning experiences (e.g., practice, discussion, projects, teaching back) more than passive listening or reading so learners retain knowledge effectively and can apply it confidently.
Generate an output that includes:
✔ A detailed course outline
✔ Learning outcomes
✔ Content modules with activities
✔ Assessment strategy
✔ Implementation plan
✔ Evaluation and feedback plan`;

const GenieCourseStudio: React.FC<{ isDarkMode?: boolean; embedded?: boolean }> = ({
  isDarkMode = false,
  embedded = false
}) => {
  const { navigate } = useAppContext();
  const { genieSources, genieDrafts, genieAssessments, createGenieDraft, updateGenieDraft, createCourse, currentOrg } = useLMSStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{
    moduleId: string;
    lessonId: string;
    lesson: Lesson;
    displayType: 'text' | 'slides' | 'scenario' | 'quiz' | 'tutor_voice';
  } | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [lessonCritique, setLessonCritique] = useState<string | null>(null);
  const [isCritiquing, setIsCritiquing] = useState(false);

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

  const activeDraft = useMemo(
    () => genieDrafts.find((draft) => draft.id === activeDraftId) || null,
    [genieDrafts, activeDraftId]
  );
  const tutorContext = buildGenieTutorContext({
    step: 'develop',
    sources: genieSources,
    drafts: genieDrafts,
    assessments: genieAssessments
  });
  const canGenerateOutline = Boolean(activeDraft);
  const canGenerateContent = Boolean(activeDraft && activeDraft.outline.length > 0);
  const canApprove = Boolean(activeDraft && activeDraft.outline.length > 0);

  const linkedAssessments = useMemo(() => {
    if (!activeDraft) return [];
    return genieAssessments.filter((assessment) => assessment.draftId === activeDraft.id);
  }, [genieAssessments, activeDraft]);

  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return genieSources.filter((s) => s.status === 'active');
    return genieSources.filter((source) =>
      source.status === 'active' &&
      (source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [genieSources, searchQuery]);

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleCreateDraft = async () => {
    if (!draftTitle.trim()) return;
    const newDraft = await createGenieDraft({
      orgId: '',
      title: draftTitle.trim(),
      sourceIds: selectedSourceIds,
      status: 'draft',
      outline: [],
    });
    setActiveDraftId(newDraft.id);
  };

  const getLessonTemplate = (type: LessonType): LessonContent => {
    switch (type) {
      case 'text':
        return { htmlContent: '<p>Start writing your lesson content here.</p>' };
      case 'document':
        return { documentUrl: '' };
      case 'audio':
        return { audioUrl: '' };
      case 'assignment':
        return { assignmentPrompt: 'Scenario: Describe the response you would take.', submissionType: 'text' };
      case 'quiz':
        return { questions: [] };
      default:
        return { htmlContent: '<p>Lesson content placeholder.</p>' };
    }
  };

  const handleGenerateOutline = async () => {
    if (!activeDraft) return;
    setOutlineError(null);
    setIsGeneratingOutline(true);
    const sources = genieSources.filter((source) => activeDraft.sourceIds.includes(source.id));
    try {
      const modules = await generateGenieOutline(activeDraft.title, sources, AI_PROMPT_TEMPLATE, currentOrg?.id);
      const outline = modules.map((module, moduleIndex) => ({
        moduleId: `module_${moduleIndex + 1}_${Date.now()}`,
        title: module.title || `Module ${moduleIndex + 1}`,
        lessons: (module.lessons || []).map((lesson, lessonIndex) => {
          const rawType = lesson.type?.toLowerCase() || 'text';
          let type: LessonType = 'text';
          if (rawType.includes('slide') || rawType.includes('document')) type = 'document';
          else if (rawType.includes('scenario') || rawType.includes('assignment')) type = 'assignment';
          else if (rawType.includes('quiz')) type = 'quiz';
          else if (rawType.includes('interactive')) type = 'interactive';
          else if (rawType.includes('audio')) type = 'audio';
          else if (rawType.includes('video')) type = 'video';
          else if (rawType.includes('external')) type = 'external_link';
          else if (rawType.includes('scorm')) type = 'scorm';

          return {
            id: `lesson_${moduleIndex + 1}_${lessonIndex + 1}_${Date.now()}`,
            title: lesson.title || `Lesson ${lessonIndex + 1}`,
            type,
            content: getLessonTemplate(type),
            duration: lesson.duration || 10,
            order: lessonIndex + 1,
            isRequired: lesson.isRequired ?? true
          };
        })
      }));

      await updateGenieDraft(activeDraft.id, { outline, status: 'generated' });
    } catch (error) {
      setOutlineError((error as Error).message || 'AI outline generation failed.');
      // Fallback placeholder outline
      const fallbackOutline = sources.slice(0, 4).map((source, idx) => ({
        moduleId: `module_${idx + 1}`,
        title: `${source.title} Essentials`,
        lessons: [
          {
            id: `lesson_${idx + 1}_1`,
            title: `${source.title} Overview`,
            type: 'text' as LessonType,
            content: getLessonTemplate('text'),
            duration: 10,
            order: 1,
            isRequired: true
          },
          {
            id: `lesson_${idx + 1}_2`,
            title: 'Scenario Walkthrough',
            type: 'assignment' as LessonType,
            content: getLessonTemplate('assignment'),
            duration: 15,
            order: 2,
            isRequired: true
          },
          {
            id: `lesson_${idx + 1}_3`,
            title: 'Knowledge Check',
            type: 'quiz' as LessonType,
            content: getLessonTemplate('quiz'),
            duration: 10,
            order: 3,
            isRequired: true
          }
        ]
      }));
      await updateGenieDraft(activeDraft.id, { outline: fallbackOutline, status: 'generated' });
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const updateOutline = async (updater: (outline: GenieCourseDraft['outline']) => GenieCourseDraft['outline']) => {
    if (!activeDraft) return;
    const next = updater(activeDraft.outline);
    await updateGenieDraft(activeDraft.id, { outline: next });
  };

  const addModule = async () => {
    if (!activeDraft) return;
    const nextIndex = activeDraft.outline.length + 1;
    const newModuleId = `module_${Date.now()}`;
    await updateOutline((outline) => [
      ...outline,
      {
        moduleId: newModuleId,
        title: `New Module ${nextIndex}`,
        lessons: []
      }
    ]);
  };

  const addLesson = async (moduleId: string, type: LessonType) => {
    await updateOutline((outline) =>
      outline.map((module) => {
        if (module.moduleId !== moduleId) return module;
        const nextOrder = module.lessons.length + 1;
        const lessonId = `lesson_${moduleId}_${Date.now()}`;
        const newLesson: Lesson = {
          id: lessonId,
          title: `New ${type.replace('_', ' ')} lesson`,
          type,
          content: getLessonTemplate(type),
          duration: 10,
          order: nextOrder,
          isRequired: true
        };
        return { ...module, lessons: [...module.lessons, newLesson] };
      })
    );
  };

  const removeLesson = async (moduleId: string, lessonId: string) => {
    await updateOutline((outline) =>
      outline.map((module) => {
        if (module.moduleId !== moduleId) return module;
        const nextLessons = module.lessons.filter((lesson) => lesson.id !== lessonId);
        return { ...module, lessons: nextLessons.map((lesson, idx) => ({ ...lesson, order: idx + 1 })) };
      })
    );
  };

  const moveLesson = async (moduleId: string, lessonId: string, direction: 'up' | 'down') => {
    await updateOutline((outline) =>
      outline.map((module) => {
        if (module.moduleId !== moduleId) return module;
        const index = module.lessons.findIndex((lesson) => lesson.id === lessonId);
        const swapWith = direction === 'up' ? index - 1 : index + 1;
        if (index < 0 || swapWith < 0 || swapWith >= module.lessons.length) return module;
        const nextLessons = [...module.lessons];
        [nextLessons[index], nextLessons[swapWith]] = [nextLessons[swapWith], nextLessons[index]];
        return { ...module, lessons: nextLessons.map((lesson, idx) => ({ ...lesson, order: idx + 1 })) };
      })
    );
  };

  const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
    await updateOutline((outline) => {
      const index = outline.findIndex((module) => module.moduleId === moduleId);
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= outline.length) return outline;
      const next = [...outline];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  };

  const startEditModuleTitle = (moduleId: string, currentTitle: string) => {
    setEditingModuleId(moduleId);
    setModuleTitleDraft(currentTitle);
  };

  const saveModuleTitle = async () => {
    if (!editingModuleId) return;
    await updateOutline((outline) =>
      outline.map((module) =>
        module.moduleId === editingModuleId
          ? { ...module, title: moduleTitleDraft.trim() || module.title }
          : module
      )
    );
    setEditingModuleId(null);
    setModuleTitleDraft('');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeDraft) return;

    const activeType = active.data.current?.type as 'module' | 'lesson' | undefined;
    const overType = over.data.current?.type as 'module' | 'lesson' | undefined;

    if (activeType === 'module' && overType === 'module') {
      const oldIndex = activeDraft.outline.findIndex((item) => item.moduleId === active.id);
      const newIndex = activeDraft.outline.findIndex((item) => item.moduleId === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      await updateOutline((outline) => arrayMove(outline, oldIndex, newIndex));
      return;
    }

    if (activeType === 'lesson' && overType === 'lesson') {
      const activeModuleId = active.data.current?.moduleId as string | undefined;
      const overModuleId = over.data.current?.moduleId as string | undefined;
      if (!activeModuleId || !overModuleId) return;

      await updateOutline((outline) => {
        let movingLesson: Lesson | null = null;
        const nextOutline = outline.map((module) => {
          if (module.moduleId !== activeModuleId) return module;
          const nextLessons = module.lessons.filter((lesson) => {
            if (`${module.moduleId}:${lesson.id}` === active.id) {
              movingLesson = lesson;
              return false;
            }
            return true;
          });
          return { ...module, lessons: nextLessons };
        });

        if (!movingLesson) return outline;

        return nextOutline.map((module) => {
          if (module.moduleId !== overModuleId) return module;
          const overIndex = module.lessons.findIndex((lesson) => `${module.moduleId}:${lesson.id}` === over.id);
          const insertAt = overIndex >= 0 ? overIndex : module.lessons.length;
          const nextLessons = [...module.lessons];
          nextLessons.splice(insertAt, 0, { ...movingLesson, order: insertAt + 1 });
          return {
            ...module,
            lessons: nextLessons.map((lesson, idx) => ({ ...lesson, order: idx + 1 }))
          };
        });
      });
    }
  };

  const SortableModuleCard = ({
    module,
    moduleIndex,
    children
  }: {
    module: GenieCourseDraft['outline'][number];
    moduleIndex: number;
    children: React.ReactNode;
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: module.moduleId,
      data: { type: 'module' }
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-lg border p-3 transition-colors ${
          isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        } ${isDragging ? 'ring-2 ring-indigo-500/60' : ''}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <button
              className={`p-1 rounded-lg ${
                isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
              }`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            {editingModuleId === module.moduleId ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={moduleTitleDraft}
                  onChange={(e) => setModuleTitleDraft(e.target.value)}
                  className={`px-2 py-1 rounded-lg border text-xs w-full ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  onClick={saveModuleTitle}
                  className={`px-2 py-1 rounded-lg text-xs ${
                    isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'
                  }`}
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <p className="text-xs font-semibold">{module.title}</p>
                <button
                  onClick={() => startEditModuleTitle(module.moduleId, module.title)}
                  className={`text-[11px] ${
                    isDarkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-500'
                  }`}
                >
                  Rename
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => moveModule(module.moduleId, 'up')}
              disabled={moduleIndex === 0}
              className={`p-1 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => moveModule(module.moduleId, 'down')}
              disabled={!activeDraft || moduleIndex === activeDraft.outline.length - 1}
              className={`p-1 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  };

  const SortableLessonRow = ({
    moduleId,
    lesson,
    children
  }: {
    moduleId: string;
    lesson: Lesson;
    children: React.ReactNode;
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: `${moduleId}:${lesson.id}`,
      data: { type: 'lesson', moduleId }
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1
    };

    return (
      <li
        ref={setNodeRef}
        style={style}
        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${
          isDragging ? 'bg-indigo-500/10 ring-1 ring-indigo-500/40' : ''
        }`}
      >
        <span className="flex items-center gap-2">
          <button
            className={`p-1 rounded-lg ${
              isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3 h-3" />
          </button>
          {children}
        </span>
      </li>
    );
  };

  const openLessonEditor = (moduleId: string, lesson: Lesson) => {
    const displayType: 'text' | 'slides' | 'scenario' | 'quiz' | 'tutor_voice' =
      lesson.type === 'document'
        ? 'slides'
        : lesson.type === 'assignment'
          ? 'scenario'
          : lesson.type === 'quiz'
            ? 'quiz'
            : lesson.type === 'text'
              ? 'text'
              : 'text';
    setLessonCritique(null);
    setEditingLesson({ moduleId, lessonId: lesson.id, lesson, displayType });
  };

  const applyDisplayType = (displayType: 'text' | 'slides' | 'scenario' | 'quiz' | 'tutor_voice') => {
    if (!editingLesson) return;
    let type: LessonType = 'text';
    let content: LessonContent = editingLesson.lesson.content;

    switch (displayType) {
      case 'slides':
        type = 'document';
        content = editingLesson.lesson.content.documentUrl
          ? editingLesson.lesson.content
          : getLessonTemplate('document');
        break;
      case 'scenario':
        type = 'assignment';
        content = editingLesson.lesson.content.assignmentPrompt
          ? editingLesson.lesson.content
          : getLessonTemplate('assignment');
        break;
      case 'quiz':
        type = 'quiz';
        content = editingLesson.lesson.content.questions
          ? editingLesson.lesson.content
          : getLessonTemplate('quiz');
        break;
      case 'tutor_voice':
        type = 'text';
        content = {
          htmlContent: editingLesson.lesson.content.htmlContent?.trim()
            ? editingLesson.lesson.content.htmlContent
            : '<p><strong>Tutor Voice Script:</strong> Outline the spoken guidance here.</p>'
        };
        break;
      case 'text':
      default:
        type = 'text';
        content = editingLesson.lesson.content.htmlContent
          ? editingLesson.lesson.content
          : getLessonTemplate('text');
    }

    setEditingLesson({
      ...editingLesson,
      lesson: { ...editingLesson.lesson, type, content },
      displayType
    });
  };

  const handleSaveLesson = async (updates: Partial<Lesson>) => {
    if (!activeDraft || !editingLesson) return;
    const nextOutline = activeDraft.outline.map((module) => {
      if (module.moduleId !== editingLesson.moduleId) return module;
      return {
        ...module,
        lessons: module.lessons.map((lesson) =>
          lesson.id === editingLesson.lessonId
            ? { ...lesson, ...editingLesson.lesson, ...updates }
            : lesson
        )
      };
    });
    await updateGenieDraft(activeDraft.id, { outline: nextOutline });
    setEditingLesson(null);
  };

  const handleApproveCourse = async () => {
    if (!activeDraft || activeDraft.outline.length === 0) return;
    setIsApproving(true);
    try {
      const modules = activeDraft.outline.map((module, index) => ({
        id: module.moduleId,
        title: module.title,
        description: '',
        order: index + 1,
        lessons: module.lessons.map((lesson, lessonIndex) => ({
          ...lesson,
          order: lesson.order || lessonIndex + 1,
          duration: lesson.duration || 10,
          isRequired: lesson.isRequired ?? true
        }))
      }));

      await createCourse({
        title: activeDraft.title,
        description: `Generated by Genie from ${activeDraft.sourceIds.length} sources.`,
        category: 'Genie',
        difficulty: 'beginner',
        estimatedDuration: modules.reduce((total, module) => total + module.lessons.reduce((sum, lesson) => sum + lesson.duration, 0), 0),
        modules
      });
      await updateGenieDraft(activeDraft.id, { status: 'archived' });
      navigate('/admin/courses');
    } finally {
      setIsApproving(false);
    }
  };

  const applyLessonUpdate = async (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    await updateOutline((outline) =>
      outline.map((module) => {
        if (module.moduleId !== moduleId) return module;
        return {
          ...module,
          lessons: module.lessons.map((lesson) =>
            lesson.id === lessonId ? { ...lesson, ...updates } : lesson
          )
        };
      })
    );
  };

  const handleRegenerateLesson = async (moduleId: string, lesson: Lesson) => {
    if (!activeDraft) return;
    setGeneratingLessonId(`${moduleId}:${lesson.id}`);
    try {
      const sources = genieSources.filter((source) => activeDraft.sourceIds.includes(source.id));
      const result = await generateGenieLessonContent(
        activeDraft.title,
        activeDraft.outline.find((module) => module.moduleId === moduleId)?.title || '',
        lesson.title,
        lesson.type,
        sources,
        AI_PROMPT_TEMPLATE,
        currentOrg?.id
      );

      const updatedContent: LessonContent = {
        ...lesson.content,
        htmlContent: result.content.htmlContent ?? lesson.content.htmlContent,
        assignmentPrompt: result.content.assignmentPrompt ?? lesson.content.assignmentPrompt,
        questions: result.content.questions as LessonContent['questions'] ?? lesson.content.questions,
        documentUrl: result.content.documentUrl ?? lesson.content.documentUrl,
        videoUrl: result.content.videoUrl ?? lesson.content.videoUrl,
        externalUrl: result.content.externalUrl ?? lesson.content.externalUrl
      };

      await applyLessonUpdate(moduleId, lesson.id, {
        title: result.title || lesson.title,
        duration: result.duration || lesson.duration,
        isRequired: result.isRequired ?? lesson.isRequired,
        content: updatedContent
      });
    } catch (error) {
      setOutlineError((error as Error).message || 'Failed to regenerate lesson.');
    } finally {
      setGeneratingLessonId(null);
    }
  };

  const handleCritiqueLesson = async (moduleId: string, lesson: Lesson) => {
    if (!activeDraft) return;
    setIsCritiquing(true);
    setLessonCritique(null);
    try {
      const sources = genieSources.filter((source) => activeDraft.sourceIds.includes(source.id));
      const content = [
        lesson.content.htmlContent || '',
        lesson.content.assignmentPrompt || '',
        lesson.content.questions ? JSON.stringify(lesson.content.questions) : '',
        lesson.content.documentUrl || '',
        lesson.content.videoUrl || '',
        lesson.content.externalUrl || ''
      ].join('\n');
      const critique = await generateGenieLessonCritique(
        activeDraft.title,
        activeDraft.outline.find((module) => module.moduleId === moduleId)?.title || '',
        lesson.title,
        lesson.type,
        content,
        sources,
        AI_PROMPT_TEMPLATE
      );
      setLessonCritique(critique);
    } catch (error) {
      setLessonCritique((error as Error).message || 'Failed to critique lesson.');
    } finally {
      setIsCritiquing(false);
    }
  };

  const hasLessonContent = (lesson: Lesson) => {
    const content = lesson.content || {};
    return Boolean(
      content.htmlContent?.trim() ||
      content.assignmentPrompt?.trim() ||
      (content.questions && content.questions.length > 0) ||
      content.documentUrl?.trim() ||
      content.videoUrl?.trim() ||
      content.externalUrl?.trim()
    );
  };

  const handleGenerateAllContent = async () => {
    if (!activeDraft) return;
    if (bulkOverwrite) {
      setShowOverwriteConfirm(true);
      return;
    }
    setBulkGenerating(true);
    const lessons = activeDraft.outline.flatMap((module) =>
      module.lessons.map((lesson) => ({ moduleId: module.moduleId, lesson }))
    );
    const targets = bulkOverwrite ? lessons : lessons.filter(({ lesson }) => !hasLessonContent(lesson));
    setBulkProgress({ current: 0, total: targets.length });
    for (let i = 0; i < targets.length; i += 1) {
      const { moduleId, lesson } = targets[i];
      setBulkProgress({ current: i + 1, total: targets.length });
      await handleRegenerateLesson(moduleId, lesson);
    }
    setBulkGenerating(false);
    setBulkProgress(null);
  };

  const confirmOverwriteGeneration = async () => {
    setShowOverwriteConfirm(false);
    await handleGenerateAllContent();
  };

  const tutorActions = [
    {
      label: 'Generate outline',
      description: 'Draft modules and lessons from sources.',
      onClick: handleGenerateOutline,
      disabled: !canGenerateOutline || isGeneratingOutline,
      variant: 'primary' as const
    },
    {
      label: 'Generate full lesson content',
      description: 'Create lesson text, slides, and activities.',
      onClick: handleGenerateAllContent,
      disabled: !canGenerateContent || bulkGenerating
    },
    {
      label: 'Approve & create course',
      description: 'Publish draft into Course Management.',
      onClick: handleApproveCourse,
      disabled: !canApprove || isApproving
    }
  ];

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text" data-section="drafts">
      {!embedded && (
        <AdminPageHeader
          title="Genie Course Studio"
          subtitle="Auto-build course drafts from your Genie sources."
          isDarkMode={isDarkMode}
          badge="Genie"
          actions={(
            <button
              onClick={() => navigate('/admin/genie')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-500 text-indigo-500 hover:bg-indigo-500/10"
            >
              <Layers className="w-4 h-4" />
              Back to Genie
            </button>
          )}
        />
      )}
      {!embedded && (
        <div className="px-6 pb-2 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            className="rounded-full border border-indigo-200 px-3 py-1 font-semibold text-indigo-700"
            onClick={() => jumpTo('top')}
          >
            Top
          </button>
          <button
            type="button"
            className="rounded-full border border-indigo-200 px-3 py-1 font-semibold text-indigo-700"
            onClick={() => jumpTo('drafts')}
          >
            Drafts
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <AdminSection title="Sources" subtitle="Select policies and manuals to build from." isDarkMode={isDarkMode} minHeight="300px">
            <AdminToolbar
              isDarkMode={isDarkMode}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search sources or tags..."
            />
            <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">
              {filteredSources.length === 0 ? (
                <div className={`rounded-xl border p-4 text-xs ${
                  isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                }`}>
                  No active sources found. Upload sources first.
                </div>
              ) : (
                filteredSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => toggleSource(source.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${
                      selectedSourceIds.includes(source.id)
                        ? isDarkMode
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-indigo-300 bg-indigo-50'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-semibold">{source.title}</span>
                    </div>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {source.type.toUpperCase()} • v{source.version}
                    </p>
                  </button>
                ))
              )}
            </div>
          </AdminSection>

          <AdminSection title="Draft Builder" subtitle="Create a course draft and generate an outline." isDarkMode={isDarkMode} minHeight="300px">
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-400">Draft title</label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="e.g. Workplace Safety Essentials"
                  className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <button
                onClick={handleCreateDraft}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                disabled={!draftTitle.trim() || selectedSourceIds.length === 0}
              >
                <Plus className="w-4 h-4" />
                Create draft
              </button>
              {activeDraft && (
                <div className={`rounded-xl border p-4 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{activeDraft.title}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {activeDraft.sourceIds.length} sources • {activeDraft.status}
                      </p>
                    </div>
                      <button
                        onClick={handleGenerateOutline}
                        disabled={isGeneratingOutline}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        {isGeneratingOutline ? 'Generating...' : 'Generate outline'}
                      </button>
                    </div>
                  {outlineError && (
                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>
                      {outlineError}
                    </p>
                  )}
                  {activeDraft.outline.length > 0 && (
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext
                        items={activeDraft.outline.map((module) => module.moduleId)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="mt-3 space-y-3">
                          {activeDraft.outline.map((module, moduleIndex) => (
                            <SortableModuleCard key={module.moduleId} module={module} moduleIndex={moduleIndex}>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(['text', 'document', 'audio', 'assignment', 'quiz'] as LessonType[]).map((type) => (
                                  <button
                                    key={type}
                                    onClick={() => addLesson(module.moduleId, type)}
                                    className={`px-2 py-1 rounded-lg text-[11px] ${
                                      isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                  >
                                    Add {type.replace('_', ' ')}
                                  </button>
                                ))}
                              </div>
                              <SortableContext
                                items={module.lessons.map((lesson) => `${module.moduleId}:${lesson.id}`)}
                                strategy={verticalListSortingStrategy}
                              >
                                <ul className={`mt-3 text-xs space-y-2 min-h-[52px] rounded-lg border border-dashed ${
                                  isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                                } p-2`}>
                                  {module.lessons.length === 0 && (
                                    <li className="text-xs text-center py-2">Drop lessons here</li>
                                  )}
                                  {module.lessons.map((lesson, lessonIndex) => (
                                    <SortableLessonRow key={lesson.id} moduleId={module.moduleId} lesson={lesson}>
                                      <>
                                        <span>• {lesson.title} ({lesson.type})</span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => moveLesson(module.moduleId, lesson.id, 'up')}
                                            disabled={lessonIndex === 0}
                                            className={`p-1 rounded-lg ${
                                              isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                                            }`}
                                          >
                                            <ChevronUp className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => moveLesson(module.moduleId, lesson.id, 'down')}
                                            disabled={lessonIndex === module.lessons.length - 1}
                                            className={`p-1 rounded-lg ${
                                              isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                                            }`}
                                          >
                                            <ChevronDown className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => openLessonEditor(module.moduleId, lesson)}
                                            className={`inline-flex items-center gap-1 text-[11px] ${
                                              isDarkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-500'
                                            }`}
                                          >
                                            <Edit3 className="w-3 h-3" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleRegenerateLesson(module.moduleId, lesson)}
                                            disabled={generatingLessonId === `${module.moduleId}:${lesson.id}` || bulkGenerating}
                                            className={`inline-flex items-center gap-1 text-[11px] ${
                                              isDarkMode ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-600 hover:text-emerald-500'
                                            }`}
                                          >
                                            <Sparkles className={`w-3 h-3 ${generatingLessonId === `${module.moduleId}:${lesson.id}` ? 'animate-spin' : ''}`} />
                                            {generatingLessonId === `${module.moduleId}:${lesson.id}` ? 'Regenerating...' : 'Regenerate'}
                                          </button>
                                          <button
                                            onClick={() => removeLesson(module.moduleId, lesson.id)}
                                            className={`p-1 rounded-lg ${
                                              isDarkMode ? 'hover:bg-gray-800 text-red-400' : 'hover:bg-gray-100 text-red-500'
                                            }`}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </>
                                    </SortableLessonRow>
                                  ))}
                                </ul>
                              </SortableContext>
                            </SortableModuleCard>
                          ))}
                          <button
                            onClick={addModule}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                              isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            Add module
                          </button>
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}
            </div>
          </AdminSection>

          <div className="space-y-6">
            <AdminSection
              title="AI Tutor"
              subtitle="Guidance for drafting lessons and generating content."
              isDarkMode={isDarkMode}
              minHeight="200px"
            >
              <GenieTutorPanel context={tutorContext} actions={tutorActions} isDarkMode={isDarkMode} />
            </AdminSection>

            <AdminSection title="AI Prompt" subtitle="Genie uses this design framework." isDarkMode={isDarkMode} minHeight="300px">
              <div className={`rounded-xl border p-4 text-xs whitespace-pre-wrap leading-relaxed ${
                isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-white text-gray-600'
              }`}>
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-indigo-500">
                  <Sparkles className="w-4 h-4" />
                  ADDIE + Adult Learning + Learning Pyramid
                </div>
                {AI_PROMPT_TEMPLATE}
              </div>
            </AdminSection>

            <AdminSection title="Assessments" subtitle="Assessments linked to this draft." isDarkMode={isDarkMode} minHeight="200px">
              {activeDraft ? (
                <>
                  {linkedAssessments.length === 0 ? (
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No assessments linked yet. Create one in Genie Assessments.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {linkedAssessments.map((assessment) => (
                        <div key={assessment.id} className={`rounded-lg border px-3 py-2 text-xs ${
                          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                        }`}>
                          <p className="font-semibold">{assessment.title}</p>
                          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {assessment.category} • {assessment.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/admin/genie/assessments')}
                    className={`mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ClipboardCheck className="w-3 h-3" />
                    Manage assessments
                  </button>
                </>
              ) : (
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Create a draft to link assessments.
                </p>
              )}
            </AdminSection>

            <AdminSection title="Review & Approve" subtitle="Finalize and push to Course Management." isDarkMode={isDarkMode} minHeight="200px">
              {activeDraft && activeDraft.outline.length > 0 ? (
                <div className={`rounded-xl border p-4 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Draft ready for approval
                  </div>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {activeDraft.outline.length} modules • {activeDraft.sourceIds.length} sources
                  </p>
                  <button
                    onClick={handleApproveCourse}
                    disabled={isApproving}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {isApproving ? 'Creating course...' : 'Approve & create course'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleGenerateAllContent}
                    disabled={bulkGenerating}
                    className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs ${
                      isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Sparkles className={`w-3 h-3 ${bulkGenerating ? 'animate-spin' : ''}`} />
                    {bulkGenerating && bulkProgress
                      ? `Generating ${bulkProgress.current}/${bulkProgress.total}`
                      : 'Generate full lesson content'}
                  </button>
                  <label className="mt-3 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={bulkOverwrite}
                      onChange={(e) => setBulkOverwrite(e.target.checked)}
                      className="accent-indigo-500"
                    />
                    Overwrite existing content
                  </label>
                </div>
              ) : (
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Generate an outline before approving.
                </p>
              )}
            </AdminSection>
          </div>
        </div>
      </div>

      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingLesson(null)} />
          <div className={`relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl shadow-xl border ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div>
                <p className="text-sm font-semibold">Edit Lesson</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {editingLesson.lesson.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={editingLesson.displayType}
                  onChange={(e) => applyDisplayType(e.target.value as typeof editingLesson.displayType)}
                  className={`px-3 py-2 rounded-lg border text-xs ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="text">Text lesson</option>
                  <option value="slides">Slide deck</option>
                  <option value="scenario">Scenario (assignment)</option>
                  <option value="quiz">Quiz</option>
                  <option value="tutor_voice">Tutor voice placeholder</option>
                </select>
                <button
                  onClick={() => handleCritiqueLesson(editingLesson.moduleId, editingLesson.lesson)}
                  className={`px-3 py-2 rounded-lg text-xs ${
                    isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isCritiquing ? 'Critiquing...' : 'Critique'}
                </button>
                <button
                  onClick={() => handleRegenerateLesson(editingLesson.moduleId, editingLesson.lesson)}
                  className={`px-3 py-2 rounded-lg text-xs ${
                    isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  Rewrite
                </button>
                <button
                  onClick={() => setEditingLesson(null)}
                  className={`px-3 py-2 rounded-lg text-xs border ${
                    isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="p-6">
              {lessonCritique && (
                <div className={`mb-4 rounded-xl border p-4 text-xs whitespace-pre-wrap ${
                  isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}>
                  <p className="text-sm font-semibold mb-2">Lesson Critique</p>
                  {lessonCritique}
                </div>
              )}
              <LessonEditor
                key={`${editingLesson.lessonId}-${editingLesson.lesson.type}`}
                lesson={editingLesson.lesson}
                isDarkMode={isDarkMode}
                moduleOptions={(activeDraft?.outline || []).map((module) => ({
                  id: module.moduleId,
                  title: module.title
                }))}
                onCancel={() => setEditingLesson(null)}
                onSave={handleSaveLesson}
              />
            </div>
          </div>
        </div>
      )}

      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowOverwriteConfirm(false)} />
          <div className={`relative w-full max-w-md rounded-xl shadow-xl border p-6 ${
            isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <h3 className="text-lg font-semibold mb-2">Overwrite existing content?</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This will regenerate content for lessons that already have content. This action cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowOverwriteConfirm(false)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmOverwriteGeneration}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700"
              >
                Overwrite & Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenieCourseStudio;
