import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { Course, Lesson, Enrollment, ModuleProgress, ModuleQuiz } from '../../types/lms';
import { assessmentService, enrollmentService, progressService } from '../../services';
import { adaptiveReleaseService } from '../../services/adaptiveReleaseService';
import gapMatrixService from '../../services/gapMatrixService';
import remediationTriggerService from '../../services/remediationTriggerService';
import cognitiveProfileService from '../../services/cognitiveProfileService';
import type { GapMatrixEntry } from '../../services/gapMatrixService';
import type { RemediationTrigger } from '../../services/remediationTriggerService';
import type { CognitiveProfile } from '../../services/cognitiveProfileService';
import { useAppContext } from '../../context/AppContext';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  FileText,
  Video,
  HelpCircle,
  Link,
  Upload,
  BookOpen,
  Target,
  Lock,
  Menu,
  Award,
  Sparkles,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Headphones,
  Mic,
  PenLine,
  Calculator
} from 'lucide-react';
import ChatInterface from '../ChatInterface';
import QuizPlayer from './QuizPlayer';
import { ErrorBoundary } from '../ui/ErrorBoundary';

interface CoursePlayerProps {
  courseId?: string;
  course?: Course;
  enrollment?: Enrollment;
  isDarkMode?: boolean;
  initialModuleId?: string;
  initialLessonId?: string;
  onClose?: () => void;
  onComplete?: () => void;
  onProgressUpdate?: (progress: number, moduleProgress: Record<string, ModuleProgress>) => void;
  onModuleSelect?: (moduleId: string) => void;
  onLessonSelect?: (lessonId: string) => void;
}

const LESSON_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  text: <FileText className="w-4 h-4" />,
  quiz: <HelpCircle className="w-4 h-4" />,
  assignment: <Upload className="w-4 h-4" />,
  external_link: <Link className="w-4 h-4" />,
  scorm: <BookOpen className="w-4 h-4" />,
  interactive: <Target className="w-4 h-4" />
};

const MODALITY_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen className="w-3 h-3" />,
  listening: <Headphones className="w-3 h-3" />,
  speaking: <Mic className="w-3 h-3" />,
  writing: <PenLine className="w-3 h-3" />,
  math: <Calculator className="w-3 h-3" />,
  general_knowledge: <Sparkles className="w-3 h-3" />
};

