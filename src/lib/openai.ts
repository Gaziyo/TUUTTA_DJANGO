import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebase';
import { FileUpload } from '../types';
import { extractTextFromFile } from './fileProcessor';
import { performWebSearch, formatSearchResults } from './search';
import { logger } from './logger';
import { retryWithBackoff } from './retry';
import { isTransientError, toUserErrorMessage } from './errorHandling';

const chatCompletion = httpsCallable(functions, 'genieChatCompletion');
const analyzeImageCall = httpsCallable(functions, 'genieAnalyzeImage');
const MAX_MESSAGE_HISTORY = 8;
const MAX_MESSAGE_CHARS = 1800;
const MAX_PROMPT_CHARS = 12000;

// Create an AbortController instance
let currentAbortController: AbortController | null = null;

const shouldUseAttachedFileContext = (
  latestUserMessage: string,
  files: FileUpload[] | undefined
): boolean => {
  if (!files || files.length === 0) return false;
  const text = latestUserMessage.toLowerCase().trim();
  if (!text) return false;

  const fileTerms = /\b(attached|attachment|uploaded|upload|file|document|pdf|docx?|sheet|spreadsheet|csv|image|screenshot)\b/i;
  const requestTerms = /\b(from|use|based on|according to|in|inside|summari[sz]e|analy[sz]e|review|extract|read|compare|quote|what does|what is in)\b/i;
  const explicitPhrases = [
    'from the attached file',
    'from my attached file',
    'from the uploaded file',
    'from my uploaded file',
    'based on the attached file',
    'based on the uploaded file',
    'use the attached file',
    'use my file',
    'check the file',
    'read the file',
    'summarize the file',
    'summarise the file'
  ];

  if (explicitPhrases.some(phrase => text.includes(phrase))) {
    return true;
  }

  if (fileTerms.test(text) && requestTerms.test(text)) {
    return true;
  }

  // Treat explicit filename mention as an opt-in for file context.
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedText = normalize(text);
  return files.some(file => {
    const fileName = normalize(file.name || '');
    if (!fileName) return false;
    return normalizedText.includes(fileName);
  });
};

async function analyzeImage(file: FileUpload): Promise<string> {
  try {
    if (!auth.currentUser) {
      throw new Error('Please sign in to analyze images.');
    }

    if (!file.content) {
      throw new Error('Image content is missing');
    }

    const response = await retryWithBackoff(
      () => analyzeImageCall({
        imageUrl: file.content,
        detail: 'high'
      }),
      { retries: 2, shouldRetry: isTransientError }
    );
    const content = (response.data as { content?: string })?.content;
    if (!content) {
      throw new Error('No analysis generated for the image');
    }

    return content;
  } catch (error) {
    console.error('Image analysis error:', error);
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        throw new Error('You do not have permission to analyze images.');
      }
      if (error.message.includes('unauthenticated')) {
        throw new Error('Please sign in to analyze images.');
      }
      if (error.message.includes('unavailable') || error.message.includes('deadline-exceeded')) {
        throw new Error('The analysis service is temporarily unavailable. Please try again.');
      }
      throw error;
    }
    throw new Error('Failed to analyze image');
  }
}

export const stopTutorResponse = () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
};

