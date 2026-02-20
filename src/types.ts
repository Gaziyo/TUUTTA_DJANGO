// Removed unused import for Database type from incorrect path

export interface TTSOptions {
  model: 'tts-1' | 'tts-1-hd';
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed: number;
}

export interface SpeakingRecording {
  id: string;
  questionId: string;
  audioUrl: string;
  duration: number;
  timestamp: number;
  transcription?: string;
  score?: number;
}

export interface Question {
  id: string;
  type: 'multiple' | 'single' | 'fill' | 'drag' | 'flip' | 'speaking' | 'listening' | 'reading' | 'speed-reading' | 'vocabulary' | 'writing' | 'coding' | 'simulation' | 'step' | 'match' | 'graph' | 'truefalse'; // Added 'truefalse'
  question: string;
  correctAnswer?: string;
  alternativeAnswers?: string[];
  hint?: string;
  explanation?: string;
  options?: string[];
  items?: {
    id: string;
    content: string;
    category: string;
  }[];
  categories?: string[];
  frontContent?: string;
  backContent?: string;
  audioPrompt?: string;
  expectedDuration?: number;
  rubric?: {
    criteria: string;
    maxScore: number;
  }[];
  recordings?: SpeakingRecording[];
  // Math specific fields
  mathExpression?: string;
  steps?: {
    instruction: string;
    solution: string;
  }[];
  finalAnswer?: string;
  pairs?: {
    equation: string;
    solution: string;
  }[];
  graphData?: {
    type: string;
    equation: string;
    range: [number, number];
  };
  // Reading assessment specific fields
  passage?: string;
  timeLimit?: number;
  wordCount?: number;
  vocabularyItems?: {
    word: string;
    definition: string;
    context?: string;
  }[];
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  culturalNotes?: string;
  // Writing assessment specific fields
  prompt?: string;
  wordLimit?: number;
  modelAnswer?: string;
  grammarRules?: string[];
  styleGuide?: string;
  writingType?: 'essay' | 'creative' | 'argumentative' | 'descriptive' | 'narrative' | 'technical';
  feedbackPoints?: {
    type: 'grammar' | 'style' | 'content' | 'structure';
    text: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  // Adaptive assessment fields
  adaptedFor?: string;
  // Code execution fields
  codeLanguage?: string;
  initialCode?: string;
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];
  // Simulation fields
  simulationType?: string;
  simulationConfig?: any;
  transcript?: string; // Add optional transcript field for listening questions
  source?: { // Add optional source field for tracking origin (e.g., URL)
    url: string;
    // chunkIndex?: number; // Optional: if tracking specific chunks
  };
}

export interface Assessment {
  id: string;
  title: string;
  timestamp: number;
  questions: Question[];
  score?: number;
  percentage?: number;
  completed?: boolean;
  completedAt?: number;
  userAnswers?: Record<string, string>;
  totalQuestions?: number;
}

export interface AssessmentType {
  id: string;
  name: string;
  description: string;
  questionTypes: Question['type'][];
  defaultQuestionCount: number;
  minQuestions: number;
  maxQuestions: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  timestamp: number;
}

export interface Note {
  id: string;
  content: string;
  subject: string;
  timestamp: number;
  folderId: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

export interface FileUpload {
  id: string;
  name: string;
  type: string;
  content: string;
  size?: number;
  extractedText?: string;
  timestamp?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  settings?: AppSettings;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  speechEnabled: boolean;
  autoSave: boolean;
  notificationEnabled: boolean;
  voice?: TTSOptions['voice'];
  speechSpeed?: number;
  tourCompleted?: boolean; // Added flag for tour completion status
  mfaEnabled?: boolean;
  mfaMethod?: 'totp' | 'sms';
  mfaRecoveryCodes?: string[];
}

export interface AppState {
  assessments: Assessment[];
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

export interface WritingSubmission {
  id: string;
  questionId: string;
  content: string;
  timestamp: number;
  feedback?: {
    points: {
      type: 'grammar' | 'style' | 'content' | 'structure';
      text: string;
      suggestion: string;
      severity: 'low' | 'medium' | 'high';
    }[];
    overallScore?: number;
    overallFeedback?: string;
  };
  peerReviews?: {
    reviewerId: string;
    timestamp: number;
    feedback: string;
    rating: number;
  }[];
}

// Gamification types
export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'learning' | 'assessment' | 'engagement' | 'mastery';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  xp: number;
  dateUnlocked?: number;
}

export interface UserLevel {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
}

export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: number;
  history: {
    date: number;
    isActive: boolean;
  }[];
}
