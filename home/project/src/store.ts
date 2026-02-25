import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Note, ChatMessage, FileUpload, User, AppSettings, ChatSession, Folder, Achievement, UserLevel, LearningStreak } from './types';
import { supabase } from './lib/supabase';

// Add registered users to the store
interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  password: string; // In a real app, this would be hashed
}

interface UserData {
  notes: Note[];
  chatSessions: ChatSession[];
  subjects: string[];
  folders: Folder[];
  settings: AppSettings;
  achievements: Achievement[];
  xp: number;
  level: UserLevel;
  streak: LearningStreak;
  files: FileUpload[]; // Store files per user
}

interface AppState {
  userData: Record<string, UserData>;
  registeredUsers: RegisteredUser[];
  isRecording: boolean;
  user: User | null;
  currentChatId: string | null;
  registerUser: (email: string, password: string) => Promise<void>;
  loginUser: (email: string, password: string) => Promise<void>;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  addSubject: (subject: string) => void;
  updateSubject: (oldSubject: string, newSubject: string) => void;
  deleteSubject: (subject: string) => void;
  addFile: (file: FileUpload) => void;
  removeFile: (fileId: string) => void;
  getFiles: () => FileUpload[];
  setIsRecording: (isRecording: boolean) => void;
  setUser: (user: User | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getNotes: () => Note[];
  getSubjects: () => string[];
  getSettings: () => AppSettings;
  createNewChat: () => string;
  switchChat: (chatId: string) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  getChatSessions: () => ChatSession[];
  getCurrentChat: () => ChatSession | null;
  deleteChat: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  addFolder: (name: string, parentId: string | null) => void;
  updateFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  getFolders: () => Folder[];
  getAchievements: () => Achievement[];
  unlockAchievement: (id: string) => void;
  updateAchievementProgress: (id: string, progress: number) => void;
  getUserXP: () => number;
  addXP: (amount: number) => void;
  getUserLevel: () => UserLevel;
  getLearningStreak: () => LearningStreak;
  updateStreak: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  fontSize: 'medium',
  speechEnabled: true,
  autoSave: true,
  notificationEnabled: true,
};

const DEFAULT_LEVELS: UserLevel[] = [
  { level: 1, title: 'Novice Learner', minXP: 0, maxXP: 100 },
  { level: 2, title: 'Curious Mind', minXP: 100, maxXP: 250 },
  { level: 3, title: 'Knowledge Seeker', minXP: 250, maxXP: 500 },
  { level: 4, title: 'Dedicated Scholar', minXP: 500, maxXP: 1000 },
  { level: 5, title: 'Academic Explorer', minXP: 1000, maxXP: 2000 },
  { level: 6, title: 'Wisdom Collector', minXP: 2000, maxXP: 3500 },
  { level: 7, title: 'Master Learner', minXP: 3500, maxXP: 5000 },
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-chat',
    title: 'First Conversation',
    description: 'Complete your first chat with the AI tutor',
    category: 'engagement',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    xp: 10
  },
  {
    id: 'note-taker',
    title: 'Note Taker',
    description: 'Create 5 study notes',
    category: 'learning',
    progress: 0,
    maxProgress: 5,
    unlocked: false,
    xp: 25
  },
  {
    id: 'assessment-ace',
    title: 'Assessment Ace',
    description: 'Score 90% or higher on 3 assessments',
    category: 'assessment',
    progress: 0,
    maxProgress: 3,
    unlocked: false,
    xp: 50
  },
  {
    id: 'file-explorer',
    title: 'File Explorer',
    description: 'Upload 3 different file types for analysis',
    category: 'engagement',
    progress: 0,
    maxProgress: 3,
    unlocked: false,
    xp: 15
  },
  {
    id: 'streak-starter',
    title: 'Streak Starter',
    description: 'Maintain a 3-day learning streak',
    category: 'engagement',
    progress: 0,
    maxProgress: 3,
    unlocked: false,
    xp: 20
  },
  {
    id: 'vocabulary-builder',
    title: 'Vocabulary Builder',
    description: 'Learn 25 new vocabulary words',
    category: 'mastery',
    progress: 0,
    maxProgress: 25,
    unlocked: false,
    xp: 30
  },
  {
    id: 'speaking-pro',
    title: 'Speaking Pro',
    description: 'Complete 5 speaking practice exercises',
    category: 'mastery',
    progress: 0,
    maxProgress: 5,
    unlocked: false,
    xp: 40
  },
  {
    id: 'perfect-score',
    title: 'Perfect Score',
    description: 'Achieve 100% on any assessment',
    category: 'assessment',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    xp: 75
  }
];

const DEFAULT_STREAK: LearningStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: 0,
  history: []
};

