import type { GenieOutlineModule, GenieLessonContentResult } from './genie';

export const validateObjectives = (objectives: unknown): string[] => {
  if (!Array.isArray(objectives)) {
    throw new Error('Invalid objectives format');
  }
  const cleaned = objectives
    .map((obj) => String(obj || '').trim())
    .filter((obj) => obj.length > 0);
  if (cleaned.length === 0) {
    throw new Error('Objectives list is empty');
  }
  return cleaned;
};

export const validateOutline = (modules: unknown): GenieOutlineModule[] => {
  if (!Array.isArray(modules)) {
    throw new Error('Invalid outline format');
  }
  const cleaned = modules
    .map((module) => ({
      title: String((module as any)?.title || '').trim(),
      lessons: Array.isArray((module as any)?.lessons)
        ? (module as any).lessons.map((lesson: any) => ({
            title: String(lesson?.title || '').trim(),
            type: String(lesson?.type || 'text'),
            duration: Number(lesson?.duration) || 10,
            isRequired: Boolean(lesson?.isRequired ?? true)
          }))
        : []
    }))
    .filter((module) => module.title && module.lessons.length > 0);
  if (cleaned.length === 0) {
    throw new Error('Outline has no modules');
  }
  return cleaned;
};

export const validateLessonContent = (payload: GenieLessonContentResult, lessonType: string) => {
  if (!payload || !payload.content) {
    throw new Error('Lesson content missing');
  }
  if (lessonType === 'quiz') {
    const questions = payload.content.questions || [];
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Quiz questions missing');
    }
  }
  return payload;
};
