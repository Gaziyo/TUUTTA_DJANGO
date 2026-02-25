/**
 * Frontend AI Client — Phase 5
 *
 * All AI operations route through the Django REST API backend.
 * Direct browser-to-OpenAI calls have been removed.
 *
 * Endpoints:
 *   POST /api/v1/ai/chat/       → { messages, model? } → { content }
 *   POST /api/v1/ai/transcribe/ → multipart audio file → { transcript }
 *   POST /api/v1/ai/tts/        → { text, voice?, speed? } → { base64Audio, format }
 */

import { apiClient } from './api';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Send a chat completion request to the Django AI service.
 * Supports vision messages (image_url content type) transparently.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  model = 'gpt-4o-mini'
): Promise<string> {
  const { data } = await apiClient.post('/ai/chat/', { messages, model });
  return (data as { content: string }).content;
}

/**
 * Transcribe an audio blob via the Django AI service (Whisper).
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const { data } = await apiClient.post('/ai/transcribe/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (data as { transcript: string }).transcript;
}

/**
 * Convert text to speech via the Django AI service (OpenAI TTS).
 * Returns a base64-encoded MP3 string.
 */
export async function textToSpeech(
  text: string,
  voice = 'nova',
  speed = 1.0
): Promise<string> {
  const { data } = await apiClient.post('/ai/tts/', { text, voice, speed });
  return (data as { base64Audio: string }).base64Audio;
}
