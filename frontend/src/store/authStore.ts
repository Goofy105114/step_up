import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

interface RegisterData {
  email: string; password: string; first_name: string; last_name: string; phone?: string; verification_ticket: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          set({ token, user, isLoading: false });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/register', data);
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          set({ token, user, isLoading: false });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.user, isLoading: false });
        } catch {
          set({ user: null, token: null, isLoading: false });
        }
      },
    }),
    { name: 'auth-storage', version: 2, partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
