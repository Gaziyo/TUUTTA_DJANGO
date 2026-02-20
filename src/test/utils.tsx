import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { useStore } from '../store';
import type { User, AppSettings } from '../types';

// Mock user data for testing
export const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  settings: {
    theme: 'light',
    language: 'en',
    fontSize: 16,
    notifications: true,
  },
};

export const mockDarkModeUser: User = {
  ...mockUser,
  settings: {
    ...mockUser.settings,
    theme: 'dark',
  },
};

// Mock achievement data
export const mockAchievement = {
  id: 'test-achievement',
  name: 'Test Achievement',
  description: 'Test achievement description',
  icon: '🏆',
  xp: 50,
  unlocked: false,
  progress: 0,
  maxProgress: 1,
  dateUnlocked: null,
};

// Mock note data
export const mockNote = {
  id: 'note-123',
  title: 'Test Note',
  content: 'Test note content',
  subject: 'Mathematics',
  timestamp: Date.now(),
  tags: ['test', 'math'],
  folderId: null,
};

// Mock chat session data
export const mockChatSession = {
  id: 'chat-123',
  title: 'Test Chat',
  messages: [
    {
      role: 'user' as const,
      content: 'Hello',
      timestamp: Date.now(),
    },
    {
      role: 'assistant' as const,
      content: 'Hi there!',
      timestamp: Date.now() + 1000,
    },
  ],
  timestamp: Date.now(),
};

// Mock file upload data
export const mockFile = {
  id: 'file-123',
  name: 'test.pdf',
  type: 'application/pdf',
  content: 'data:application/pdf;base64,test',
  size: 1024,
  extractedText: 'Sample extracted text',
  timestamp: Date.now(),
};

// Setup store with test data
export function setupStore(overrides?: Partial<ReturnType<typeof useStore.getState>>) {
  const state = useStore.getState();

  useStore.setState({
    ...state,
    user: mockUser,
    ...overrides,
  });
}

// Reset store to initial state
export function resetStore() {
  useStore.setState({
    user: null,
    userData: {},
  });
}

// Custom render function with store setup
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User | null;
  initialStore?: Partial<ReturnType<typeof useStore.getState>>;
}

export function renderWithStore(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { user = mockUser, initialStore, ...renderOptions } = options || {};

  // Setup store before rendering
  if (user) {
    setupStore({ user, ...initialStore });
  } else {
    setupStore({ user: null, ...initialStore });
  }

  return {
    ...render(ui, renderOptions),
    store: useStore,
  };
}

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock localStorage
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Replace global localStorage with mock
export function setupLocalStorageMock() {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

// Create mock file for upload testing
export function createMockFile(
  name: string = 'test.txt',
  size: number = 1024,
  type: string = 'text/plain'
): File {
  const blob = new Blob(['test content'], { type });
  const file = new File([blob], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

// Mock FileReader
export function mockFileReader(result: string) {
  const originalFileReader = global.FileReader;

  global.FileReader = class MockFileReader {
    onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    result: string | ArrayBuffer | null = null;

    readAsDataURL() {
      this.result = result;
      if (this.onload) {
        this.onload({ target: this } as any);
      }
    }

    readAsArrayBuffer() {
      this.result = new ArrayBuffer(8);
      if (this.onload) {
        this.onload({ target: this } as any);
      }
    }

    readAsText() {
      this.result = result;
      if (this.onload) {
        this.onload({ target: this } as any);
      }
    }
  } as any;

  return () => {
    global.FileReader = originalFileReader;
  };
}

// Test IDs for easier element selection
export const testIds = {
  // Auth
  authModal: 'auth-modal',
  loginForm: 'login-form',
  registerForm: 'register-form',

  // Chat
  chatInterface: 'chat-interface',
  chatInput: 'chat-input',
  chatSubmit: 'chat-submit',
  chatMessages: 'chat-messages',

  // Notes
  notePanel: 'note-panel',
  noteEditor: 'note-editor',
  noteList: 'note-list',

  // Files
  fileUpload: 'file-upload',
  fileList: 'file-list',
  filePreview: 'file-preview',

  // Assessment
  assessmentPanel: 'assessment-panel',
  assessmentQuestion: 'assessment-question',
  assessmentSubmit: 'assessment-submit',

  // Gamification
  achievementsList: 'achievements-list',
  levelProgress: 'level-progress',
  streakTracker: 'streak-tracker',

  // Settings
  settingsModal: 'settings-modal',
  themeToggle: 'theme-toggle',
};