const DEFAULT_USER_DATA: UserData = {
  notes: [],
  chatSessions: [],
  subjects: [],
  folders: [],
  settings: DEFAULT_SETTINGS,
  achievements: DEFAULT_ACHIEVEMENTS,
  xp: 0,
  level: DEFAULT_LEVELS[0],
  streak: DEFAULT_STREAK,
  files: [] // Initialize empty files array
};

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useStore = create<AppState>()(
  (set, get) => ({
    userData: {},
    registeredUsers: [],
    isRecording: false,
    user: null,
    currentChatId: null,

    // Authentication functions
    registerUser: async (email: string, password: string) => {
      try {
        // First, sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Registration failed');

        // Then create the user profile
        const { data: userData, error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: authData.user.email,
            name: email.split('@')[0],
            settings: DEFAULT_SETTINGS
          }])
          .select()
          .single();

        if (profileError) throw profileError;
        if (!userData) throw new Error('Failed to create user profile');

        set({
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            settings: userData.settings
          }
        });
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },

    loginUser: async (email: string, password: string) => {
      try {
        // First, sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Login failed');

        // Then fetch the user profile
        const { data: userData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!userData) throw new Error('User profile not found');

        set({
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            settings: userData.settings
          }
        });
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    // Rest of the store implementation remains the same...
    setIsRecording: (isRecording) => set({ isRecording }),
    setUser: (user) => set({ user, currentChatId: null }),
    clearMessages: () => set({ currentChatId: null }),
    
    // File management functions
    addFile: (file) => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            files: [...userData.files, file]
          }
        }
      };
    }),

    removeFile: (fileId) => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            files: userData.files.filter(file => file.id !== fileId)
          }
        }
      };
    }),

    getFiles: () => {
      const { user, userData } = get();
      return user ? userData[user.id]?.files || [] : [];
    },

    // Achievement and XP functions
    getAchievements: () => {
      const { user, userData } = get();
      return user ? userData[user.id]?.achievements || [] : [];
    },

    unlockAchievement: (id) => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      const achievements = userData.achievements.map(achievement => 
        achievement.id === id ? {
          ...achievement,
          unlocked: true,
          progress: achievement.maxProgress,
          dateUnlocked: Date.now()
        } : achievement
      );
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            achievements,
            xp: userData.xp + (achievements.find(a => a.id === id)?.xp || 0)
          }
        }
      };
    }),

    updateAchievementProgress: (id, progress) => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      const achievements = userData.achievements.map(achievement => {
        if (achievement.id === id && !achievement.unlocked) {
          const newProgress = Math.min(achievement.maxProgress, progress);
          if (newProgress >= achievement.maxProgress) {
            return {
              ...achievement,
              progress: newProgress,
              unlocked: true,
              dateUnlocked: Date.now()
            };
          }
          return {
            ...achievement,
            progress: newProgress
          };
        }
        return achievement;
      });
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            achievements
          }
        }
      };
    }),

    getUserXP: () => {
      const { user, userData } = get();
      return user ? userData[user.id]?.xp || 0 : 0;
    },

    addXP: (amount) => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      const newXP = userData.xp + amount;
      let newLevel = userData.level;
      for (const level of DEFAULT_LEVELS) {
        if (newXP >= level.minXP && newXP < level.maxXP) {
          newLevel = level;
          break;
        }
      }
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            xp: newXP,
            level: newLevel
          }
        }
      };
    }),

    getUserLevel: () => {
      const { user, userData } = get();
      return user ? userData[user.id]?.level || DEFAULT_LEVELS[0] : DEFAULT_LEVELS[0];
    },

    getLearningStreak: () => {
      const { user, userData } = get();
      return user ? userData[user.id]?.streak || DEFAULT_STREAK : DEFAULT_STREAK;
    },

    updateStreak: () => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      const streak = userData.streak || { ...DEFAULT_STREAK };
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterday = today - 86400000;
      
      let newStreak = streak;
      
      if (streak.lastActiveDate === 0) {
        newStreak = {
          ...streak,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
          history: [...streak.history, { date: today, isActive: true }]
        };
      } else if (streak.lastActiveDate === today) {
        return state;
      } else if (streak.lastActiveDate === yesterday) {
        const currentStreak = streak.currentStreak + 1;
        newStreak = {
          ...streak,
          currentStreak,
          longestStreak: Math.max(currentStreak, streak.longestStreak),
          lastActiveDate: today,
          history: [...streak.history, { date: today, isActive: true }]
        };
      } else {
        newStreak = {
          ...streak,
          currentStreak: 1,
          lastActiveDate: today,
          history: [...streak.history, { date: today, isActive: true }]
        };
      }
      
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            streak: newStreak
          }
        }
      };
    }),

    // Folder functions
    addFolder: (name, parentId) => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      const newFolder = {
        id: generateUUID(),
        name,
        parentId,
        timestamp: Date.now()
      };
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            folders: [...userData.folders, newFolder]
          }
        }
      };
    }),

    updateFolder: (id, name) => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            folders: userData.folders.map(folder =>
              folder.id === id ? { ...folder, name } : folder
            )
          }
        }
      };
    }),

    deleteFolder: (id) => set(state => {
      if (!state.user) return state;
      const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
      return {
        userData: {
          ...state.userData,
          [state.user.id]: {
            ...userData,
            folders: userData.folders.filter(folder => folder.id !== id),
            notes: userData.notes.map(note =>
              note.folderId === id ? { ...note, folderId: null } : note
            )
          }
        }
      };
    }),

    getFolders: () => {
      const { user, userData } = get();
      return user ? userData[user.id]?.folders || [] : [];
    }
  })
);