import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Note, ChatMessage, FileUpload, User, AppSettings, ChatSession, Folder, Achievement, UserLevel, LearningStreak, Assessment } from './types';
import { useAuthStore } from './lib/authStore';
import { dataGateway } from './lib/dataGateway';
import * as storageService from './lib/storage';

// No custom storage needed for now, use default localStorage adapter

// Add registered users to the store
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
  files: FileUpload[]; // Store files per user, but content should be URL
  assessments: Assessment[]; // Store completed assessments for analytics
}

interface AppState {
  userData: Record<string, UserData>;
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
  removeFile: (fileId: string) => Promise<void>;
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
  getAssessments: () => Assessment[];
}

export const DEFAULT_SETTINGS: AppSettings = { // Add export keyword
  theme: 'light',
  fontSize: 'medium',
  speechEnabled: true,
  autoSave: true,
  notificationEnabled: true,
  voice: 'nova',
  speechSpeed: 1.0,
  tourCompleted: false, // Initialize tour as not completed for new users
  mfaEnabled: false,
  mfaMethod: 'totp',
  mfaRecoveryCodes: []
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
  files: [], // Initialize empty files array
  assessments: [] // Initialize empty assessments array for analytics
};

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};


export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      userData: {},
      isRecording: false,
      user: null,
      currentChatId: null,

      // Authentication functions — delegate to authStore (Django JWT)
      registerUser: async (email: string, password: string) => {
        const name = email.split('@')[0];
        await useAuthStore.getState().register({ email, username: name, password, password2: password, display_name: name });
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          set({
            user: { id: authUser.id, email: authUser.email, name: authUser.display_name || name, settings: DEFAULT_SETTINGS },
            userData: { [authUser.id]: DEFAULT_USER_DATA }
          });
        }
      },

      loginUser: async (email: string, password: string) => {
        await useAuthStore.getState().login(email, password);
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          set({
            user: { id: authUser.id, email: authUser.email, name: authUser.display_name || authUser.username || email.split('@')[0], settings: DEFAULT_SETTINGS },
            userData: { [authUser.id]: DEFAULT_USER_DATA }
          });
        } else {
          throw new Error('Invalid email or password. Please try again.');
        }
      },

      // Helper functions
      getNotes: () => {
        const { user, userData } = get();
        return user ? userData[user.id]?.notes || [] : [];
      },

      getSubjects: () => {
        const { user, userData } = get();
        return user ? userData[user.id]?.subjects || [] : [];
      },

      getSettings: () => {
        const { user, userData } = get();
        return user ? userData[user.id]?.settings || DEFAULT_SETTINGS : DEFAULT_SETTINGS;
      },

      // Chat functions
      createNewChat: () => {
        const state = get();
        if (!state.user) return '';

        const newChat: ChatSession = {
          id: generateUUID(),
          messages: [],
          timestamp: Date.now(),
          title: `Chat ${(state.userData[state.user.id]?.chatSessions || []).length + 1}`,
        };

        set((state) => {
          const userData = state.userData[state.user!.id] || { ...DEFAULT_USER_DATA };
          return {
            currentChatId: newChat.id,
            userData: {
              ...state.userData,
              [state.user!.id]: {
                ...userData,
                chatSessions: [newChat, ...(userData.chatSessions || [])],
              },
            },
          };
        });

        return newChat.id;
      },

      switchChat: (chatId) => set({ currentChatId: chatId }),

      getChatSessions: () => {
        const { user, userData } = get();
        if (!user) return [];
        return userData[user.id]?.chatSessions || [];
      },

      getCurrentChat: () => {
        const { user, userData, currentChatId } = get();
        if (!user || !currentChatId) return null;
        return userData[user.id]?.chatSessions.find(chat => chat.id === currentChatId) || null;
      },

      deleteChat: (chatId) => {
        set((state) => {
          if (!state.user) return state;

          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          const updatedChatSessions = userData.chatSessions.filter(chat => chat.id !== chatId);
          const newCurrentChatId = state.currentChatId === chatId
            ? (updatedChatSessions[0]?.id || null)
            : state.currentChatId;

          return {
            currentChatId: newCurrentChatId,
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                chatSessions: updatedChatSessions,
              },
            },
          };
        });
      },

      updateChatTitle: (chatId, title) => {
        set((state) => {
          if (!state.user) return state;

          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                chatSessions: userData.chatSessions.map(chat =>
                  chat.id === chatId ? { ...chat, title } : chat
                ),
              },
            },
          };
        });
      },

      addMessage: (message) => {
        set(state => {
          if (!state.user || !state.currentChatId) return state;

          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };

          // Check if this is the first message in a new chat
          const currentChat = userData.chatSessions.find(chat => chat.id === state.currentChatId);
          const isFirstMessage = currentChat && currentChat.messages.length === 0 && message.role === 'user';

          // Update achievements if this is the first message
          if (isFirstMessage) {
            const achievements = userData.achievements || [...DEFAULT_ACHIEVEMENTS];
            const firstChatAchievement = achievements.find(a => a.id === 'first-chat');

            if (firstChatAchievement && !firstChatAchievement.unlocked) {
              const updatedAchievements = achievements.map(achievement => {
                if (achievement.id === 'first-chat') {
                  return {
                    ...achievement,
                    progress: 1,
                    unlocked: true,
                    dateUnlocked: Date.now()
                  };
                }
                return achievement;
              });

              // Update streak
              get().updateStreak();

              return {
                userData: {
                  ...state.userData,
                  [state.user.id]: {
                    ...userData,
                    achievements: updatedAchievements,
                    xp: userData.xp + firstChatAchievement.xp,
                    chatSessions: userData.chatSessions.map(chat =>
                      chat.id === state.currentChatId
                        ? { ...chat, messages: [...chat.messages, message] }
                        : chat
                    ),
                  },
                },
              };
            }
          }

          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                chatSessions: userData.chatSessions.map(chat =>
                  chat.id === state.currentChatId
                    ? { ...chat, messages: [...chat.messages, message] }
                    : chat
                ),
              },
            },
          };
        });
      },

      clearMessages: () => {
        set((state) => {
          if (!state.user || !state.currentChatId) return state;

          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                chatSessions: userData.chatSessions.filter(chat => chat.id !== state.currentChatId),
              },
            },
            currentChatId: null,
          };
        });
      },

      // File management functions
      addFile: (file) => set(state => {
        if (!state.user) return state;
        const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };

        // Ensure we don't store base64 content if it's too large, relying on URL instead.
        // The file passed here should already have the URL as content from the component.
        // We do not modify the file object here, trusting the component to have prepared it correctly via storage service.

        const newFiles = [...userData.files, file];

        // Sync with Firestore
        dataGateway.legacy.addFile(state.user.id, file).catch(console.error);

        // Check for "File Explorer" achievement (3 different file types)
        const fileTypes = new Set(newFiles.map(f => f.type.split('/')[0]));
        const achievements = userData.achievements || [...DEFAULT_ACHIEVEMENTS];
        const fileExplorerAchievement = achievements.find(a => a.id === 'file-explorer');
        let updatedAchievements = achievements;
        let updatedXP = userData.xp;

        if (fileExplorerAchievement && !fileExplorerAchievement.unlocked) {
          const newProgress = fileTypes.size;
          updatedAchievements = achievements.map(achievement => {
            if (achievement.id === 'file-explorer') {
              if (newProgress >= achievement.maxProgress) {
                updatedXP += achievement.xp;
                return {
                  ...achievement,
                  progress: achievement.maxProgress,
                  unlocked: true,
                  dateUnlocked: Date.now()
                };
              }
              return { ...achievement, progress: newProgress };
            }
            return achievement;
          });
        }

        return {
          userData: {
            ...state.userData,
            [state.user.id]: {
              ...userData,
              files: newFiles,
              achievements: updatedAchievements,
              xp: updatedXP
            }
          }
        };
      }),

      removeFile: async (fileId) => {
        const state = get();
        if (!state.user) return;

        const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
        const fileToRemove = userData.files.find(f => f.id === fileId);

        if (fileToRemove) {
          // Delete from storage if it's a URL (assuming it's a Firebase Storage URL)
          if (fileToRemove.content.startsWith('http')) {
            try {
              await storageService.deleteFile(fileToRemove.content);
            } catch (e) {
              console.error('Failed to delete file from storage', e);
            }
          }

          // Delete from Firestore
          await dataGateway.legacy.deleteFile(state.user.id, fileId);

          set(state => ({
            userData: {
              ...state.userData,
              [state.user!.id]: {
                ...userData,
                files: userData.files.filter(file => file.id !== fileId)
              }
            }
          }));
        }
      },

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

      getAssessments: () => {
        const { user, userData } = get();
        return user ? userData[user.id]?.assessments || [] : [];
      },

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
      },

      // Note functions
      addNote: (note) => {
        set(state => {
          if (!state.user) return state;
          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          const newNotes = [...userData.notes, note];

          // Check for "Note Taker" achievement (5 notes)
          const achievements = userData.achievements || [...DEFAULT_ACHIEVEMENTS];
          const noteTakerAchievement = achievements.find(a => a.id === 'note-taker');
          let updatedAchievements = achievements;
          let updatedXP = userData.xp;

          if (noteTakerAchievement && !noteTakerAchievement.unlocked) {
            const newProgress = newNotes.length;
            updatedAchievements = achievements.map(achievement => {
              if (achievement.id === 'note-taker') {
                if (newProgress >= achievement.maxProgress) {
                  updatedXP += achievement.xp;
                  return {
                    ...achievement,
                    progress: achievement.maxProgress,
                    unlocked: true,
                    dateUnlocked: Date.now()
                  };
                }
                return { ...achievement, progress: newProgress };
              }
              return achievement;
            });
          }

          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                notes: newNotes,
                achievements: updatedAchievements,
                xp: updatedXP
              }
            }
          };
        });
      },

      updateNote: (updatedNote) => {
        set(state => {
          if (!state.user) return state;
          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                notes: userData.notes.map(note =>
                  note.id === updatedNote.id ? updatedNote : note
                )
              }
            }
          };
        });
      },

      deleteNote: (id) => {
        set(state => {
          if (!state.user) return state;
          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                notes: userData.notes.filter(note => note.id !== id)
              }
            }
          };
        });
      },

      // Subject functions
      addSubject: (subject) => {
        set(state => {
          if (!state.user) return state;
          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          if (userData.subjects.includes(subject)) return state;
          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                subjects: [...userData.subjects, subject]
              }
            }
          };
        });
      },

      updateSubject: (oldSubject, newSubject) => {
        set(state => {
          if (!state.user) return state;
          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                subjects: userData.subjects.map(s => s === oldSubject ? newSubject : s),
                notes: userData.notes.map(note =>
                  note.subject === oldSubject ? { ...note, subject: newSubject } : note
                )
              }
            }
          };
        });
      },

      deleteSubject: (subject) => {
        set(state => {
          if (!state.user) return state;
          const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
          const newSubject = userData.subjects.find(s => s !== subject);
          if (!newSubject) return state;
          return {
            userData: {
              ...state.userData,
              [state.user.id]: {
                ...userData,
                subjects: userData.subjects.filter(s => s !== subject),
                notes: userData.notes.map(note =>
                  note.subject === subject ? { ...note, subject: newSubject } : note
                )
              }
            }
          };
        });
      },

      // Other actions
      setIsRecording: (isRecording) => set({ isRecording }),
      setUser: (user) => set({ user, currentChatId: null }),
      updateSettings: (settings) => set(state => {
        if (!state.user) return state;
        const userData = state.userData[state.user.id] || { ...DEFAULT_USER_DATA };
        return {
          userData: {
            ...state.userData,
            [state.user.id]: {
              ...userData,
              settings: { ...userData.settings, ...settings }
            }
          }
        };
      })
    }),
    {
      name: 'tuutta-storage', // Storage key name
      storage: createJSONStorage(() => localStorage), // Use default localStorage adapter
      partialize: (state): Partial<AppState> => ({ // Cast return type
        // Only persist these parts of the state
        userData: state.userData,
        user: state.user,
        currentChatId: state.currentChatId,
      }),
    }
  )
);
