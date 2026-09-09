import axios, { AxiosError } from 'axios';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface LocationSettings {
  id?: number;
  user_id?: number;
  collection_enabled: boolean;
  consent_timestamp?: string | null;
  updated_at?: string;
}

export interface LocationRecord {
  id?: number;
  user_id?: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
}

export interface AuditLogRecord {
  id: number;
  admin_id: number;
  admin_name?: string;
  action: string;
  target_user_id?: number | null;
  target_user_name?: string | null;
  timestamp: string;
  ip_address?: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // If unauthorized, clear stored auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post<{ access_token: string; token_type: string; user: User }>('/auth/login', credentials),

  register: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post<{ access_token: string; token_type: string; user: User }>('/auth/register', data),

  getMe: () => api.get<User>('/auth/me'),
};

export const locationApi = {
  getSettings: () => api.get<LocationSettings>('/location/settings'),

  updateSettings: (settings: Partial<LocationSettings>) =>
    api.put<LocationSettings>('/location/settings', settings),

  startCollection: () => api.post<{ success: boolean; message: string }>('/location/start'),

  stopCollection: () => api.post<{ success: boolean; message: string }>('/location/stop'),

  sendUpdate: (location: { latitude: number; longitude: number; accuracy: number; timestamp?: string }) =>
    api.post<{ success: boolean; message: string }>('/location/update', location),

  getLatest: () => api.get<LocationRecord | null>('/location/latest'),

  getHistory: (params?: { start_date?: string; end_date?: string }) =>
    api.get<LocationRecord[]>('/location/history', { params }),
};

export const adminApi = {
  getUsers: () => api.get<(User & { collection_enabled?: boolean; last_update?: string })[]>('/admin/users'),

  getUserLocation: (userId: number) =>
    api.get<LocationRecord | null>(`/admin/users/${userId}/location`),

  getUserLocations: (userId: number, params?: { start_date?: string; end_date?: string }) =>
    api.get<LocationRecord[]>(`/admin/users/${userId}/locations`, { params }),

  getAuditLogs: () => api.get<AuditLogRecord[]>('/admin/audit-logs'),
};

export default api;
