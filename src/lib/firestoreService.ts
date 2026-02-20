import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Note,
  ChatSession,
  FileUpload,
  AppSettings,
  Folder,
  Achievement,
  UserLevel,
  LearningStreak
} from '../types';

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  NOTES: 'notes',
  CHAT_SESSIONS: 'chatSessions',
  FILES: 'files',
  FOLDERS: 'folders',
  ACHIEVEMENTS: 'achievements',
  USER_DATA: 'userData'
};

// User Data Interface
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
  assessments?: any[]; // Assessment results with scores and history
}

// Helper function to convert Firestore timestamp to number
const timestampToNumber = (timestamp: any): number => {
  if (timestamp?.toMillis) {
    return timestamp.toMillis();
  }
  return timestamp || Date.now();
};

// ========== User Profile Operations ==========

export const createUserProfile = async (
  userId: string,
  email: string,
  name: string,
  settings: AppSettings
) => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const now = Timestamp.now();
  await setDoc(userRef, {
    // Canonical user fields used by RouteGuard/useAuth
    uid: userId,
    displayName: name,
    photoUrl: null,
    orgId: 'personal',
    role: 'learner',
    departmentId: null,
    teamId: null,
    managerId: null,
    isActive: true,
    xp: 0,
    level: 1,
    lastLoginAt: now,
    // Legacy compatibility fields still read by old store paths
    id: userId,
    email,
    name,
    settings,
    createdAt: now,
    updatedAt: now
  });
};

export const getUserProfile = async (userId: string) => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
};

export const updateUserProfile = async (userId: string, data: Partial<any>) => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
};

// ========== User Data Operations (Subcollection) ==========

export const getUserData = async (userId: string): Promise<Partial<UserData> | null> => {
  const userDataRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_DATA, 'data');
  const userDataSnap = await getDoc(userDataRef);

  if (userDataSnap.exists()) {
    const data = userDataSnap.data();
    // Convert timestamps
    if (data.chatSessions) {
      data.chatSessions = data.chatSessions.map((session: any) => ({
        ...session,
        timestamp: timestampToNumber(session.timestamp)
      }));
    }
    if (data.notes) {
      data.notes = data.notes.map((note: any) => ({
        ...note,
        timestamp: timestampToNumber(note.timestamp)
      }));
    }
    if (data.folders) {
      data.folders = data.folders.map((folder: any) => ({
        ...folder,
        timestamp: timestampToNumber(folder.timestamp)
      }));
    }
    if (data.files) {
      data.files = data.files.map((file: any) => ({
        ...file,
        timestamp: timestampToNumber(file.timestamp)
      }));
    }
    return data as Partial<UserData>;
  }
  return null;
};

export const setUserData = async (userId: string, data: Partial<UserData>) => {
  const userDataRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_DATA, 'data');
  await setDoc(userDataRef, data, { merge: true });
};

export const updateUserData = async (userId: string, data: Partial<UserData>) => {
  const userDataRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_DATA, 'data');
  await updateDoc(userDataRef, data);
};

// ========== Notes Operations ==========

export const addNote = async (userId: string, note: Note) => {
  const userData = await getUserData(userId) || {};
  const notes = userData.notes || [];
  notes.push(note);
  await updateUserData(userId, { notes });
};

export const updateNote = async (userId: string, updatedNote: Note) => {
  const userData = await getUserData(userId) || {};
  const notes = (userData.notes || []).map(note =>
    note.id === updatedNote.id ? updatedNote : note
  );
  await updateUserData(userId, { notes });
};

export const deleteNote = async (userId: string, noteId: string) => {
  const userData = await getUserData(userId) || {};
  const notes = (userData.notes || []).filter(note => note.id !== noteId);
  await updateUserData(userId, { notes });
};

// ========== Chat Sessions Operations ==========

export const addChatSession = async (userId: string, chatSession: ChatSession) => {
  const userData = await getUserData(userId) || {};
  const chatSessions = userData.chatSessions || [];
  chatSessions.unshift(chatSession);
  await updateUserData(userId, { chatSessions });
};

export const updateChatSession = async (userId: string, updatedSession: ChatSession) => {
  const userData = await getUserData(userId) || {};
  const chatSessions = (userData.chatSessions || []).map(session =>
    session.id === updatedSession.id ? updatedSession : session
  );
  await updateUserData(userId, { chatSessions });
};

