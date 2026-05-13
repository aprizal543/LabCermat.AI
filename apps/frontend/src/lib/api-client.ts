import axios from 'axios';
import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor — ambil token dari Supabase session setiap request
apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 global
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired: coba refresh sekali
      const { data } = await supabase.auth.refreshSession();
      if (data.session) {
        // Retry request dengan token baru
        const originalRequest = error.config;
        originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
        return apiClient(originalRequest);
      }
      // Refresh gagal — paksa logout (AuthContext akan handle redirect)
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  },
);
