/**
 * AI Client — calls Django backend instead of Firebase Functions / browser OpenAI directly.
 */
import { apiClient } from './api';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(messages: Message[], model = 'gpt-4o-mini'): Promise<string> {
  const { data } = await apiClient.post('/ai/chat/', { messages, model });
  return data.content;
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const { data } = await apiClient.post('/ai/transcribe/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.transcript;
}
