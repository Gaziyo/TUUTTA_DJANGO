import { Question, Assessment } from '../types';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { logger } from './logger';

const chatCompletion = httpsCallable(functions, 'genieChatCompletion');
const textToSpeech = httpsCallable(functions, 'genieTextToSpeech');
const browserOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

// Create an AbortController instance
let currentAbortController: AbortController | null = null;

const shouldFallbackToBrowserOpenAI = (error: unknown): boolean => {
  if (!browserOpenAIKey) return false;
  const code = String((error as { code?: string } | undefined)?.code || '').toLowerCase();
  const message = String((error as { message?: string } | undefined)?.message || '').toLowerCase();
  const detailsRaw = (error as { details?: unknown } | undefined)?.details;
  const details = typeof detailsRaw === 'string'
    ? detailsRaw.toLowerCase()
    : detailsRaw ? JSON.stringify(detailsRaw).toLowerCase() : '';

  return code.includes('functions/internal')
    || code.includes('functions/unavailable')
    || message.includes('connection error')
    || details.includes('connection error')
    || details.includes('cannot reach openai');
};

const chatCompletionWithFallback = async (payload: {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: 'json_object';
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string }> => {
  try {
    const result = await chatCompletion(payload);
    const content = (result.data as { content?: string } | undefined)?.content;
    if (!content) throw new Error('No response received from assessment generator');
    return { content };
  } catch (error) {
    if (!shouldFallbackToBrowserOpenAI(error)) throw error;
    if (!browserOpenAIKey) throw error;

    const modelCandidates = [payload.model, 'gpt-4o-mini', 'gpt-4.1-mini'].filter(Boolean) as string[];
    let lastError: unknown = null;
    for (const model of modelCandidates) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${browserOpenAIKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: payload.systemPrompt },
              { role: 'user', content: payload.userPrompt }
            ],
            response_format: payload.responseFormat ? { type: payload.responseFormat } : undefined,
            temperature: payload.temperature ?? 0.7,
            max_tokens: payload.maxTokens ?? 1000
          })
        });

        if (!response.ok) {
          lastError = new Error(`Browser OpenAI assessment fallback failed (${response.status})`);
          continue;
        }

        const data = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          lastError = new Error('No content from browser OpenAI assessment fallback');
          continue;
        }
        logger.warn('[Assessment] Falling back to browser OpenAI because callable failed.');
        return { content };
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    }

    throw lastError ?? error;
  }
};

const textToSpeechWithFallback = async (payload: {
  text: string;
  voice?: string;
}): Promise<{ base64Audio: string }> => {
  try {
    const result = await textToSpeech(payload);
    const base64Audio = (result.data as { base64Audio?: string } | undefined)?.base64Audio;
    if (!base64Audio) throw new Error('No audio returned');
    return { base64Audio };
  } catch (error) {
    if (!shouldFallbackToBrowserOpenAI(error)) throw error;
    if (!browserOpenAIKey) throw error;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${browserOpenAIKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: payload.voice || 'nova',
        input: payload.text.slice(0, 4096),
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      throw new Error(`Browser OpenAI TTS fallback failed (${response.status})`);
    }

    const audioData = await response.arrayBuffer();
    const base64Audio = btoa(
      Array.from(new Uint8Array(audioData))
        .map(byte => String.fromCharCode(byte))
        .join('')
    );
    logger.warn('[Assessment] Falling back to browser OpenAI TTS because callable failed.');
    return { base64Audio };
  }
};

async function generateAudioPrompt(text: string): Promise<string> {
  try {
    if (!text?.trim()) {
      throw new Error('No text provided for audio prompt');
    }

    const payload = await textToSpeechWithFallback({ text, voice: 'nova' });
    return `data:audio/mp3;base64,${payload.base64Audio}`;
  } catch (error) {
    console.error('Audio generation error:', error);
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw new Error('Network error while generating audio. Please check your internet connection.');
    }
    throw new Error('Failed to generate audio prompt. Please try again.');
  }
}

export const stopTutorResponse = () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
};

