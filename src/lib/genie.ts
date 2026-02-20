import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface GenieOutlineModule {
  title: string;
  lessons: {
    title: string;
    type: string;
    duration?: number;
    isRequired?: boolean;
  }[];
}

export interface GenieLessonContentResult {
  title?: string;
  duration?: number;
  isRequired?: boolean;
  content: {
    htmlContent?: string;
    assignmentPrompt?: string;
    questions?: {
      question: string;
      options?: string[];
      correctAnswer?: string | string[];
      explanation?: string;
    }[];
    documentUrl?: string;
    videoUrl?: string;
    externalUrl?: string;
  };
}

export async function generateGenieOutline(
  title: string,
  sources: { title: string; description?: string; type: string; tags: string[] }[],
  prompt: string,
  orgId?: string
): Promise<GenieOutlineModule[]> {
  const call = httpsCallable(functions, 'genieGenerateOutline');
  const result = await call({ title, sources, prompt, orgId });
  const payload = result.data as { modules?: GenieOutlineModule[] };
  if (!payload.modules || !Array.isArray(payload.modules)) {
    throw new Error('Invalid outline format');
  }
  return payload.modules;
}

export async function generateGenieLessonContent(
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  lessonType: string,
  sources: { title: string; description?: string; type: string; tags: string[] }[],
  prompt: string,
  orgId?: string
): Promise<GenieLessonContentResult> {
  const call = httpsCallable(functions, 'genieGenerateLessonContent');
  const result = await call({
    courseTitle,
    moduleTitle,
    lessonTitle,
    lessonType,
    sources,
    prompt,
    orgId
  });
  const payload = result.data as GenieLessonContentResult;
  if (!payload.content) {
    throw new Error('Invalid lesson content format');
  }
  return payload;
}

export async function generateGenieLessonCritique(
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  lessonType: string,
  lessonContent: string,
  sources: { title: string; description?: string; type: string; tags: string[] }[],
  prompt: string
): Promise<string> {
  const call = httpsCallable(functions, 'genieGenerateLessonCritique');
  const result = await call({
    courseTitle,
    moduleTitle,
    lessonTitle,
    lessonType,
    lessonContent,
    sources,
    prompt
  });
  const payload = result.data as { critique?: string };
  return payload.critique || 'No critique returned.';
}

export async function generateGenieObjectives(
  sources: { title: string; description?: string; type: string; tags: string[] }[],
  context?: string,
  count: number = 6,
  orgId?: string
): Promise<string[]> {
  const call = httpsCallable(functions, 'genieGenerateObjectives');
  const result = await call({ sources, context, count, orgId });
  const payload = result.data as { objectives?: string[] };
  if (!payload.objectives || !Array.isArray(payload.objectives)) {
    throw new Error('Invalid objectives format');
  }
  return payload.objectives;
}
