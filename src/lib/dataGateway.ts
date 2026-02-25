// ============================================================================
// DATA GATEWAY
// Legacy bridge layer — Firebase/Firestore removed.
// All methods are no-ops; local state is persisted via Zustand + localStorage.
// File/note/chat data will be moved to Django endpoints in a future phase.
// ============================================================================

import type { FileUpload, AppSettings } from '../types';

interface UserDataPartial {
  notes?: unknown[];
  chatSessions?: unknown[];
  subjects?: string[];
  folders?: unknown[];
  settings?: AppSettings;
  achievements?: unknown[];
  xp?: number;
  level?: unknown;
  streak?: unknown;
  files?: FileUpload[];
  assessments?: unknown[];
}

const legacyStub = {
  createUserProfile: async (
    _userId: string,
    _email: string,
    _name: string,
    _settings: AppSettings
  ): Promise<void> => {},

  getUserProfile: async (_userId: string): Promise<null> => null,

  updateUserProfile: async (_userId: string, _data: Record<string, unknown>): Promise<void> => {},

  getUserData: async (_userId: string): Promise<null> => null,

  setUserData: async (_userId: string, _data: UserDataPartial): Promise<void> => {},

  updateUserData: async (_userId: string, _data: UserDataPartial): Promise<void> => {},

  addFile: async (_userId: string, _file: FileUpload): Promise<void> => {},

  deleteFile: async (_userId: string, _fileId: string): Promise<void> => {},

  addNote: async (_userId: string, _note: unknown): Promise<void> => {},

  updateNote: async (_userId: string, _note: unknown): Promise<void> => {},

  deleteNote: async (_userId: string, _noteId: string): Promise<void> => {},

  addChatSession: async (_userId: string, _session: unknown): Promise<void> => {},

  updateChatSession: async (_userId: string, _session: unknown): Promise<void> => {},

  deleteChatSession: async (_userId: string, _chatId: string): Promise<void> => {},

  addFolder: async (_userId: string, _folder: unknown): Promise<void> => {},

  updateFolder: async (_userId: string, _folderId: string, _name: string): Promise<void> => {},

  deleteFolder: async (_userId: string, _folderId: string): Promise<void> => {},

  addSubject: async (_userId: string, _subject: string): Promise<void> => {},

  updateSubject: async (
    _userId: string,
    _oldSubject: string,
    _newSubject: string
  ): Promise<void> => {},

  deleteSubject: async (_userId: string, _subject: string): Promise<void> => {},

  updateSettings: async (
    _userId: string,
    _settings: Partial<AppSettings>
  ): Promise<void> => {},

  saveAssessment: async (_userId: string, _assessment: unknown): Promise<void> => {},

  getAssessments: async (_userId: string): Promise<[]> => [],

  deleteAssessment: async (_userId: string, _assessmentId: string): Promise<void> => {},

  updateAchievements: async (_userId: string, _achievements: unknown[]): Promise<void> => {},

  updateXP: async (_userId: string, _xp: number): Promise<void> => {},

  updateLevel: async (_userId: string, _level: unknown): Promise<void> => {},

  updateStreak: async (_userId: string, _streak: unknown): Promise<void> => {},
};

export const dataGateway = {
  legacy: legacyStub,
};