export const CoursePlayer: React.FC<CoursePlayerProps> = ({
  courseId,
  course,
  enrollment,
  isDarkMode: isDarkModeProp,
  initialModuleId,
  initialLessonId,
  onClose = () => {},
  onComplete = () => {},
  onProgressUpdate = () => {},
  onModuleSelect,
  onLessonSelect
}) => {
  const { openCourse } = useAppContext();
  const { user } = useStore();
  const { createNewChat, addMessage, currentChatId } = useStore(state => ({
    createNewChat: state.createNewChat,
    addMessage: state.addMessage,
    currentChatId: state.currentChatId
  }));
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = isDarkModeProp ?? (settings?.theme ?? 'light') === 'dark';
  const { courses, enrollments, updateEnrollmentProgress, currentOrg } = useLMSStore();

  const resolvedCourse = useMemo(
    () => course ?? courses.find(c => c.id === courseId) ?? null,
    [course, courses, courseId]
  );
  const resolvedEnrollment = useMemo(
    () =>
      enrollment ??
      enrollments.find(e =>
        e.courseId === resolvedCourse?.id && e.userId === (user?.id ?? e.userId)
      ) ??
      (resolvedCourse && user
        ? {
            id: `local-${resolvedCourse.id}`,
            odId: resolvedCourse.orgId,
            userId: user.id,
            courseId: resolvedCourse.id,
            assignedBy: 'system',
            assignedAt: Date.now(),
            priority: 'optional' as const,
            status: 'not_started' as const,
            progress: 0,
            attempts: 0,
            moduleProgress: {}
          }
        : null),
    [enrollment, enrollments, resolvedCourse, user]
  );

  const modules = useMemo(() => resolvedCourse?.modules ?? [], [resolvedCourse?.modules]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(modules.map(m => m.id))
  );
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(initialModuleId || null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(initialLessonId || null);
  const [moduleProgress, setModuleProgress] = useState<Record<string, ModuleProgress>>(resolvedEnrollment?.moduleProgress || {});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showTutorPanel, setShowTutorPanel] = useState(false);
  const [tutorLanguage, setTutorLanguage] = useState('English');
  const [voiceOnlyMode, setVoiceOnlyMode] = useState(false);
  const lessonStartedAtRef = useRef<Record<string, number>>({});
  const lessonTimeSpentRef = useRef<Record<string, number>>({});
  const mediaStartedAtRef = useRef<Record<string, number>>({});
  const startedLessonsRef = useRef<Set<string>>(new Set());
  const [enrollmentAttempts, setEnrollmentAttempts] = useState<number>(resolvedEnrollment?.attempts || 0);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [moduleUnlockStatus, setModuleUnlockStatus] = useState<Record<string, { unlocked: boolean; reasons: string[] }>>({});
  const [gapEntries, setGapEntries] = useState<GapMatrixEntry[]>([]);
  const [remediationTriggers, setRemediationTriggers] = useState<RemediationTrigger[]>([]);
  const [cognitiveProfile, setCognitiveProfile] = useState<CognitiveProfile | null>(null);

  // Safe progress update with error handling
  const safeProgressUpdate = useCallback(async (
    action: () => Promise<void>,
    errorMessage: string
  ) => {
    try {
      setProgressError(null);
      await action();
    } catch (error) {
      console.error(`[CoursePlayer] ${errorMessage}:`, error);
      setProgressError(errorMessage);
    }
  }, []);

  // Find current lesson
  const currentModule = useMemo(() => {
    return modules.find(m => m.id === currentModuleId) || null;
  }, [modules, currentModuleId]);

  const currentLesson = useMemo(() => {
    return currentModule?.lessons.find(l => l.id === currentLessonId) || null;
  }, [currentModule, currentLessonId]);

  const weakAreas = useMemo(() => {
    if (!cognitiveProfile) return [];
    const bloom = Object.entries(cognitiveProfile.bloomMastery || {})
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([level]) => `Bloom L${level}`);
    const modalities = Object.entries(cognitiveProfile.modalityStrengths || {})
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([modality]) => modality.replace('_', ' '));
    return [...bloom, ...modalities];
  }, [cognitiveProfile]);

  const lessonContextInfo = useMemo(() => {
    if (!currentLesson || !currentModule || !resolvedCourse) return '';
    const content = currentLesson.content || {};
    const textBlob = [
      content.htmlContent || '',
      content.assignmentPrompt || '',
      content.documentUrl || '',
      content.videoUrl || '',
      content.externalUrl || ''
    ]
      .join(' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);
    const focus = weakAreas.length > 0 ? `Weak areas: ${weakAreas.join(', ')}.` : '';
    return [
      `Course: ${resolvedCourse.title}`,
      `Module: ${currentModule.title}`,
      `Lesson: ${currentLesson.title}`,
      `Type: ${currentLesson.type}`,
      focus,
      `Context: ${textBlob || 'No additional content'}`
    ].filter(Boolean).join('\n');
  }, [currentLesson, currentModule, resolvedCourse, weakAreas]);

  const currentQuiz = useMemo<ModuleQuiz | null>(() => {
    if (!currentLesson || currentLesson.type !== 'quiz') return null;
    const questions = currentLesson.content.questions || [];
    if (questions.length === 0) return null;
    const settings = currentLesson.content.quizSettings;
    return {
      id: currentLesson.id,
      title: currentLesson.title,
      questions,
      passingScore: settings?.passingScore ?? 70,
      maxAttempts: settings?.maxAttempts ?? 3,
      timeLimit: settings?.timeLimit,
      shuffleQuestions: settings?.shuffleQuestions ?? false,
      showCorrectAnswers: settings?.showCorrectAnswers ?? true
    };
  }, [currentLesson]);

  const preAssessment = useMemo(() => {
    for (const module of modules) {
      const lesson = module.lessons.find((item) => item.assessmentMeta?.role === 'pre');
      if (lesson) {
        return { moduleId: module.id, lesson };
      }
    }
    return null;
  }, [modules]);

  const _finalExamLessons = useMemo(() => {
    const finals: Array<{ moduleId: string; lessonId: string }> = [];
    modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        if (lesson.assessmentMeta?.role === 'final' && lesson.type === 'quiz') {
          finals.push({ moduleId: module.id, lessonId: lesson.id });
        }
      });
    });
    return finals;
  }, [modules]);

  useEffect(() => {
    setEnrollmentAttempts(resolvedEnrollment?.attempts || 0);
  }, [resolvedEnrollment?.attempts]);

  useEffect(() => {
    const orgId = currentOrg?.id || resolvedEnrollment?.orgId || resolvedEnrollment?.odId || resolvedCourse?.orgId;
    const userId = resolvedEnrollment?.userId || user?.id;
    if (!orgId || !userId) return;
    cognitiveProfileService.getForCurrentUser(orgId).then(setCognitiveProfile);
    gapMatrixService.listForUser(orgId, userId).then(setGapEntries);
    remediationTriggerService.listForOrg(orgId).then(setRemediationTriggers);
  }, [currentOrg?.id, resolvedEnrollment?.orgId, resolvedEnrollment?.odId, resolvedEnrollment?.userId, resolvedCourse?.orgId, user?.id]);

  useEffect(() => {
    if (!resolvedCourse) return;
    let cancelled = false;
    const loadUnlocks = async () => {
      const updates: Record<string, { unlocked: boolean; reasons: string[] }> = {};
      await Promise.all(
        modules.map(async (module) => {
          const status = await adaptiveReleaseService.getModuleUnlockStatus(resolvedCourse.id, module.id);
          updates[module.id] = status;
        })
      );
      if (!cancelled) {
        setModuleUnlockStatus(updates);
      }
    };
    loadUnlocks();
    return () => { cancelled = true; };
  }, [resolvedCourse, modules, moduleProgress]);

  useEffect(() => {
    if (!resolvedEnrollment || !currentModule || !currentLesson || !resolvedCourse) return;
    if (resolvedEnrollment.id.startsWith('local-')) return;
    if (startedLessonsRef.current.has(currentLesson.id)) return;
    if (moduleProgress[currentModule.id]?.completedLessons?.includes(currentLesson.id)) return;
    const orgId = resolvedEnrollment.orgId || resolvedEnrollment.odId || resolvedCourse.orgId;
    if (!orgId) return;
    const startedAt = Date.now();
    lessonStartedAtRef.current[currentLesson.id] = startedAt;
    startedLessonsRef.current.add(currentLesson.id);

    // Track lesson start with error handling
    safeProgressUpdate(async () => {
      await progressService.upsert({
        orgId,
        enrollmentId: resolvedEnrollment.id,
        userId: resolvedEnrollment.userId,
        userAuthId: resolvedEnrollment.userAuthId || user?.id,
        courseId: resolvedEnrollment.courseId,
        moduleId: currentModule.id,
        lessonId: currentLesson.id,
        status: 'started',
        startedAt,
      });
    }, 'Failed to track lesson start');

    if (resolvedEnrollment.status === 'not_started') {
      safeProgressUpdate(async () => {
        await enrollmentService.update(resolvedEnrollment.id, { status: 'in_progress', startedAt, lastAccessedAt: startedAt });
      }, 'Failed to update enrollment status');
      useLMSStore.getState().logAction({
        action: 'enrollment_started',
        targetType: 'enrollment',
        targetId: resolvedEnrollment.id,
        targetName: resolvedEnrollment.userId,
        metadata: { courseId: resolvedEnrollment.courseId }
      });
    } else {
      safeProgressUpdate(async () => {
        await enrollmentService.update(resolvedEnrollment.id, { lastAccessedAt: startedAt });
      }, 'Failed to update last accessed time');
    }
  }, [resolvedEnrollment, currentModule, currentLesson, resolvedCourse, user, moduleProgress, safeProgressUpdate]);

  useEffect(() => {
    if (!currentLessonId) return;
    try {
      const isOpen = window.localStorage.getItem(`tuutta_tutor_panel_${courseId}_${currentLessonId}`) === 'open';
      setShowTutorPanel(isOpen);
    } catch {
      // ignore localStorage errors
    }
  }, [courseId, currentLessonId]);

  useEffect(() => {
    if (!currentLessonId) return;
    try {
      window.localStorage.setItem(`tuutta_tutor_panel_${courseId}_${currentLessonId}`, showTutorPanel ? 'open' : 'closed');
    } catch {
      // ignore localStorage errors
    }
  }, [courseId, currentLessonId, showTutorPanel]);

  const getLessonContext = () => {
    return lessonContextInfo;
  };

  const sendTutorPrompt = (prompt: string) => {
    if (!currentLesson || !currentModule || !resolvedCourse) return;
    if (!currentChatId) {
      createNewChat();
    }
    const voiceInstruction = voiceOnlyMode ? 'Use voice-friendly short responses.' : '';
    const focus = weakAreas.length > 0 ? `Focus areas: ${weakAreas.join(', ')}.` : '';
    addMessage({
      role: 'user',
      content: `Respond in ${tutorLanguage}. ${voiceInstruction} ${prompt}\n\n${focus}\n${getLessonContext()}`
    });
    setShowTutorPanel(true);
  };

  // Initialize to requested lesson if provided and accessible
  useEffect(() => {
    if (initialModuleId && initialLessonId) {
      const module = modules.find(m => m.id === initialModuleId);
      const lesson = module?.lessons.find(l => l.id === initialLessonId);
      if (module && lesson) {
        setCurrentModuleId(initialModuleId);
        setCurrentLessonId(initialLessonId);
        onModuleSelect?.(initialModuleId);
        onLessonSelect?.(initialLessonId);
      }
    }
  }, [initialModuleId, initialLessonId, modules, onModuleSelect, onLessonSelect]);

  // Initialize to first incomplete lesson
  useEffect(() => {
    if (!currentModuleId || !currentLessonId) {
      // Find first incomplete lesson
      for (const module of modules) {
        const progress = moduleProgress[module.id];
        for (const lesson of module.lessons) {
          if (!progress?.completedLessons?.includes(lesson.id)) {
            setCurrentModuleId(module.id);
            setCurrentLessonId(lesson.id);
            onModuleSelect?.(module.id);
            onLessonSelect?.(lesson.id);
            return;
          }
        }
      }
      // All complete, go to first lesson
      if (modules.length > 0 && modules[0].lessons.length > 0) {
        setCurrentModuleId(modules[0].id);
        setCurrentLessonId(modules[0].lessons[0].id);
        onModuleSelect?.(modules[0].id);
        onLessonSelect?.(modules[0].lessons[0].id);
      }
    }
  }, [modules, moduleProgress, currentModuleId, currentLessonId, onModuleSelect, onLessonSelect]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
    if (totalLessons === 0) return 0;

    const completedLessons = Object.values(moduleProgress).reduce(
      (sum, mp) => sum + (mp.completedLessons?.length || 0),
      0
    );
    return Math.round((completedLessons / totalLessons) * 100);
  }, [modules, moduleProgress]);

  // Check if lesson is completed
  const isLessonCompleted = (moduleId: string, lessonId: string) => {
    return moduleProgress[moduleId]?.completedLessons?.includes(lessonId) || false;
  };

  const isModuleUnlocked = (moduleId: string) => {
    const status = moduleUnlockStatus[moduleId];
    return status ? status.unlocked : true;
  };

  const getModuleUnlockReasons = (moduleId: string) => {
    return moduleUnlockStatus[moduleId]?.reasons ?? [];
  };

  // Check if lesson is accessible (sequential progress)
  const isLessonAccessible = (moduleId: string, lessonId: string) => {
    if (!isModuleUnlocked(moduleId)) return false;
    if (!resolvedCourse.settings?.requireSequentialProgress) return true;

    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (module.id === moduleId && lesson.id === lessonId) {
          return true; // Found it, so it's accessible
        }
        if (!isLessonCompleted(module.id, lesson.id)) {
          return false; // Found an incomplete lesson before target
        }
      }
    }
    return true;
  };

  const remediationSuggestion = useMemo(() => {
    if (!currentModule || !resolvedCourse) return null;
    const progress = moduleProgress[currentModule.id];
    if (!progress) return null;
    const minScore = resolvedCourse.settings?.completionCriteria?.minScore ?? 70;
    if ((progress.quizAttempts ?? 0) < 2) return null;
    if ((progress.quizScore ?? 100) >= minScore) return null;

    const trigger = remediationTriggers.find(t => t.is_active !== false);
    const gapEntry = gapEntries.find(entry => entry.status === 'open');
    const remediationCourseId = trigger?.remediation_course || gapEntry?.recommendedCourseId;
    const remediationCourseTitle = trigger?.remediation_course_title || gapEntry?.recommendedCourseTitle;
    return {
      courseId: remediationCourseId,
      courseTitle: remediationCourseTitle || 'Remediation course',
      reason: `You scored below ${minScore}% twice. A remediation module is recommended.`
    };
  }, [currentModule, resolvedCourse, moduleProgress, remediationTriggers, gapEntries]);

  // Mark lesson as complete
  const meetsCompletionCriteria = (progressState: Record<string, ModuleProgress>) => {
    if (!resolvedCourse) return true;
    const criteria = resolvedCourse.settings?.completionCriteria;
    if (!criteria?.requireAssessmentPass) return true;
    const minScore = criteria.minScore ?? 70;
    const quizLessons = resolvedCourse.modules.flatMap((module) =>
      module.lessons
        .filter((lesson) => lesson.type === 'quiz' && lesson.assessmentMeta?.role !== 'pre')
        .map((lesson) => ({
          moduleId: module.id,
          lessonId: lesson.id,
          role: lesson.assessmentMeta?.role
        }))
    );
    if (quizLessons.length === 0) return true;
    const finalExams = quizLessons.filter((quiz) => quiz.role === 'final');
    const requiredLessons = finalExams.length > 0 ? finalExams : quizLessons;
    return requiredLessons.every((quiz) => {
      const module = progressState[quiz.moduleId];
      if (!module) return false;
      if (!module.completedLessons?.includes(quiz.lessonId)) return false;
      return (module.quizScore ?? 0) >= minScore;
    });
  };

  const markLessonComplete = (
    moduleId: string,
    lessonId: string,
    options?: { quizScore?: number; quizAttempts?: number; timeSpentMs?: number }
  ) => {
    setModuleProgress(prev => {
      const newProgress = { ...prev };
      if (!newProgress[moduleId]) {
        newProgress[moduleId] = {
          moduleId,
          status: 'in_progress',
          completedLessons: [],
          quizAttempts: 0
        };
      }

      if (options?.quizScore !== undefined) {
        newProgress[moduleId].quizScore = options.quizScore;
      }
      if (options?.quizAttempts !== undefined) {
        newProgress[moduleId].quizAttempts = options.quizAttempts;
      }

      if (!newProgress[moduleId].completedLessons.includes(lessonId)) {
        newProgress[moduleId] = {
          ...newProgress[moduleId],
          completedLessons: [...newProgress[moduleId].completedLessons, lessonId]
        };

        // Check if module is complete
        const module = modules.find(m => m.id === moduleId);
        if (module && newProgress[moduleId].completedLessons.length === module.lessons.length) {
          newProgress[moduleId].status = 'completed';
          newProgress[moduleId].completedAt = Date.now();
          if (resolvedEnrollment && !resolvedEnrollment.id.startsWith('local-')) {
            const orgId = resolvedEnrollment.orgId || resolvedEnrollment.odId || resolvedCourse?.orgId;
            if (orgId) {
              progressService.upsertModuleCompletion({
                orgId,
                enrollmentId: resolvedEnrollment.id,
                userId: resolvedEnrollment.userId,
                userAuthId: resolvedEnrollment.userAuthId || user?.id,
                courseId: resolvedEnrollment.courseId,
                moduleId,
                status: 'completed',
                completedAt: newProgress[moduleId].completedAt || Date.now(),
              }).catch(err => {
                console.error('[CoursePlayer] Failed to save module completion:', err);
                setProgressError('Failed to save module completion');
              });
            }
          }
        }
      }

      // Calculate new overall progress
      const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
      const completedLessons = Object.values(newProgress).reduce(
        (sum, mp) => sum + (mp.completedLessons?.length || 0),
        0
      );
      const newOverallProgress = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
      const completionCriteriaMet = newOverallProgress < 100 ? true : meetsCompletionCriteria(newProgress);
      const effectiveProgress = completionCriteriaMet ? newOverallProgress : Math.min(newOverallProgress, 99);

      // Update parent
      onProgressUpdate(effectiveProgress, newProgress);
      if (resolvedEnrollment && !resolvedEnrollment.id.startsWith('local-')) {
        updateEnrollmentProgress(resolvedEnrollment.id, effectiveProgress, newProgress)
          .catch(err => {
            console.error('[CoursePlayer] Failed to update enrollment progress:', err);
            setProgressError('Failed to save progress');
          });
        const orgId = resolvedEnrollment.orgId || resolvedEnrollment.odId || resolvedCourse?.orgId;
        if (orgId) {
          const startedAt = lessonStartedAtRef.current[lessonId];
          const timeSpentMs = options?.timeSpentMs ?? lessonTimeSpentRef.current[lessonId];
          progressService.upsert({
            orgId,
            enrollmentId: resolvedEnrollment.id,
            userId: resolvedEnrollment.userId,
            userAuthId: resolvedEnrollment.userAuthId || user?.id,
            courseId: resolvedEnrollment.courseId,
            moduleId,
            lessonId,
            status: 'completed',
            startedAt,
            completedAt: Date.now(),
            timeSpentMs: timeSpentMs ?? (startedAt ? Math.max(Date.now() - startedAt, 0) : undefined),
          }).catch(err => {
            console.error('[CoursePlayer] Failed to save lesson completion:', err);
            setProgressError('Failed to save lesson completion');
          });
        }
      }

      // Check if course is complete
      if (effectiveProgress === 100) {
        setShowCompletionModal(true);
      }

      return newProgress;
    });
  };

  // Navigate to lesson
  const goToLesson = (moduleId: string, lessonId: string) => {
    if (!isLessonAccessible(moduleId, lessonId)) return;
    setCurrentModuleId(moduleId);
    setCurrentLessonId(lessonId);
    onModuleSelect?.(moduleId);
    onLessonSelect?.(lessonId);
  };

  // Navigate to next lesson
  const goToNextLesson = () => {
    if (!currentModule || !currentLesson) return;

    // Mark current as complete
    markLessonComplete(currentModule.id, currentLesson.id);

    // Find next lesson
    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      // Next lesson in same module
      setCurrentLessonId(currentModule.lessons[currentLessonIndex + 1].id);
      onLessonSelect?.(currentModule.lessons[currentLessonIndex + 1].id);
    } else {
      // Next module
      const currentModuleIndex = modules.findIndex(m => m.id === currentModule.id);
      if (currentModuleIndex < modules.length - 1) {
        const nextModule = modules[currentModuleIndex + 1];
        if (nextModule.lessons.length > 0) {
          setCurrentModuleId(nextModule.id);
          setCurrentLessonId(nextModule.lessons[0].id);
          onModuleSelect?.(nextModule.id);
          onLessonSelect?.(nextModule.lessons[0].id);
        }
      }
    }
  };

  // Navigate to previous lesson
  const goToPreviousLesson = () => {
    if (!currentModule || !currentLesson) return;

    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
    if (currentLessonIndex > 0) {
      // Previous lesson in same module
      setCurrentLessonId(currentModule.lessons[currentLessonIndex - 1].id);
      onLessonSelect?.(currentModule.lessons[currentLessonIndex - 1].id);
    } else {
      // Previous module
      const currentModuleIndex = modules.findIndex(m => m.id === currentModule.id);
      if (currentModuleIndex > 0) {
        const prevModule = modules[currentModuleIndex - 1];
        if (prevModule.lessons.length > 0) {
          setCurrentModuleId(prevModule.id);
          setCurrentLessonId(prevModule.lessons[prevModule.lessons.length - 1].id);
          onModuleSelect?.(prevModule.id);
          onLessonSelect?.(prevModule.lessons[prevModule.lessons.length - 1].id);
        }
      }
    }
  };

  const handleQuizStart = () => {
    if (!resolvedEnrollment || resolvedEnrollment.id.startsWith('local-')) return;
    const startedAt = Date.now();
    enrollmentService.update(resolvedEnrollment.id, {
      status: resolvedEnrollment.status === 'not_started' ? 'in_progress' : resolvedEnrollment.status,
      startedAt: resolvedEnrollment.startedAt ?? startedAt,
      lastAccessedAt: startedAt
    }).catch(err => {
      console.error('[CoursePlayer] Failed to update enrollment on quiz start:', err);
      setProgressError('Failed to start quiz');
    });
    if (resolvedEnrollment.status === 'not_started') {
      useLMSStore.getState().logAction({
        action: 'enrollment_started',
        targetType: 'enrollment',
        targetId: resolvedEnrollment.id,
        targetName: resolvedEnrollment.userId,
        metadata: { courseId: resolvedEnrollment.courseId }
      });
    }
  };

  const handleQuizComplete = async (
    score: number,
    passed: boolean,
    answers: Record<string, string | string[]>,
    results?: Record<string, boolean>
  ) => {
    if (!currentModuleId || !currentLessonId) return;
    const attempts = enrollmentAttempts + 1;
    setEnrollmentAttempts(attempts);
    if (passed) {
      markLessonComplete(currentModuleId, currentLessonId, { quizScore: score, quizAttempts: attempts });
    } else {
      setModuleProgress(prev => {
        const next = { ...prev };
        if (!next[currentModuleId]) {
          next[currentModuleId] = {
            moduleId: currentModuleId,
            status: 'in_progress',
            completedLessons: [],
            quizAttempts: 0
          };
        }
        next[currentModuleId] = {
          ...next[currentModuleId],
          quizScore: score,
          quizAttempts: attempts
        };
        return next;
      });
    }
    if (resolvedEnrollment && !resolvedEnrollment.id.startsWith('local-')) {
      const orgId = resolvedEnrollment.orgId || resolvedEnrollment.odId || resolvedCourse?.orgId;
      if (orgId) {
        try {
          setIsSaving(true);
          const assessmentMeta = currentLesson?.assessmentMeta;
          const incorrectQuestions = results
            ? currentQuiz?.questions.filter((q) => results[q.id] === false) || []
            : [];
          const weakTopics = incorrectQuestions.length > 0
            ? incorrectQuestions.map((q) => q.topicTag || q.question)
            : [];
          await assessmentService.createResult({
            orgId,
            enrollmentId: resolvedEnrollment.id,
            userId: resolvedEnrollment.userId,
            userAuthId: resolvedEnrollment.userAuthId || user?.id,
            courseId: resolvedEnrollment.courseId,
            assessmentId: currentLessonId,
            score,
            attempts,
            passed,
            metadata: {
              moduleId: currentModuleId,
              lessonId: currentLessonId,
              competencyTags: assessmentMeta?.competencyTags || [],
              topicTags: assessmentMeta?.topicTags || [],
              weakTopics,
              assessmentRole: assessmentMeta?.role || 'lesson',
              remediationModuleId: assessmentMeta?.remediationModuleId,
              remediationLessonId: assessmentMeta?.remediationLessonId,
              recertifyDays: assessmentMeta?.recertifyDays,
              passingScore: currentQuiz?.passingScore ?? resolvedCourse?.settings?.passingScore ?? 70,
              answerSummary: {
                total: currentQuiz?.questions.length || 0,
                incorrect: incorrectQuestions.length,
                correct: Math.max((currentQuiz?.questions.length || 0) - incorrectQuestions.length, 0),
                answers
              }
            }
          });
          await enrollmentService.update(resolvedEnrollment.id, { attempts });
          const maxAttempts = resolvedCourse?.settings?.maxAttempts ?? 0;
          if (!passed && maxAttempts > 0 && attempts >= maxAttempts) {
            await enrollmentService.update(resolvedEnrollment.id, { status: 'failed' });
            useLMSStore.getState().logAction({
              action: 'enrollment_failed',
              targetType: 'enrollment',
              targetId: resolvedEnrollment.id,
              targetName: resolvedEnrollment.userId,
              metadata: { courseId: resolvedEnrollment.courseId, attempts }
            });
          }
          if (assessmentMeta?.role === 'pre' && passed && assessmentMeta.skipModuleIds?.length) {
            const completedAt = Date.now();
            const newProgress = { ...moduleProgress };
            for (const moduleId of assessmentMeta.skipModuleIds) {
              const module = modules.find((m) => m.id === moduleId);
              if (!module) continue;
              newProgress[moduleId] = {
                moduleId,
                status: 'completed',
                completedAt,
                completedLessons: module.lessons.map((lesson) => lesson.id),
                quizAttempts: newProgress[moduleId]?.quizAttempts ?? 0
              };
              await progressService.upsertModuleCompletion({
                orgId,
                enrollmentId: resolvedEnrollment.id,
                userId: resolvedEnrollment.userId,
                userAuthId: resolvedEnrollment.userAuthId || user?.id,
                courseId: resolvedEnrollment.courseId,
                moduleId,
                status: 'completed',
                completedAt
              });
              for (const lesson of module.lessons) {
                await progressService.upsert({
                  orgId,
                  enrollmentId: resolvedEnrollment.id,
                  userId: resolvedEnrollment.userId,
                  userAuthId: resolvedEnrollment.userAuthId || user?.id,
                  courseId: resolvedEnrollment.courseId,
                  moduleId,
                  lessonId: lesson.id,
                  status: 'completed',
                  startedAt: completedAt,
                  completedAt
                });
              }
            }
            setModuleProgress(newProgress);
            const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
            const completedLessons = Object.values(newProgress).reduce(
              (sum, mp) => sum + (mp.completedLessons?.length || 0),
              0
            );
            const newOverallProgress = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
            onProgressUpdate(newOverallProgress, newProgress);
            await updateEnrollmentProgress(resolvedEnrollment.id, newOverallProgress, newProgress);
          }
        } catch (err) {
          console.error('[CoursePlayer] Failed to save quiz results:', err);
          setProgressError('Failed to save quiz results. Your progress may not be saved.');
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleMediaPlay = (lessonId: string) => {
    if (!mediaStartedAtRef.current[lessonId]) {
      mediaStartedAtRef.current[lessonId] = Date.now();
    }
  };

  const handleMediaPause = (lessonId: string) => {
    const startedAt = mediaStartedAtRef.current[lessonId];
    if (!startedAt) return;
    const elapsed = Math.max(Date.now() - startedAt, 0);
    lessonTimeSpentRef.current[lessonId] = (lessonTimeSpentRef.current[lessonId] || 0) + elapsed;
    mediaStartedAtRef.current[lessonId] = 0;
  };

  const handleMediaEnded = (lessonId: string) => {
    handleMediaPause(lessonId);
  };

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // Check if at first/last lesson
  const isFirstLesson = useMemo(() => {
    if (!currentModule || !currentLesson) return true;
    const moduleIndex = modules.findIndex(m => m.id === currentModule.id);
    const lessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
    return moduleIndex === 0 && lessonIndex === 0;
  }, [modules, currentModule, currentLesson]);

  const isLastLesson = useMemo(() => {
    if (!currentModule || !currentLesson) return false;
    const moduleIndex = modules.findIndex(m => m.id === currentModule.id);
    const lessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
    return moduleIndex === modules.length - 1 && lessonIndex === currentModule.lessons.length - 1;
  }, [modules, currentModule, currentLesson]);

  if (!resolvedCourse) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Course not found</p>
          <p className="text-sm opacity-80">Please select a course with available content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0 border-r ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className="font-semibold truncate">{resolvedCourse.title}</h2>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>{overallProgress}% complete</span>
              </div>
              <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Module List */}
          <div className="flex-1 overflow-auto p-2">
            {modules.map((module, moduleIndex) => {
              const moduleComplete = moduleProgress[module.id]?.status === 'completed';
              const moduleLessonsComplete = moduleProgress[module.id]?.completedLessons?.length || 0;
              const moduleLocked = !isModuleUnlocked(module.id);
              const moduleReasons = getModuleUnlockReasons(module.id);

              return (
                <div key={module.id} className="mb-2">
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(module.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      !expandedModules.has(module.id) ? '-rotate-90' : ''
                    }`} />
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      moduleComplete
                        ? 'bg-green-500 text-white'
                        : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                    }`}>
                      {moduleComplete ? <CheckCircle className="w-4 h-4" /> : moduleIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{module.title}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {moduleLessonsComplete}/{module.lessons.length} lessons
                      </p>
                    </div>
                    {moduleLocked && (
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                        title={moduleReasons.length ? moduleReasons.join(' • ') : 'Locked'}
                      >
                        Locked
                      </span>
                    )}
                  </button>

                  {/* Lessons */}
                  {expandedModules.has(module.id) && (
                    <div className="ml-8 space-y-1 mt-1">
                      {module.lessons.map((lesson) => {
                        const isComplete = isLessonCompleted(module.id, lesson.id);
                        const isAccessible = isLessonAccessible(module.id, lesson.id);
                        const isCurrent = currentModuleId === module.id && currentLessonId === lesson.id;
                        const bloomBadge = lesson.bloomLevel ? `L${lesson.bloomLevel}` : null;
                        const modalityIcon = lesson.modality ? MODALITY_ICONS[lesson.modality] : null;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => goToLesson(module.id, lesson.id)}
                            disabled={!isAccessible}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm ${
                              isCurrent
                                ? 'bg-indigo-600 text-white'
                                : isComplete
                                  ? isDarkMode ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-gray-100'
                                  : !isAccessible
                                    ? isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                                    : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            ) : !isAccessible ? (
                              <Lock className="w-4 h-4 flex-shrink-0" />
                            ) : (
                              LESSON_ICONS[lesson.type] || <FileText className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                            {bloomBadge && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                isCurrent ? 'bg-indigo-500/40 text-indigo-100' : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                              }`}>
                                {bloomBadge}
                              </span>
                            )}
                            {modalityIcon && (
                              <span className={`${isCurrent ? 'text-indigo-100' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {modalityIcon}
                              </span>
                            )}
                            <span className={`text-xs ml-auto ${
                              isCurrent ? 'text-indigo-200' : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {lesson.duration}m
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className={`h-14 flex items-center justify-between px-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="font-medium">{currentLesson?.title || 'Select a lesson'}</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentModule?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendTutorPrompt('Explain this lesson in simple terms.')}
              className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Ask Genie
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="flex-1 overflow-auto">
          {/* Error notification */}
          {progressError && (
            <div className={`mx-6 mt-4 mb-2 rounded-xl border p-3 flex items-center gap-3 ${
              isDarkMode ? 'border-red-600/40 bg-red-900/20' : 'border-red-200 bg-red-50'
            }`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{progressError}</p>
                <p className="text-xs text-red-600 dark:text-red-400">Your progress may not be saved. Please try again.</p>
              </div>
              <button
                onClick={() => setProgressError(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Dismiss
              </button>
            </div>
          )}

          {/* Saving indicator */}
          {isSaving && (
            <div className={`mx-6 mt-4 mb-2 rounded-xl border p-3 flex items-center gap-3 ${
              isDarkMode ? 'border-indigo-600/40 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50'
            }`}>
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-sm text-indigo-700 dark:text-indigo-300">Saving progress...</p>
            </div>
          )}

          {preAssessment && !isLessonCompleted(preAssessment.moduleId, preAssessment.lesson.id) && (
            <div className={`mx-6 mt-4 mb-2 rounded-xl border p-4 flex flex-col md:flex-row items-start md:items-center gap-3 ${
              isDarkMode ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex-1">
                <p className="text-sm font-semibold">Pre‑assessment available</p>
                <p className={`text-xs ${isDarkMode ? 'text-amber-200/80' : 'text-amber-700'}`}>
                  Take the pre‑assessment to benchmark your knowledge before starting.
                </p>
              </div>
              <button
                onClick={() => goToLesson(preAssessment.moduleId, preAssessment.lesson.id)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600"
              >
                Start Pre‑Assessment
              </button>
            </div>
          )}

          {remediationSuggestion && (
            <div className={`mx-6 mt-4 mb-2 rounded-xl border p-4 flex flex-col md:flex-row items-start md:items-center gap-3 ${
              isDarkMode ? 'border-rose-600/40 bg-rose-900/20' : 'border-rose-200 bg-rose-50'
            }`}>
              <div className="flex-1">
                <p className="text-sm font-semibold">Remediation recommended</p>
                <p className={`text-xs ${isDarkMode ? 'text-rose-200/80' : 'text-rose-700'}`}>
                  {remediationSuggestion.reason}
                </p>
              </div>
              {remediationSuggestion.courseId && (
                <button
                  onClick={() => openCourse(remediationSuggestion.courseId!, remediationSuggestion.courseTitle)}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-rose-500 text-white hover:bg-rose-600"
                >
                  Start Remediation
                </button>
              )}
            </div>
          )}
          {currentLesson ? (
            <>
              <div className={`px-6 py-3 border-b ${
                isDarkMode ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Summarize', prompt: 'Summarize this lesson in 5 bullet points.' },
                    { label: 'Explain', prompt: 'Explain this lesson with a simple analogy.' },
                    { label: 'Quiz me', prompt: 'Give me a short quiz on this lesson.' },
                    { label: 'Scenario', prompt: 'Give me a realistic scenario based on this lesson.' }
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendTutorPrompt(action.prompt)}
                      className={`px-3 py-1.5 rounded-full text-xs ${
                        isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowTutorPanel(true)}
                    className="px-3 py-1.5 rounded-full text-xs flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Open Tutor
                  </button>
                </div>
              </div>
              <LessonViewer
                lesson={currentLesson}
                isDarkMode={isDarkMode}
                onComplete={() => markLessonComplete(currentModuleId!, currentLessonId!)}
                onAskTutor={() => sendTutorPrompt('Answer questions about this lesson.')}
                quiz={currentQuiz}
                quizAttempts={currentModuleId ? moduleProgress[currentModuleId]?.quizAttempts || 0 : 0}
                quizBestScore={currentModuleId ? moduleProgress[currentModuleId]?.quizScore : undefined}
                onQuizComplete={handleQuizComplete}
                onQuizStart={handleQuizStart}
                onMediaPlay={() => handleMediaPlay(currentLessonId!)}
                onMediaPause={() => handleMediaPause(currentLessonId!)}
                onMediaEnded={() => handleMediaEnded(currentLessonId!)}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BookOpen className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                  Select a lesson to begin
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className={`h-16 flex items-center justify-between px-6 border-t ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            onClick={goToPreviousLesson}
            disabled={isFirstLesson}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isFirstLesson
                ? 'opacity-50 cursor-not-allowed'
                : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentLesson && (
              <span>
                Lesson {modules.slice(0, modules.findIndex(m => m.id === currentModuleId))
                  .reduce((sum, m) => sum + m.lessons.length, 0) +
                  (currentModule?.lessons.findIndex(l => l.id === currentLessonId) || 0) + 1} of{' '}
                {modules.reduce((sum, m) => sum + m.lessons.length, 0)}
              </span>
            )}
          </div>

          <button
            onClick={isLastLesson ? () => setShowCompletionModal(true) : goToNextLesson}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {isLastLesson ? 'Finish Course' : 'Next'}
            {!isLastLesson && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {showTutorPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowTutorPanel(false)}
          />
          <aside className={`relative w-full max-w-2xl h-full shadow-xl border-l ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div>
                <p className="text-sm font-semibold">Genie Tutor</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {resolvedCourse?.title || 'Course'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={tutorLanguage}
                  onChange={(e) => setTutorLanguage(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-xs ${
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {['English', 'Arabic', 'French', 'Spanish'].map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={voiceOnlyMode}
                    onChange={(e) => setVoiceOnlyMode(e.target.checked)}
                    className="accent-indigo-500"
                  />
                  Voice-only
                </label>
                <button
                  onClick={() => setShowTutorPanel(false)}
                  className={`p-2 rounded-lg ${
                    isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-64px)]">
              <ChatInterface contextInfo={lessonContextInfo} focusAreas={weakAreas} />
            </div>
          </aside>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 p-6 rounded-xl text-center ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              You've completed "{resolvedCourse.title}"
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  onComplete();
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Lesson Viewer Component
interface LessonViewerProps {
  lesson: Lesson;
  isDarkMode: boolean;
  onComplete: () => void;
  onAskTutor: () => void;
  quiz?: ModuleQuiz | null;
  quizAttempts?: number;
  quizBestScore?: number;
  onQuizComplete?: (score: number, passed: boolean, answers: Record<string, string | string[]>, results?: Record<string, boolean>) => void;
  onQuizStart?: () => void;
  onMediaPlay?: () => void;
  onMediaPause?: () => void;
  onMediaEnded?: () => void;
}

const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  isDarkMode,
  onComplete,
  onAskTutor,
  quiz,
  quizAttempts = 0,
  quizBestScore,
  onQuizComplete,
  onQuizStart,
  onMediaPlay,
  onMediaPause,
  onMediaEnded
}) => {
  const renderContent = () => {
    switch (lesson.type) {
      case 'video':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {lesson.content.videoUrl ? (
                lesson.content.videoProvider === 'youtube' ? (
                  <iframe
                    src={lesson.content.videoUrl.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    title={lesson.title}
                  />
                ) : (
                  <video
                    src={lesson.content.videoUrl}
                    controls
                    className="w-full h-full"
                    onPlay={onMediaPlay}
                    onPause={onMediaPause}
                    onEnded={() => {
                      onMediaEnded?.();
                      onComplete();
                    }}
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <Video className="w-16 h-16 opacity-50" />
                </div>
              )}
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="max-w-3xl mx-auto">
            {lesson.content.audioUrl ? (
              <div className={`p-6 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <audio
                  controls
                  className="w-full"
                  onPlay={onMediaPlay}
                  onPause={onMediaPause}
                  onEnded={() => {
                    onMediaEnded?.();
                    onComplete();
                  }}
                >
                  <source src={lesson.content.audioUrl} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            ) : (
              <div className={`p-8 rounded-lg border text-center ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <FileText className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p>Audio not available</p>
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="max-w-3xl mx-auto">
            <div
              className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''}`}
              dangerouslySetInnerHTML={{ __html: lesson.content.htmlContent || '' }}
            />
          </div>
        );

      case 'document':
        return (
          <div className="max-w-4xl mx-auto">
            {lesson.content.documentUrl ? (
              <iframe
                src={lesson.content.documentUrl}
                className="w-full h-[600px] rounded-lg border"
                title={lesson.title}
              />
            ) : (
              <div className={`p-8 rounded-lg border text-center ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <FileText className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p>Document not available</p>
              </div>
            )}
          </div>
        );

      case 'external_link':
        return (
          <div className="max-w-2xl mx-auto text-center py-12">
            <Link className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <h3 className="text-xl font-semibold mb-2">External Resource</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This lesson links to an external resource.
            </p>
            {lesson.content.externalUrl && (
              <a
                href={lesson.content.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Open Resource
                <ChevronRight className="w-5 h-5" />
              </a>
            )}
          </div>
        );

      case 'quiz':
        if (!quiz) {
          return (
            <div className="max-w-3xl mx-auto text-center py-12">
              <HelpCircle className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className="text-xl font-semibold mb-2">Quiz</h3>
              <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Quiz content is not available yet.
              </p>
            </div>
          );
        }
        return (
          <div className="max-w-4xl mx-auto">
            <QuizPlayer
              quiz={quiz}
              previousAttempts={quizAttempts}
              previousBestScore={quizBestScore}
              onComplete={(score, passed, answers, results) => {
                onQuizComplete?.(score, passed, answers, results);
              }}
              onCancel={() => {}}
              onStart={onQuizStart}
              isDarkMode={isDarkMode}
            />
          </div>
        );

      default:
        return (
          <div className="max-w-2xl mx-auto text-center py-12">
            <BookOpen className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <h3 className="text-xl font-semibold mb-2">{lesson.title}</h3>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Content type: {lesson.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      {renderContent()}

      {/* Mark Complete Button for non-auto-complete content */}
      {lesson.type !== 'video' && lesson.type !== 'quiz' && (
        <div className="max-w-3xl mx-auto mt-8 text-center">
          <button
            onClick={onComplete}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <CheckCircle className="w-5 h-5" />
            Mark as Complete
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto mt-6 flex justify-center">
        <button
          onClick={onAskTutor}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm ${
            isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Ask Genie about this lesson
        </button>
      </div>
    </div>
  );
};

// Wrap CoursePlayer with ErrorBoundary for production resilience
const CoursePlayerWithErrorBoundary: React.FC<CoursePlayerProps> = (props) => (
  <ErrorBoundary
    title="Course Player Error"
    onRetry={() => window.location.reload()}
  >
    <CoursePlayer {...props} />
  </ErrorBoundary>
);

export default CoursePlayerWithErrorBoundary;
