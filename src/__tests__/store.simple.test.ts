import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../store';

vi.mock('../lib/dataGateway', () => ({
  dataGateway: {
    legacy: {
      addFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      createUserProfile: vi.fn().mockResolvedValue(undefined),
      setUserData: vi.fn().mockResolvedValue(undefined),
      getUserProfile: vi.fn().mockResolvedValue(undefined),
      getUserData: vi.fn().mockResolvedValue(undefined),
    },
    lms: {},
  },
}));

describe('Store - Basic Functionality', () => {
  beforeEach(() => {
    useStore.setState({
      user: null,
      userData: {},
    });
  });

  describe('User Management', () => {
    it('initializes with null user', () => {
      const { user } = useStore.getState();
      expect(user).toBeNull();
    });

    it('sets user', () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        settings: {
          theme: 'light' as const,
          fontSize: 'medium' as const,
          speechEnabled: false,
          autoSave: true,
          notificationEnabled: true,
        },
      };

      useStore.getState().setUser(testUser);
      const { user } = useStore.getState();

      expect(user).toEqual(testUser);
      expect(user?.email).toBe('test@example.com');
    });
  });

  describe('Notes Management', () => {
    const userId = 'test-user-123';

    beforeEach(() => {
      useStore.setState({
        user: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          settings: {
            theme: 'light',
            fontSize: 'medium',
            speechEnabled: false,
            autoSave: true,
            notificationEnabled: true,
          },
        },
        userData: {},
      });
    });

    it('adds a note', () => {
      const mockNote = {
        id: 'note-123',
        subject: 'Mathematics',
        content: 'Test note content',
        tags: ['test'],
        timestamp: Date.now(),
        folderId: null,
      };

      useStore.getState().addNote(mockNote);
      const notes = useStore.getState().getNotes();

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('note-123');
      expect(notes[0].subject).toBe('Mathematics');
    });

    it('deletes a note', () => {
      const mockNote = {
        id: 'note-123',
        subject: 'Mathematics',
        content: 'Test note content',
        tags: [],
        timestamp: Date.now(),
        folderId: null,
      };

      useStore.getState().addNote(mockNote);
      expect(useStore.getState().getNotes()).toHaveLength(1);

      useStore.getState().deleteNote(mockNote.id);
      expect(useStore.getState().getNotes()).toHaveLength(0);
    });

    it('filters notes by subject', () => {
      const mathNote = {
        id: '1',
        subject: 'Mathematics',
        content: 'Math content',
        tags: [],
        timestamp: Date.now(),
        folderId: null,
      };

      const scienceNote = {
        id: '2',
        subject: 'Science',
        content: 'Science content',
        tags: [],
        timestamp: Date.now(),
        folderId: null,
      };

      useStore.getState().addNote(mathNote);
      useStore.getState().addNote(scienceNote);

      const allNotes = useStore.getState().getNotes();
      const mathNotes = allNotes.filter(n => n.subject === 'Mathematics');

      expect(allNotes).toHaveLength(2);
      expect(mathNotes).toHaveLength(1);
      expect(mathNotes[0].subject).toBe('Mathematics');
    });
  });

  describe('File Management', () => {
    const userId = 'test-user-123';

    beforeEach(() => {
      useStore.setState({
        user: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          settings: {
            theme: 'light',
            fontSize: 'medium',
            speechEnabled: false,
            autoSave: true,
            notificationEnabled: true,
          },
        },
        userData: {},
      });
    });

    it('adds a file', () => {
      const mockFile = {
        id: 'file-123',
        name: 'test.pdf',
        type: 'application/pdf',
        content: 'data:application/pdf;base64,test',
        size: 1024,
        extractedText: 'Sample text',
        timestamp: Date.now(),
      };

      useStore.getState().addFile(mockFile);
      const files = useStore.getState().getFiles();

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('test.pdf');
      expect(files[0].extractedText).toBe('Sample text');
    });

    it('removes a file', () => {
      const mockFile = {
        id: 'file-123',
        name: 'test.pdf',
        type: 'application/pdf',
        content: 'data:application/pdf;base64,test',
        size: 1024,
      };

      useStore.getState().addFile(mockFile);
      expect(useStore.getState().getFiles()).toHaveLength(1);

      return useStore.getState().removeFile(mockFile.id).then(() => {
        expect(useStore.getState().getFiles()).toHaveLength(0);
      });
    });
  });

  describe('Settings Management', () => {
    const userId = 'test-user-123';

    beforeEach(() => {
      useStore.setState({
        user: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          settings: {
            theme: 'light',
            fontSize: 'medium',
            speechEnabled: false,
            autoSave: true,
            notificationEnabled: true,
          },
        },
        userData: {},
      });
    });

    it('updates theme setting', () => {
      useStore.getState().updateSettings({ theme: 'dark' });
      const { user, userData } = useStore.getState();

      expect(userData[user!.id].settings.theme).toBe('dark');
    });

    it('updates font size', () => {
      useStore.getState().updateSettings({ fontSize: 'large' });
      const { user, userData } = useStore.getState();

      expect(userData[user!.id].settings.fontSize).toBe('large');
    });

    it('toggles auto-save', () => {
      useStore.getState().updateSettings({ autoSave: false });
      const { user, userData } = useStore.getState();

      expect(userData[user!.id].settings.autoSave).toBe(false);
    });
  });
});
