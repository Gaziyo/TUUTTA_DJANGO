const TRANSIENT_MARKERS = [
  'network',
  'unavailable',
  'deadline-exceeded',
  'timeout',
  'timed out',
  'resource-exhausted',
  'too-many-requests'
];

export function isTransientError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return TRANSIENT_MARKERS.some(marker => message.includes(marker));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export function toUserErrorMessage(error: unknown, fallback: string): string {
  const code = String((error as { code?: string } | undefined)?.code || '').toLowerCase();
  const details = String((error as { details?: unknown } | undefined)?.details || '').toLowerCase();
  const message = getErrorMessage(error).toLowerCase();

  if (code.includes('failed-precondition')) {
    return 'AI service is not configured on the server. Please configure OPENAI_API_KEY in Firebase Functions secrets.';
  }
  if (code.includes('resource-exhausted')) {
    return 'AI service is at capacity right now. Please try again in a moment.';
  }
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
    return 'The service is temporarily unavailable. Please try again.';
  }
  if (code.includes('unauthenticated')) {
    return 'Please sign in and try again.';
  }
  if (code.includes('invalid-argument')) {
    return 'Some required information is missing or invalid. Please review and try again.';
  }
  if (code.includes('internal') && (details.includes('api key') || details.includes('not configured'))) {
    return 'AI service is not configured on the server. Please configure OPENAI_API_KEY in Firebase Functions secrets.';
  }

  if (message.includes('permission-denied') || message.includes('insufficient permissions')) {
    return 'You do not have permission to perform this action.';
  }
  if (message.includes('unauthenticated') || message.includes('auth') || message.includes('sign in')) {
    return 'Please sign in and try again.';
  }
  if (message.includes('validation') || message.includes('invalid') || message.includes('prerequisite')) {
    return 'Some required information is missing or invalid. Please review and try again.';
  }
  if (message.includes('context length') || message.includes('too long for the ai model') || message.includes('too many tokens')) {
    return 'This chat is too long for the model. Start a new chat or shorten your message.';
  }
  if (message.includes('not configured') || message.includes('api key')) {
    return 'AI service is not configured on the server. Please configure OPENAI_API_KEY in Firebase Functions secrets.';
  }
  if (message.includes('quota') || message.includes('rate limit')) {
    return 'AI service is at capacity right now. Please try again in a moment.';
  }
  if (isTransientError(error)) {
    return 'The service is temporarily unavailable. Please try again.';
  }

  return fallback;
}
