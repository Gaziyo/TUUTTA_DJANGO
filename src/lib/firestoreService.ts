/**
 * Firestore Service — DEPRECATED
 *
 * All methods are stubs. Firebase/Firestore removed.
 * Local state is persisted via Zustand + localStorage (store.ts).
 * Production data lives in Django REST API.
 */

import type {
  Note,
  ChatSession,
  FileUpload,
  AppSettings,
  Folder,
  Achievement,
  UserLevel,
  LearningStreak,
} from '../types';

export interface UserData {
  notes: Note[];
  chatSessions: ChatSession[];
  subjects: string[];
  folders: Folder[];
  settings: AppSettings;
  achievements: Achievement[];
  xp: number;
  level: UserLevel;
  streak: LearningStreak;
  files: FileUpload[];
  assessments?: unknown[];
}

export const createUserProfile = async (
  _userId: string,
  _email: string,
  _name: string,
  _settings: AppSettings
): Promise<void> => {};

export const getUserProfile = async (_userId: string): Promise<null> => null;

export const updateUserProfile = async (
  _userId: string,
  _data: Record<string, unknown>
): Promise<void> => {};

export const getUserData = async (_userId: string): Promise<null> => null;

export const setUserData = async (
  _userId: string,
  _data: Partial<UserData>
): Promise<void> => {};

export const updateUserData = async (
  _userId: string,
  _data: Partial<UserData>
): Promise<void> => {};

export const addNote = async (_userId: string, _note: Note): Promise<void> => {};
export const updateNote = async (_userId: string, _note: Note): Promise<void> => {};
export const deleteNote = async (_userId: string, _noteId: string): Promise<void> => {};

export const addChatSession = async (
  _userId: string,
  _session: ChatSession
): Promise<void> => {};
export const updateChatSession = async (
  _userId: string,
  _session: ChatSession
): Promise<void> => {};
export const deleteChatSession = async (
  _userId: string,
  _chatId: string
): Promise<void> => {};

export const addFile = async (_userId: string, _file: FileUpload): Promise<void> => {};
export const deleteFile = async (_userId: string, _fileId: string): Promise<void> => {};

export const addFolder = async (_userId: string, _folder: Folder): Promise<void> => {};
export const updateFolder = async (
  _userId: string,
  _folderId: string,
  _name: string
): Promise<void> => {};
export const deleteFolder = async (
  _userId: string,
  _folderId: string
): Promise<void> => {};

export const addSubject = async (_userId: string, _subject: string): Promise<void> => {};
export const updateSubject = async (
  _userId: string,
  _oldSubject: string,
  _newSubject: string
): Promise<void> => {};
export const deleteSubject = async (_userId: string, _subject: string): Promise<void> => {};

export const updateSettings = async (
  _userId: string,
  _settings: Partial<AppSettings>
): Promise<void> => {};

export const saveAssessment = async (
  _userId: string,
  _assessment: unknown
): Promise<void> => {};
export const getAssessments = async (_userId: string): Promise<[]> => [];
export const deleteAssessment = async (
  _userId: string,
  _assessmentId: string
): Promise<void> => {};

export const updateAchievements = async (
  _userId: string,
  _achievements: Achievement[]
): Promise<void> => {};
export const updateXP = async (_userId: string, _xp: number): Promise<void> => {};
export const updateLevel = async (
  _userId: string,
  _level: UserLevel
): Promise<void> => {};
export const updateStreak = async (
  _userId: string,
  _streak: LearningStreak
): Promise<void> => {};