export const deleteChatSession = async (userId: string, chatId: string) => {
  const userData = await getUserData(userId) || {};
  const chatSessions = (userData.chatSessions || []).filter(session => session.id !== chatId);
  await updateUserData(userId, { chatSessions });
};

// ========== Files Operations ==========

export const addFile = async (userId: string, file: FileUpload) => {
  const userData = await getUserData(userId) || {};
  const files = userData.files || [];
  files.push(file);
  await updateUserData(userId, { files });
};

export const deleteFile = async (userId: string, fileId: string) => {
  const userData = await getUserData(userId) || {};
  const files = (userData.files || []).filter(file => file.id !== fileId);
  await updateUserData(userId, { files });
};

// ========== Folders Operations ==========

export const addFolder = async (userId: string, folder: Folder) => {
  const userData = await getUserData(userId) || {};
  const folders = userData.folders || [];
  folders.push(folder);
  await updateUserData(userId, { folders });
};

export const updateFolder = async (userId: string, folderId: string, name: string) => {
  const userData = await getUserData(userId) || {};
  const folders = (userData.folders || []).map(folder =>
    folder.id === folderId ? { ...folder, name } : folder
  );
  await updateUserData(userId, { folders });
};

export const deleteFolder = async (userId: string, folderId: string) => {
  const userData = await getUserData(userId) || {};
  const folders = (userData.folders || []).filter(folder => folder.id !== folderId);
  const notes = (userData.notes || []).map(note =>
    note.folderId === folderId ? { ...note, folderId: null } : note
  );
  await updateUserData(userId, { folders, notes });
};

// ========== Subjects Operations ==========

export const addSubject = async (userId: string, subject: string) => {
  const userData = await getUserData(userId) || {};
  const subjects = userData.subjects || [];
  if (!subjects.includes(subject)) {
    subjects.push(subject);
    await updateUserData(userId, { subjects });
  }
};

export const updateSubject = async (userId: string, oldSubject: string, newSubject: string) => {
  const userData = await getUserData(userId) || {};
  const subjects = (userData.subjects || []).map(s => s === oldSubject ? newSubject : s);
  const notes = (userData.notes || []).map(note =>
    note.subject === oldSubject ? { ...note, subject: newSubject } : note
  );
  await updateUserData(userId, { subjects, notes });
};

export const deleteSubject = async (userId: string, subject: string) => {
  const userData = await getUserData(userId) || {};
  const subjects = (userData.subjects || []).filter(s => s !== subject);
  const newSubject = subjects[0];
  const notes = (userData.notes || []).map(note =>
    note.subject === subject ? { ...note, subject: newSubject } : note
  );
  await updateUserData(userId, { subjects, notes });
};

// ========== Settings Operations ==========

export const updateSettings = async (userId: string, settings: Partial<AppSettings>) => {
  const userData = await getUserData(userId) || {};
  const updatedSettings = { ...userData.settings, ...settings };
  await updateUserData(userId, { settings: updatedSettings });
};

// ========== Assessment Operations ==========

export const saveAssessment = async (userId: string, assessment: any) => {
  const userDataRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.USER_DATA, 'data');
  const userData = await getUserData(userId) || {};
  const assessments = userData.assessments || [];

  // Add or update assessment
  const existingIndex = assessments.findIndex((a: any) => a.id === assessment.id);
  let updatedAssessments;

  if (existingIndex >= 0) {
    updatedAssessments = [...assessments];
    updatedAssessments[existingIndex] = assessment;
  } else {
    updatedAssessments = [...assessments, assessment];
  }

  await updateDoc(userDataRef, { assessments: updatedAssessments });
};

export const getAssessments = async (userId: string) => {
  const userData = await getUserData(userId) || {};
  return userData.assessments || [];
};

export const deleteAssessment = async (userId: string, assessmentId: string) => {
  const userData = await getUserData(userId) || {};
  const assessments = (userData.assessments || []).filter((a: any) => a.id !== assessmentId);
  await updateUserData(userId, { assessments });
};

// ========== Achievements & Gamification ==========

export const updateAchievements = async (userId: string, achievements: Achievement[]) => {
  await updateUserData(userId, { achievements });
};

export const updateXP = async (userId: string, xp: number) => {
  await updateUserData(userId, { xp });
};

export const updateLevel = async (userId: string, level: UserLevel) => {
  await updateUserData(userId, { level });
};

export const updateStreak = async (userId: string, streak: LearningStreak) => {
  await updateUserData(userId, { streak });
};
