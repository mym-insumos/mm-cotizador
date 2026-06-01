import axios from 'axios';
import type { User, Match, Tournament, Transaction, AuthResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  register:       (data: { email: string; username: string; password: string; country?: string }) =>
    api.post<AuthResponse>('/auth/register', data).then(r => r.data),
  login:          (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then(r => r.data),
  getProfile:     () => api.get<User>('/auth/profile').then(r => r.data),
  updateProfile:  (data: Partial<User>) => api.patch<User>('/auth/profile', data).then(r => r.data),
  linkChess:      (provider: string, username: string) =>
    api.post<User>('/auth/link-chess', { provider, username }).then(r => r.data),
};

export const matches = {
  list:      (params?: { page?: number; limit?: number }) =>
    api.get<Match[]>('/matches', { params }).then(r => r.data),
  myMatches: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ matches: Match[]; total: number }>('/matches/my', { params }).then(r => r.data),
  get:       (id: string) => api.get<Match>(`/matches/${id}`).then(r => r.data),
  create:    (data: { stakeAmount: number; timeControl: number; incrementSeconds?: number }) =>
    api.post<Match>('/matches', data).then(r => r.data),
  join:      (id: string) => api.post<Match>(`/matches/${id}/join`).then(r => r.data),
  settle:    (id: string, chessGameId: string) =>
    api.post<Match>(`/matches/${id}/settle`, { chessGameId }).then(r => r.data),
  cancel:    (id: string) => api.post(`/matches/${id}/cancel`).then(r => r.data),
  dispute:   (id: string, reason: string) =>
    api.post<Match>(`/matches/${id}/dispute`, { reason }).then(r => r.data),
};

export const tournaments = {
  list:     (params?: { status?: string; page?: number }) =>
    api.get<{ tournaments: Tournament[]; total: number }>('/tournaments', { params }).then(r => r.data),
  get:      (id: string) => api.get<Tournament>(`/tournaments/${id}`).then(r => r.data),
  register: (id: string) => api.post(`/tournaments/${id}/register`).then(r => r.data),
  standings: (id: string) => api.get(`/tournaments/${id}/standings`).then(r => r.data),
};

export const payments = {
  getBalance:     () => api.get<{ balance: string; lockedBalance: string }>('/payments/balance').then(r => r.data),
  getTransactions: (params?: { page?: number; type?: string }) =>
    api.get<{ transactions: Transaction[]; total: number }>('/payments/transactions', { params }).then(r => r.data),
  createDeposit:  (amount: number) =>
    api.post<{ clientSecret: string; transactionId: string }>('/payments/deposit', { amount }).then(r => r.data),
  requestWithdrawal: (amount: number, bankAccount: string) =>
    api.post('/payments/withdraw', { amount, bankAccount }).then(r => r.data),
  subscribe:      (tier: 'PREMIUM' | 'HIGH_STAKES') =>
    api.post<{ clientSecret: string }>('/payments/subscribe', { tier }).then(r => r.data),
};

export const kyc = {
  getStatus: () => api.get('/kyc/status').then(r => r.data),
  submit:    (data: {
    fullName: string; birthDate: string; documentType: string;
    documentNumber: string; country: string;
  }) => api.post('/kyc/submit', data).then(r => r.data),
};

export default api;
