/**
 * Genie AI Generation Library
 *
 * Delegates to Django REST API: /ai/chat/
 * Replaces Firebase Cloud Functions callables (genieGenerateOutline, genieGenerateLessonContent, etc.)
 */

import { apiClient } from './api';

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

async function chatJSON<T>(systemPrompt: string, userPrompt: string, model = 'gpt-4o-mini'): Promise<T> {
  const { data } = await apiClient.post('/ai/chat/', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
  });
  const raw = (data as { content?: string })?.content || '';
  // Strip possible markdown code fences
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(jsonStr) as T;
}

export async function generateGenieOutline(
  title: string,
  sources: { title: string; description?: string; type: string; tags: string[] }[],
  prompt: string,
  orgId?: string
): Promise<GenieOutlineModule[]> {
  const systemPrompt = `You are an expert instructional designer. Generate a structured course outline as JSON.
Return only valid JSON with a "modules" array.`;
  const userPrompt = `Create a course outline for: "${title}"
Sources: ${JSON.stringify(sources)}
Additional context: ${prompt}${orgId ? `\nOrg: ${orgId}` : ''}

Return in this exact JSON format:
{"modules":[{"title":"Module Title","lessons":[{"title":"Lesson Title","type":"lesson","duration":30,"isRequired":true}]}]}`;

  const payload = await chatJSON<{ modules?: GenieOutlineModule[] }>(systemPrompt, userPrompt, 'gpt-4o-mini');
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
  const systemPrompt = `You are an expert instructional content creator. Generate lesson content as JSON.
Return only valid JSON matching the GenieLessonContentResult schema.`;
  const userPrompt = `Create ${lessonType} content for:
Course: "${courseTitle}"
Module: "${moduleTitle}"
Lesson: "${lessonTitle}"
Sources: ${JSON.stringify(sources)}
Instructions: ${prompt}${orgId ? `\nOrg: ${orgId}` : ''}

Return JSON with a "content" object containing relevant fields (htmlContent, assignmentPrompt, questions, etc).`;

  const payload = await chatJSON<GenieLessonContentResult>(systemPrompt, userPrompt, 'gpt-4o-mini');
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
  const systemPrompt = `You are an expert instructional designer and quality reviewer. Critique lesson content with specific, actionable feedback.`;
  const userPrompt = `Review this ${lessonType} lesson:
Course: "${courseTitle}", Module: "${moduleTitle}", Lesson: "${lessonTitle}"
Content: ${lessonContent}
Sources: ${JSON.stringify(sources)}
Focus: ${prompt}

Provide a constructive critique covering accuracy, engagement, learning objectives alignment, and improvement suggestions.`;

  const { data } = await apiClient.post('/ai/chat/', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'gpt-4o-mini',
  });
  return (data as { content?: string })?.content || 'No critique returned.';
}

export async function generateGenieObjectives(
  sources: { title: string; description?: string; type: string; tags: string[] }[],
  context?: string,
  count: number = 6,
  orgId?: string
): Promise<string[]> {
  const systemPrompt = `You are an expert instructional designer specializing in learning objectives.
Return only valid JSON with an "objectives" array of strings.`;
  const userPrompt = `Generate ${count} measurable learning objectives for these sources:
${JSON.stringify(sources)}${context ? `\nContext: ${context}` : ''}${orgId ? `\nOrg: ${orgId}` : ''}

Return: {"objectives":["Objective 1","Objective 2",...]}`;

  const payload = await chatJSON<{ objectives?: string[] }>(systemPrompt, userPrompt, 'gpt-4o-mini');
  if (!payload.objectives || !Array.isArray(payload.objectives)) {
    throw new Error('Invalid objectives format');
  }
  return payload.objectives;
}