export async function generateAssessment(
  chatContent: string,
  _notesContent: string, // Re-added, prefixed with _ as unused
  _filesContent: string, // Re-added, prefixed with _ as unused
  assessmentType: string = 'general',
  questionCount: number = 5,
  sourceUrl?: string // <-- Add optional sourceUrl parameter
): Promise<Assessment> {
  try {
    // Use chatContent as the primary content source, could be scraped text
    const contentToAssess = chatContent;
    if (!contentToAssess?.trim()) {
      throw new Error('Please provide some content to generate questions from');
    }

    // Create a new AbortController for this request
    currentAbortController = new AbortController();
    // const signal = currentAbortController.signal; // Removed unused variable

    // let context = ''; // Removed unused variable
    // const userQuestion = chatContent; // Removed unused variable

    let systemPrompt = '';
    let prompt = '';

    switch (assessmentType) {
      case 'mathematics':
        systemPrompt = `You are an expert mathematics assessment creator.
Create diverse math questions that test understanding through different formats.
Use LaTeX for mathematical expressions and equations.`;
        
        prompt = `Create ${questionCount} mathematics questions based on this content:

${chatContent}

Required question types (distribute evenly):
1. Multiple choice with mathematical expressions
2. Fill in the blank with numerical or algebraic answers
3. Step-by-step problem solving
4. Matching equations and solutions
5. True/False mathematical statements
6. Graph interpretation questions

Return in this exact JSON format:
{
  "questions": [
    {
      "type": "multiple",
      "question": "Question text with LaTeX math expressions",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "explanation": "Step-by-step solution with LaTeX",
      "mathExpression": "LaTeX expression for the problem",
      "hint": "Optional hint for solving"
    },
    {
      "type": "fill",
      "question": "Complete this equation: [BLANK]",
      "correctAnswer": "answer in LaTeX",
      "alternativeAnswers": ["alt1", "alt2"],
      "explanation": "Step-by-step solution",
      "mathExpression": "LaTeX expression",
      "hint": "Solving tip"
    },
    {
      "type": "step",
      "question": "Solve this problem",
      "steps": [
        {
          "instruction": "Step 1 instruction",
          "solution": "Step 1 solution in LaTeX"
        }
      ],
      "finalAnswer": "Final answer in LaTeX",
      "explanation": "Full explanation"
    },
    {
      "type": "match",
      "question": "Match equations with solutions",
      "pairs": [
        {
          "equation": "Equation in LaTeX",
          "solution": "Solution in LaTeX"
        }
      ]
    },
    {
      "type": "graph",
      "question": "Interpret this graph",
      "graphData": {
        "type": "function",
        "equation": "f(x) = ...",
        "range": [-10, 10]
      },
      "options": ["interpretation1", "interpretation2", "interpretation3", "interpretation4"],
      "correctAnswer": "interpretation1"
    }
  ]
}

IMPORTANT: 
- Use proper LaTeX syntax for all mathematical expressions
- Include step-by-step solutions
- Provide clear explanations
- Add helpful hints for complex problems`;
        break;

      case 'speaking':
        systemPrompt = `You are an expert speaking assessment creator.
Create speaking prompts that test oral communication skills.`;
        
        prompt = `Create ${questionCount} speaking assessment questions based on this content:

${chatContent}

Requirements:
1. Each question must have a clear speaking prompt
2. Include expected response duration in seconds
3. Provide evaluation criteria
4. Add helpful hints for the speaker

Return in this exact JSON format:
{
  "questions": [
    {
      "type": "speaking",
      "question": "Speaking prompt that clearly asks a question the user should respond to",
      "expectedDuration": 60,
      "hint": "Speaking tips and suggestions",
      "rubric": [
        {
          "criteria": "Pronunciation",
          "maxScore": 10,
          "description": "Clear and accurate pronunciation of words"
        },
        {
          "criteria": "Fluency",
          "maxScore": 10,
          "description": "Smooth and natural speech flow"
        },
        {
          "criteria": "Content",
          "maxScore": 10,
          "description": "Relevant and well-organized response"
        }
      ]
    }
  ]
}`;
        break;

      case 'general':
        systemPrompt = `You are an expert assessment creator specializing in mixed-format questions.
Create diverse questions that test understanding through different question types. Ensure an even distribution of question types.`;
        
        prompt = `Create exactly ${questionCount} questions based on this content, with an EQUAL distribution of these question types:

${chatContent}

Required question types (distribute evenly):
1. Multiple choice (4 options)
2. Fill in the blank (with alternative correct answers)
3. True/False questions
4. Drag and drop categorization (2-3 categories with 4-6 items)
5. Flip cards for key concepts (front shows term/question, back shows answer/explanation)

Return in this exact JSON format:
{
  "questions": [
    {
      "type": "multiple",
      "question": "Question text",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "explanation": "Why this is correct"
    },
    {
      "type": "fill",
      "question": "Complete this statement: [BLANK] is an example of...",
      "correctAnswer": "answer",
      "alternativeAnswers": ["alt1", "alt2"],
      "explanation": "Why this is correct"
    },
    {
      "type": "truefalse",
      "question": "Statement to evaluate",
      "correctAnswer": "true",
      "explanation": "Why this is correct"
    },
    {
      "type": "drag",
      "question": "Categorize these items",
      "items": [
        {"id": "1", "content": "Item 1", "category": "Category A"},
        {"id": "2", "content": "Item 2", "category": "Category B"}
      ],
      "categories": ["Category A", "Category B"],
      "explanation": "Explanation of correct categorization"
    },
    {
      "type": "flip",
      "question": "Review this concept",
      "frontContent": "Term or concept",
      "backContent": "Definition or explanation",
      "hint": "Optional hint for studying"
    }
  ]
}`;
        break;

      case 'language-listening':
        systemPrompt = `You are an expert language assessment creator specializing in listening comprehension.
Create diverse listening exercises that test different aspects of audio comprehension.
Include clear transcripts and varied question types.`;
        
        prompt = `Create ${questionCount} listening comprehension questions based on this content:

${chatContent}

Requirements for each question:
1. Audio prompt text (1-2 sentences, natural conversational style)
2. Question about the audio content
3. Multiple choice options (4 choices)
4. Correct answer and explanation
5. Full transcript of the audio
6. Optional time limit (in seconds)
7. Maximum number of times the audio can be played
8. Difficulty level (beginner/intermediate/advanced)
9. Focus skill (main listening skill being tested)
10. Note-taking hints or key points to listen for

Return in this exact JSON format:
{
  "questions": [
    {
      "type": "listening",
      "audioPromptText": "Text to convert to speech (1-2 natural sentences)",
      "question": "Question about the audio content",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "explanation": "Why this is the correct answer",
      "transcript": "Full transcript of the audio",
      "timeLimit": 300,
      "maxListens": 3,
      "difficultyLevel": "intermediate",
      "focusSkill": "main skill being tested",
      "noteHints": ["Key point 1", "Key point 2"],
      "hint": "Optional hint for the listener"
    }
  ]
}

IMPORTANT:
- Keep audio prompts natural and conversational
- Vary the types of comprehension being tested
- Include clear explanations
- Provide helpful note-taking guidance`;
        break;

      case 'reading':
        systemPrompt = `You are an expert reading assessment creator specializing in comprehensive reading exercises.
Create diverse reading assessment questions that test comprehension, speed reading, and vocabulary skills.`;
        
        prompt = `Based *only* on the provided content below, create exactly ${questionCount} reading assessment questions.
IMPORTANT: Each "question" field MUST contain a specific, meaningful question about the passage content, not just a placeholder like "Question about the passage" or "Question X".

Content:
${chatContent}

Required reading question types:
1. Reading comprehension (passage with multiple-choice questions)
2. Speed reading (timed passage with comprehension check)
3. Vocabulary building (passage with key vocabulary to identify and define)

Return in this exact JSON format:
{
  "questions": [
    {
      "type": "reading",
      "passage": "A passage of text (200-300 words)",
      "question": "Specific question testing comprehension of the passage content",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "explanation": "Why this is correct",
      "difficultyLevel": "intermediate",
      "culturalNotes": "Optional cultural context",
      "wordCount": 250
    },
    {
      "type": "speed-reading",
      "passage": "A passage for speed reading (300-500 words)",
      "question": "Specific question testing comprehension after speed reading",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "explanation": "Explanation of the answer",
      "timeLimit": 120,
      "wordCount": 400,
      "difficultyLevel": "intermediate"
    },
    {
      "type": "vocabulary",
      "passage": "A passage with vocabulary focus",
      "vocabularyItems": [
        {
          "word": "example",
          "definition": "Definition of the word",
          "context": "How the word is used in context"
        }
      ],
      "question": "Specific question about the usage or meaning of vocabulary in the passage",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "wordCount": 200
    }
  ]
}

IMPORTANT:
- Generate specific, meaningful questions testing comprehension of the provided Content. Do NOT use placeholders.
- Include word counts for all passages.
- Set appropriate time limits for speed reading.
- Provide clear vocabulary definitions and context.
- Include varied question types from the list provided.
- Add helpful explanations for answers.`;
        break;

      case 'writing':
        systemPrompt = `You are an expert writing assessment creator specializing in guided writing exercises.
Create diverse writing prompts that test different writing skills with clear objectives and guidance.`;
        
        prompt = `Create ${questionCount} writing assessment questions based on this content:

${chatContent}

Required writing question types:
1. Essay writing (academic/formal)
2. Creative writing (narrative/descriptive)
3. Technical writing (instructions/reports)

Return in this exact JSON format:
{
  "questions": [
    {
      "type": "writing",
      "question": "Writing prompt title",
      "prompt": "Detailed writing instructions",
      "writingType": "essay",
      "wordLimit": 300,
      "timeLimit": 30,
      "rubric": [
        {
          "criteria": "Organization",
          "maxScore": 10,
          "description": "Clear structure and flow"
        }
      ],
      "modelAnswer": "Example response",
      "grammarRules": ["Rule 1", "Rule 2"],
      "styleGuide": "Style guidelines"
    }
  ]
}`;
        break;

      default:
        throw new Error('Invalid assessment type');
    }

    const result = await chatCompletionWithFallback({
      model: "gpt-4-turbo-preview",
      systemPrompt,
      userPrompt: prompt,
      responseFormat: "json_object",
      temperature: 0.7
    });

    const responseContent = result.content;
    if (!responseContent) {
      throw new Error('No response received from assessment generator');
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(responseContent);
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error('Failed to parse assessment response');
    }

    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }

    const questions: Question[] = [];
    for (const q of parsedContent.questions) {
      try {
        const baseQuestion: Partial<Question> = { // Use Partial<Question> for easier optional field handling
          id: Math.random().toString(36).substr(2, 9),
          type: q.type,
          question: q.question || 'No question provided',
          explanation: q.explanation || '',
          hint: q.hint || '',
          timeLimit: q.timeLimit,
          // maxListens removed from base - will be added in 'listening' case
          difficultyLevel: q.difficultyLevel,
          // focusSkill removed from base - will be added in relevant cases (e.g., listening)
          // noteHints removed from base - will be added in relevant cases (e.g., listening)
          mathExpression: q.mathExpression || '',
          graphData: q.graphData || null,
          // Add source if sourceUrl is provided
          ...(sourceUrl && { source: { url: sourceUrl } })
        };

        // Ensure type safety before pushing
        let finalQuestion: Question | null = null;

        switch (q.type) {
          case 'listening':
            if (!q.audioPromptText?.trim()) {
              throw new Error('Missing audio prompt text');
            }
            const audioPrompt = await generateAudioPrompt(q.audioPromptText);
            finalQuestion = {
              ...baseQuestion,
              type: 'listening', // Explicitly set type for safety
              audioPrompt,
              options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswer: q.correctAnswer || q.options?.[0] || 'Option A',
              transcript: q.transcript || q.audioPromptText,
              maxListens: q.maxListens, // Add maxListens specifically here
              focusSkill: q.focusSkill, // Add focusSkill specifically here
              noteHints: q.noteHints || [], // Add noteHints specifically here
            } as Question;
            break;

          case 'multiple':
            finalQuestion = {
              ...baseQuestion,
              type: 'multiple',
              options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswer: q.correctAnswer || q.options?.[0] || 'Option A'
            } as Question;
            break;

          case 'fill':
            finalQuestion = {
              ...baseQuestion,
              type: 'fill',
              correctAnswer: q.correctAnswer || 'Sample answer',
              alternativeAnswers: q.alternativeAnswers || []
            } as Question;
            break;

          case 'truefalse':
             finalQuestion = {
               ...baseQuestion,
               type: 'truefalse', // Add type
               options: ['true', 'false'],
               correctAnswer: q.correctAnswer?.toLowerCase() || 'true'
             } as Question;
             break;

          case 'drag':
             finalQuestion = {
               ...baseQuestion,
               type: 'drag', // Add type
               items: q.items || [
                 { id: '1', content: 'Item 1', category: 'Category A' },
                 { id: '2', content: 'Item 2', category: 'Category A' },
                 { id: '3', content: 'Item 3', category: 'Category B' },
                 { id: '4', content: 'Item 4', category: 'Category B' }
               ],
               categories: q.categories || ['Category A', 'Category B']
             } as Question;
             break;

          case 'flip':
             finalQuestion = {
               ...baseQuestion,
               type: 'flip', // Add type
               frontContent: q.frontContent || 'Front of card',
               backContent: q.backContent || 'Back of card'
             } as Question;
             break;

          case 'speaking':
             finalQuestion = {
               ...baseQuestion,
               type: 'speaking', // Add type
               expectedDuration: q.expectedDuration || 60,
               rubric: q.rubric || [
                 {
                   criteria: 'Pronunciation',
                   maxScore: 10,
                   description: 'Clear and accurate pronunciation of words'
                 },
                 {
                   criteria: 'Fluency',
                   maxScore: 10,
                   description: 'Smooth and natural speech flow'
                 },
                 {
                   criteria: 'Content',
                   maxScore: 10,
                   description: 'Relevant and well-organized response'
                 }
               ]
             } as Question;
             break;

          // Consolidate reading types logic if possible, or handle separately
          case 'reading':
             finalQuestion = {
               ...baseQuestion,
               type: 'reading', // Add type
               passage: q.passage || 'Sample passage',
               options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
               correctAnswer: q.correctAnswer || q.options?.[0] || 'Option A',
               wordCount: q.wordCount,
               difficultyLevel: q.difficultyLevel || 'intermediate',
               culturalNotes: q.culturalNotes
             } as Question;
             break;
          case 'speed-reading':
             finalQuestion = {
                ...baseQuestion,
                type: 'speed-reading', // Add type
                passage: q.passage || 'Sample passage for speed reading',
                options: q.options || [],
                correctAnswer: q.correctAnswer || q.options?.[0],
                timeLimit: q.timeLimit || 120, // Default time limit
                wordCount: q.wordCount,
                difficultyLevel: q.difficultyLevel || 'intermediate',
             } as Question;
             break;
          case 'vocabulary':
             finalQuestion = {
               ...baseQuestion,
               type: 'vocabulary', // Add type
               passage: q.passage || 'Sample passage',
               vocabularyItems: q.vocabularyItems || [],
               options: q.options || [], // Vocab questions might still have options
               correctAnswer: q.correctAnswer || q.options?.[0], // Or might not have a single correct option
               wordCount: q.wordCount,
               difficultyLevel: q.difficultyLevel || 'intermediate',
             } as Question;
             break;

          case 'writing':
             finalQuestion = {
               ...baseQuestion,
               type: 'writing', // Add type
               prompt: q.prompt || 'Write about...',
               writingType: q.writingType || 'essay',
               wordLimit: q.wordLimit || 300,
               timeLimit: q.timeLimit || 30,
               rubric: q.rubric || [
                 {
                   criteria: 'Organization',
                   maxScore: 10,
                   description: 'Clear structure and flow'
                 }
               ],
               modelAnswer: q.modelAnswer || 'Sample response',
               grammarRules: q.grammarRules || ['Use proper punctuation'],
               styleGuide: q.styleGuide || 'Follow academic writing style'
             } as Question;
             break;

          case 'step':
             finalQuestion = {
               ...baseQuestion,
               type: 'step', // Add type
               steps: q.steps || [],
               finalAnswer: q.finalAnswer || ''
             } as Question;
             break;

          case 'match':
            finalQuestion = {
              ...baseQuestion,
              type: 'match',
              pairs: q.pairs || []
            } as Question;
            break;

          case 'graph':
             finalQuestion = {
               ...baseQuestion,
               type: 'graph', // Add type
               options: q.options || [],
               correctAnswer: q.correctAnswer || '',
               // Ensure graphData is included if present in baseQuestion
               graphData: baseQuestion.graphData
             } as Question;
             break;

          default:
            logger.warn(`Skipping unknown question type: ${q.type}`);
            // Ensure finalQuestion is null for unsupported types
            finalQuestion = null;
        }

        // Push the validated & typed question if it was successfully created
        if (finalQuestion) {
          // Basic validation: ensure essential fields exist based on type before pushing
          if (finalQuestion.id && finalQuestion.type && finalQuestion.question) {
             questions.push(finalQuestion);
          } else {
             logger.warn(`Skipping question due to missing essential fields: ${JSON.stringify(finalQuestion)}`);
          }
        }

      } catch (error) {
        console.error('Error processing question:', error);
        continue;
      }
    }

    if (questions.length === 0) {
      throw new Error('No valid questions could be generated. Please try again.');
    }

    // Ensure we have the requested number of questions
    while (questions.length < questionCount) {
      questions.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'multiple',
        question: `Question ${questions.length + 1}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'Please try generating questions again for better content.',
        timeLimit: 300
      });
    }

    const titles = {
      'general': 'General Knowledge Assessment',
      'language-listening': 'Listening Comprehension',
      'speaking': 'Speaking Assessment',
      'reading': 'Reading Assessment',
      'writing': 'Writing Assessment',
      'mathematics': 'Mathematics Assessment'
    };

    return {
      id: Math.random().toString(36).substr(2, 9),
      title: titles[assessmentType as keyof typeof titles] || 'Assessment',
      timestamp: Date.now(),
      questions: questions.slice(0, questionCount)
    };
  } catch (error) {
    console.error('Assessment generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('API key')) {
        throw new Error('API configuration error. Please check your settings.');
      } else if (error.message.includes('provide some content')) {
        throw new Error('Please provide some learning content to generate questions from.');
      } else if (error.message.includes('No valid questions')) {
        throw new Error('Unable to generate valid questions. Please try again with different content.');
      }
      throw error;
    }
    
    throw new Error('An unexpected error occurred while generating the assessment. Please try again.');
  } finally {
    currentAbortController = null;
  }
}

// ============================================================================
// AI-POWERED ANSWER EVALUATION FUNCTIONS
// ============================================================================

/**
 * Evaluate a reading comprehension answer using AI semantic understanding
 * Instead of exact string matching, this uses OpenAI to understand if the
 * user's answer demonstrates comprehension of the passage.
 */
async function evaluateReadingAnswer(
  question: Question,
  userAnswer: string
): Promise<{
  isCorrect: boolean;
  score: number;
  feedback: string;
}> {
  try {
    if (!userAnswer?.trim()) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'No answer provided. Please provide your response to the question.'
      };
    }

    const systemPrompt = `You are an expert reading comprehension evaluator.
Your task is to evaluate whether a student's answer demonstrates understanding of a passage, even if the wording is different from the expected answer.
Focus on semantic meaning and comprehension, not exact wording.`;

    const evaluationPrompt = `Evaluate this reading comprehension answer:

PASSAGE:
${question.passage || 'Not provided'}

QUESTION:
${question.question}

EXPECTED ANSWER:
${question.correctAnswer}

STUDENT'S ANSWER:
${userAnswer}

Evaluate the student's answer based on:
1. Does it demonstrate understanding of the passage?
2. Is the meaning semantically equivalent to the expected answer?
3. Are key concepts correctly identified?
4. Is the answer relevant to the question asked?

Return evaluation in this exact JSON format:
{
  "isCorrect": true/false,
  "score": 0-100,
  "feedback": "Constructive feedback explaining why the answer is correct or incorrect, and what could be improved"
}

Be lenient with:
- Different wording that conveys the same meaning
- Paraphrased answers that show understanding
- Synonyms and alternative phrasings
- Minor grammatical differences

Be strict with:
- Answers that miss the key point
- Answers that contradict the passage
- Irrelevant responses
- Answers showing fundamental misunderstanding`;

    const result = await chatCompletionWithFallback({
      model: "gpt-4-turbo-preview",
      systemPrompt,
      userPrompt: evaluationPrompt,
      responseFormat: "json_object",
      temperature: 0.3
    });

    const responseContent = result.content;
    if (!responseContent) {
      throw new Error('No evaluation response received');
    }

    const evaluation = JSON.parse(responseContent);

    return {
      isCorrect: evaluation.isCorrect || false,
      score: Math.max(0, Math.min(100, evaluation.score || 0)),
      feedback: evaluation.feedback || 'Unable to generate feedback'
    };
  } catch (error) {
    console.error('Reading answer evaluation error:', error);
    // Fallback to basic evaluation if AI fails
    const normalizedUserAnswer = userAnswer.toLowerCase().trim();
    const normalizedCorrectAnswer = question.correctAnswer?.toLowerCase().trim() || '';
    const isExactMatch = normalizedUserAnswer === normalizedCorrectAnswer;
    const containsAnswer = normalizedCorrectAnswer.includes(normalizedUserAnswer) ||
                          normalizedUserAnswer.includes(normalizedCorrectAnswer);

    return {
      isCorrect: isExactMatch || containsAnswer,
      score: isExactMatch ? 100 : containsAnswer ? 70 : 0,
      feedback: isExactMatch
        ? 'Correct answer!'
        : containsAnswer
          ? 'Partially correct - your answer is on the right track but could be more complete.'
          : 'Your answer does not match the expected response. Please review the passage and try again.'
    };
  }
}

/**
 * Evaluate a writing answer using AI rubric-based assessment
 * Provides detailed feedback on multiple criteria defined in the question's rubric.
 */
async function evaluateWritingAnswer(
  question: Question,
  userAnswer: string
): Promise<{
  isCorrect: boolean;
  score: number;
  feedback: string;
  rubricScores?: Array<{ criteria: string; score: number; maxScore: number; feedback: string }>;
}> {
  try {
    if (!userAnswer?.trim()) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'No writing submitted. Please provide your response to the prompt.'
      };
    }

    const wordCount = userAnswer.trim().split(/\s+/).length;
    const wordLimit = question.wordLimit || 300;

    // Check if significantly under word limit (less than 50%)
    if (wordCount < wordLimit * 0.5) {
      return {
        isCorrect: false,
        score: 0,
        feedback: `Your response is too short (${wordCount} words). Please write at least ${Math.floor(wordLimit * 0.5)} words to adequately address the prompt.`
      };
    }

    const systemPrompt = `You are an expert writing evaluator with years of experience assessing student writing.
Evaluate the student's writing based on the provided rubric, giving fair and constructive feedback.
Focus on the quality of ideas, organization, and expression rather than minor surface errors.`;

    const rubricText = question.rubric?.map(r =>
      `- ${r.criteria} (max ${r.maxScore} points): ${r.description}`
    ).join('\n') || 'General writing quality';

    const evaluationPrompt = `Evaluate this student's writing:

WRITING PROMPT:
${question.prompt || question.question}

WRITING TYPE:
${question.writingType || 'essay'}

WORD LIMIT:
${wordLimit} words (student used ${wordCount} words)

EVALUATION RUBRIC:
${rubricText}

MODEL ANSWER (for reference):
${question.modelAnswer || 'Not provided'}

GRAMMAR RULES TO CONSIDER:
${question.grammarRules?.join(', ') || 'Standard grammar'}

STYLE GUIDE:
${question.styleGuide || 'Standard academic style'}

STUDENT'S WRITING:
${userAnswer}

Evaluate the writing based on the rubric criteria. Return evaluation in this exact JSON format:
{
  "overallScore": 0-100,
  "isAcceptable": true/false,
  "overallFeedback": "Summary of strengths and areas for improvement",
  "rubricScores": [
    {
      "criteria": "Criteria name",
      "score": score_earned,
      "maxScore": max_possible_score,
      "feedback": "Specific feedback for this criterion"
    }
  ]
}

Be constructive and encouraging while providing honest assessment.
Consider:
- Content quality and relevance
- Organization and structure
- Grammar and mechanics
- Style and voice
- Adherence to prompt requirements

Set isAcceptable to true if the writing demonstrates adequate understanding and effort (typically 60% or higher).`;

    const result = await chatCompletionWithFallback({
      model: "gpt-4-turbo-preview",
      systemPrompt,
      userPrompt: evaluationPrompt,
      responseFormat: "json_object",
      temperature: 0.3
    });

    const responseContent = result.content;
    if (!responseContent) {
      throw new Error('No evaluation response received');
    }

    const evaluation = JSON.parse(responseContent);

    return {
      isCorrect: evaluation.isAcceptable || false,
      score: Math.max(0, Math.min(100, evaluation.overallScore || 0)),
      feedback: evaluation.overallFeedback || 'Unable to generate feedback',
      rubricScores: evaluation.rubricScores || []
    };
  } catch (error) {
    console.error('Writing answer evaluation error:', error);
    // Fallback to basic evaluation if AI fails
    const wordCount = userAnswer.trim().split(/\s+/).length;
    const wordLimit = question.wordLimit || 300;
    const meetsWordCount = wordCount >= wordLimit * 0.5 && wordCount <= wordLimit * 1.5;

    return {
      isCorrect: meetsWordCount,
      score: meetsWordCount ? 70 : 40,
      feedback: meetsWordCount
        ? `Your writing has been submitted (${wordCount} words). A detailed evaluation could not be completed at this time, but your response meets the basic length requirements.`
        : `Your response ${wordCount < wordLimit * 0.5 ? 'is too short' : 'exceeds the word limit'}. Please aim for approximately ${wordLimit} words.`
    };
  }
}

/**
 * Main evaluation function that dispatches to appropriate evaluator based on question type
 */
export async function evaluateAnswer(
  question: Question,
  userAnswer: string
): Promise<{
  isCorrect: boolean;
  score: number;
  feedback: string;
  rubricScores?: Array<{ criteria: string; score: number; maxScore: number; feedback: string }>;
}> {
  try {
    // Route to appropriate evaluation function based on question type
    switch (question.type) {
      case 'reading':
      case 'speed-reading':
      case 'vocabulary':
        return await evaluateReadingAnswer(question, userAnswer);

      case 'writing':
        return await evaluateWritingAnswer(question, userAnswer);

      case 'multiple':
      case 'truefalse':
        // For multiple choice and true/false, use exact matching
        const normalizedUser = userAnswer.toLowerCase().trim();
        const normalizedCorrect = question.correctAnswer?.toLowerCase().trim() || '';
        const isCorrect = normalizedUser === normalizedCorrect;
        return {
          isCorrect,
          score: isCorrect ? 100 : 0,
          feedback: isCorrect
            ? 'Correct!'
            : `Incorrect. The correct answer is: ${question.correctAnswer}. ${question.explanation || ''}`
        };

      case 'fill':
        // For fill-in-the-blank, check correct answer and alternatives
        const userAnswerNorm = userAnswer.toLowerCase().trim();
        const correctAnswerNorm = question.correctAnswer?.toLowerCase().trim() || '';
        const alternativeAnswers = question.alternativeAnswers || [];
        const isMatch = userAnswerNorm === correctAnswerNorm ||
                       alternativeAnswers.some(alt => alt.toLowerCase().trim() === userAnswerNorm);
        return {
          isCorrect: isMatch,
          score: isMatch ? 100 : 0,
          feedback: isMatch
            ? 'Correct!'
            : `Not quite. The expected answer is: ${question.correctAnswer}. ${question.explanation || ''}`
        };

      default:
        // For other question types (drag, flip, match, etc.), return generic response
        // These are typically evaluated in the UI through user interaction
        return {
          isCorrect: true,
          score: 100,
          feedback: 'Answer recorded. Please continue to the next question.'
        };
    }
  } catch (error) {
    console.error('Answer evaluation error:', error);
    return {
      isCorrect: false,
      score: 0,
      feedback: 'Unable to evaluate your answer at this time. Please try again.'
    };
  }
}
