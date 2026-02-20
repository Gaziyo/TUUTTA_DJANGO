import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreService from '../firestoreService';

// Mock Firestore
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  googleProvider: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-doc-id' })),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
  },
  writeBatch: vi.fn(),
}));

describe('Firestore Service', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Data Operations', () => {
    it('getUserData returns user data', async () => {
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          notes: [],
          chatSessions: [],
          subjects: ['Math'],
          folders: [],
          settings: { theme: 'light', language: 'en', fontSize: 16, notifications: true },
          achievements: [],
          xp: 100,
          level: { current: 2, name: 'Learner', minXP: 50, maxXP: 150 },
          streak: { current: 3, longest: 5, lastActiveDate: Date.now() },
          files: [],
        }),
      } as any);

      const userData = await firestoreService.getUserData(mockUserId);

      expect(userData).toBeTruthy();
      expect(getDoc).toHaveBeenCalled();
    });

    it('setUserData updates user data', async () => {
      const { setDoc } = await import('firebase/firestore');

      const testData = {
        notes: [],
        chatSessions: [],
        subjects: ['Math'],
      };

      await firestoreService.setUserData(mockUserId, testData as any);

      expect(setDoc).toHaveBeenCalled();
    });

    it('updateUserData updates specific fields', async () => {
      const { updateDoc } = await import('firebase/firestore');

      const updates = {
        xp: 200,
      };

      await firestoreService.updateUserData(mockUserId, updates as any);

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('Notes Operations', () => {
    it('addNote adds a new note', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          notes: [],
        }),
      } as any);

      const newNote = {
        id: 'note-123',
        title: 'Test Note',
        content: 'Test content',
        subject: 'Math',
        timestamp: Date.now(),
        tags: ['test'],
        folderId: null,
      };

      await firestoreService.addNote(mockUserId, newNote);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('updateNote updates existing note', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');

      const existingNote = {
        id: 'note-123',
        title: 'Original',
        content: 'Original content',
        subject: 'Math',
        timestamp: Date.now(),
        tags: [],
        folderId: null,
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          notes: [existingNote],
        }),
      } as any);

      const updatedNote = {
        ...existingNote,
        title: 'Updated',
      };

      await firestoreService.updateNote(mockUserId, updatedNote);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('deleteNote removes a note', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          notes: [
            { id: 'note-1', title: 'Note 1' },
            { id: 'note-2', title: 'Note 2' },
          ],
        }),
      } as any);

      await firestoreService.deleteNote(mockUserId, 'note-1');

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('Assessment Operations', () => {
    it('saveAssessment saves assessment result', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          assessments: [],
        }),
      } as any);

      const assessment = {
        id: 'assessment-123',
        title: 'Math Quiz',
        score: 8,
        percentage: 80,
        totalQuestions: 10,
        completed: true,
        completedAt: Date.now(),
        questions: [],
        userAnswers: {},
      };

      await firestoreService.saveAssessment(mockUserId, assessment);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('getAssessments retrieves all assessments', async () => {
      const { getDoc } = await import('firebase/firestore');

      const mockAssessments = [
        {
          id: 'assessment-1',
          title: 'Math Quiz 1',
          score: 8,
          percentage: 80,
        },
        {
          id: 'assessment-2',
          title: 'Math Quiz 2',
          score: 9,
          percentage: 90,
        },
      ];

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          assessments: mockAssessments,
        }),
      } as any);

      const assessments = await firestoreService.getAssessments(mockUserId);

      expect(assessments).toEqual(mockAssessments);
    });

    it('deleteAssessment removes an assessment', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          assessments: [
            { id: 'assessment-1' },
            { id: 'assessment-2' },
          ],
        }),
      } as any);

      await firestoreService.deleteAssessment(mockUserId, 'assessment-1');

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('File Operations', () => {
    it('addFile adds a new file', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          files: [],
        }),
      } as any);

      const newFile = {
        id: 'file-123',
        name: 'test.pdf',
        type: 'application/pdf',
        content: 'base64content',
        size: 1024,
        extractedText: 'Extracted text',
      };

      await firestoreService.addFile(mockUserId, newFile);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('deleteFile removes a file', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          files: [
            { id: 'file-1' },
            { id: 'file-2' },
          ],
        }),
      } as any);

      await firestoreService.deleteFile(mockUserId, 'file-1');

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('Gamification Operations', () => {
    it('updateXP updates user XP', async () => {
      const { updateDoc } = await import('firebase/firestore');

      await firestoreService.updateXP(mockUserId, 150);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('updateLevel updates user level', async () => {
      const { updateDoc } = await import('firebase/firestore');

      const newLevel = {
        current: 3,
        name: 'Scholar',
        minXP: 150,
        maxXP: 300,
      };

      await firestoreService.updateLevel(mockUserId, newLevel);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('updateStreak updates learning streak', async () => {
      const { updateDoc } = await import('firebase/firestore');

      const streak = {
        current: 5,
        longest: 10,
        lastActiveDate: Date.now(),
      };

      await firestoreService.updateStreak(mockUserId, streak);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('updateAchievements updates achievements list', async () => {
      const { updateDoc } = await import('firebase/firestore');

      const achievements = [
        {
          id: 'achievement-1',
          name: 'First Note',
          description: 'Create your first note',
          icon: '📝',
          xp: 10,
          unlocked: true,
          progress: 1,
          maxProgress: 1,
          dateUnlocked: Date.now(),
        },
      ];

      await firestoreService.updateAchievements(mockUserId, achievements);

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('Settings Operations', () => {
    it('updateSettings updates user settings', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          settings: {
            theme: 'light',
            language: 'en',
            fontSize: 16,
            notifications: true,
          },
        }),
      } as any);

      await firestoreService.updateSettings(mockUserId, { theme: 'dark' });

      expect(updateDoc).toHaveBeenCalled();
    });
  });
});
