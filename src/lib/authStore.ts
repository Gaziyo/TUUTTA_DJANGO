import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from './api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  photo_url: string;
  subscription_tier: string;
  settings: Record<string, unknown>;
  is_superuser?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; password2: string; display_name?: string }) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: !!localStorage.getItem('accessToken'),
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post('/auth/login/', { email, password });
          localStorage.setItem('accessToken', data.access);
          localStorage.setItem('refreshToken', data.refresh);

          const { data: user } = await apiClient.get('/auth/me/');
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (registerData) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post('/auth/register/', registerData);
          localStorage.setItem('accessToken', data.access);
          localStorage.setItem('refreshToken', data.refresh);
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          apiClient.post('/auth/logout/', { refresh: refreshToken }).catch(() => {});
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false });
      },

      fetchCurrentUser: async () => {
        if (!localStorage.getItem('accessToken')) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        try {
          const { data } = await apiClient.get('/auth/me/');
          set({ user: data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'tuutta-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
