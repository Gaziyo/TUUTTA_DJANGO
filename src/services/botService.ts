/**
 * Bot Service
 *
 * AI bot session persistence layer.
 * Stubbed: no Django /ai/sessions/ endpoint exists yet.
 * AI completions route to /ai/chat/ (ChatCompletionView) — see openai.ts.
 */

import type { BotMessage, BotSession } from '../context/BotPipelineContext';

/**
 * Load all bot sessions for a user in an organization.
 * Stubbed until a Django session-storage endpoint is available.
 */
export async function loadBotSessions(
  _orgId: string,
  _userId: string
): Promise<BotSession[]> {
  return [];
}

/**
 * Create or update a bot session (upsert by session.id).
 */
export async function upsertBotSession(
  _orgId: string,
  _userId: string,
  _session: BotSession
): Promise<void> {}

/**
 * Append a message to an existing bot session.
 */
export async function appendBotMessage(
  _orgId: string,
  _sessionId: string,
  _message: BotMessage
): Promise<void> {}