export const generateTutorResponse = async (
  messages: { role: 'user' | 'assistant'; content: string }[],
  files?: FileUpload[],
  withSearch: boolean = false
): Promise<string> => {
  try {
    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('No messages provided');
    }

    // Validate each message has content
    const validMessages = messages.filter(msg => msg && typeof msg.content === 'string' && msg.content.trim());
    if (validMessages.length === 0) {
      throw new Error('No valid messages found');
    }

    // Create a new AbortController for this request
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    if (!auth.currentUser) {
      throw new Error('Please sign in to use Genie AI.');
    }

    let context = '';
    let fileContext = '';
    let webContext = '';
    // Get the user's question for web search
    const originalUserQuestion = validMessages[validMessages.length - 1].content;

    const shouldIncludeFileContext = shouldUseAttachedFileContext(originalUserQuestion, files);

    // Process files only when explicitly requested in the latest user message.
    if (files && files.length > 0 && shouldIncludeFileContext) {
      const fileContents: string[] = [];
      
      for (const file of files) {
        // Check if the request has been aborted
        if (signal.aborted) {
          throw new Error('Request cancelled');
        }

        try {
          let content = '';
          if (file.type.startsWith('image/')) {
            content = await analyzeImage(file);
            fileContents.push(`[Image Analysis: ${file.name}]\n${content}`);
          } else { // Always extract for non-image files
            // Extract text if not already done
            const text = await extractTextFromFile(file);
            content = text;
            fileContents.push(`[File Content: ${file.name}]\n${content}`);
          }

          void content;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          logger.warn(`[OpenAI] File processing skipped due to error for ${file.name}:`, error);
          continue;
        }
      }

      if (fileContents.length > 0) {
        fileContext = '\nAnalyzed content from uploaded materials:\n' + fileContents.join('\n\n');
      }
    } else if (files && files.length > 0) {
      logger.debug('[OpenAI] Files are attached but file context was not requested explicitly; skipping file extraction.');
    }

    // Check if the request has been aborted
    if (signal.aborted) {
      throw new Error('Request cancelled');
    }

    // Perform web search if requested
    if (withSearch) {
      try {
        logger.debug('[OpenAI] Web search requested for:', originalUserQuestion);
        const results = await retryWithBackoff(
          () => performWebSearch(originalUserQuestion),
          { retries: 2, shouldRetry: isTransientError }
        );
        logger.debug('[OpenAI] Web search returned', results.length, 'results');

        if (results.length > 0) {
          const formattedResults = formatSearchResults(results);
          webContext = '\n\n=== WEB SEARCH RESULTS (CURRENT REAL-TIME DATA) ===\n' + formattedResults;
          logger.debug('[OpenAI] Added search results to context');
          logger.debug('[OpenAI] Web context preview:', webContext.substring(0, 500));
        } else {
          logger.warn('[OpenAI] Web search returned no results');
        }
      } catch (error) {
        console.error('[OpenAI] Web search error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[OpenAI] Error details:', errorMessage);
        // Don't add error message to validMessages - just let it proceed without search results
      }
    }

    // Check if the request has been aborted
    if (signal.aborted) {
      throw new Error('Request cancelled');
    }

    // Build system prompt based on whether we have web search results
    if (webContext) {
      context += webContext;
    }

    if (fileContext) {
      const maxFileContextChars = withSearch ? 2000 : 8000;
      context += fileContext.length > maxFileContextChars
        ? `${fileContext.slice(0, maxFileContextChars).trim()}…`
        : fileContext;
    }

    const hasWebSearchResults = withSearch && webContext.length > 0;
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const systemPrompt = hasWebSearchResults
      ? `You are a helpful assistant with access to LIVE web search results. Today's date is ${currentDate}.

IMPORTANT: A web search was JUST performed for the user's query. The search results below contain REAL, CURRENT information from the internet. You MUST use these results to answer.

DO NOT say:
- "I cannot access real-time information"
- "I don't have access to future data"
- "I cannot browse the internet"

You HAVE the search results right here. USE THEM.

SEARCH RESULTS FROM THE WEB:
${context}

INSTRUCTIONS:
1. Read the search results above carefully
2. Extract the relevant information that answers the user's question
3. Present the information clearly, citing the source websites
4. If the search results contain news headlines, list them
5. If the search results contain dates/times, use that information

Answer the user's question using ONLY the search results provided above.`
      : `You are a knowledgeable and patient tutor. Format responses using markdown:
# Main Topic
## Subtopics
### Key Points
* Use bullets for examples
1. Use numbers for steps
**Bold** for emphasis
> For quotes/definitions
--- For sections

${context ? '\nAvailable context from materials:\n' + context : ''}`;

    if (signal.aborted) {
      throw new Error('Request cancelled');
    }

    const userPrompt = validMessages
      .slice(-MAX_MESSAGE_HISTORY)
      .map(message => {
        const boundedContent = message.content.length > MAX_MESSAGE_CHARS
          ? `${message.content.slice(0, MAX_MESSAGE_CHARS).trim()}…`
          : message.content;
        return `${message.role.toUpperCase()}: ${boundedContent}`;
      })
      .join('\n')
      .slice(0, MAX_PROMPT_CHARS);

    const response = await retryWithBackoff(
      () => chatCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 1000
      }),
      { retries: 2, shouldRetry: isTransientError }
    );
    const content = (response.data as { content?: string })?.content;

    currentAbortController = null;
    if (!content) throw new Error('No response generated');

    return content;
  } catch (error) {
    // Check if the error was due to cancellation
    if (error instanceof Error && error.message === 'Request cancelled') {
      throw new Error('Chat response cancelled');
    }
    const firebaseCode = (error as { code?: string } | undefined)?.code;
    const firebaseMessage = (error as { message?: string } | undefined)?.message;
    const firebaseDetails = (error as { details?: unknown } | undefined)?.details;
    console.error('Error generating response:', {
      error,
      code: firebaseCode,
      message: firebaseMessage,
      details: firebaseDetails
    });
    const userMessage = toUserErrorMessage(error, 'Failed to generate response.');
    if (
      import.meta.env.DEV
      && userMessage === 'Failed to generate response.'
      && firebaseCode
    ) {
      const detailsText = typeof firebaseDetails === 'string'
        ? firebaseDetails
        : firebaseDetails ? JSON.stringify(firebaseDetails) : '';
      throw new Error(`Failed to generate response (${firebaseCode}${detailsText ? `: ${detailsText}` : ''}).`);
    }
    throw new Error(userMessage);
  } finally {
    currentAbortController = null;
  }
};

export { analyzeImage };
