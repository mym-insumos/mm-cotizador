import { create } from 'zustand';
import type { User } from '../types';
import { auth } from '../services/api';

interface AuthState {
  user:       User | null;
  token:      string | null;
  isLoading:  boolean;
  setUser:    (user: User | null) => void;
  login:      (email: string, password: string) => Promise<void>;
  logout:     () => void;
  loadProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:      null,
  token:     localStorage.getItem('token'),
  isLoading: false,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { token, user } = await auth.login({ email, password });
      localStorage.setItem('token', token);
      set({ token, user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  loadProfile: async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const user = await auth.getProfile();
      set({ user });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },
}));
