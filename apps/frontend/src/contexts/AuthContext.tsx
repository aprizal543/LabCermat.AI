import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  authUserId: string;
  email: string;
  fullName: string;
  status: string;
  role: {
    id: string;
    name: string;
    description: string | null;
  };
  laboratory: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthContextValue {
  /** Supabase session — null jika belum login */
  session: Session | null;
  /** Data user dari public.users — null jika belum sync atau belum login */
  appUser: AppUser | null;
  /** true saat sedang cek session awal (splash) */
  isLoading: boolean;
  /** true jika sync-user atau /me sedang berjalan setelah login */
  isSyncing: boolean;
  /** Error terakhir dari proses sync */
  syncError: string | null;
  /** Login dengan email + password */
  login: (email: string, password: string) => Promise<void>;
  /** Logout — clear session dan appUser */
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Cegah race condition jika onAuthStateChange terpanggil dua kali
  const syncInProgress = useRef(false);

  // Sync user ke public.users lalu ambil data /auth/me
  const syncAndFetch = useCallback(async (_session: Session) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Sync user ke public.users (idempotent)
      await apiClient.post('/auth/sync-user', {});

      // 2. Ambil data user lengkap dari backend
      const meRes = await apiClient.get<{ data: AppUser }>('/auth/me');
      setAppUser(meRes.data.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal mengambil data user';
      setSyncError(message);
      setAppUser(null);
      console.error('[AuthContext] syncAndFetch error:', message);
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, []);

  // Bootstrap: cek session yang sudah tersimpan saat app pertama load
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);

      if (data.session) {
        syncAndFetch(data.session).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Subscribe ke perubahan auth state (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (event === 'SIGNED_IN' && newSession) {
        syncAndFetch(newSession);
      }

      if (event === 'SIGNED_OUT') {
        setAppUser(null);
        setSyncError(null);
      }

      if (event === 'TOKEN_REFRESHED' && newSession) {
        // Session sudah diperbarui — appUser tetap, tidak perlu sync ulang
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [syncAndFetch]);

  const login = useCallback(async (email: string, password: string) => {
    setSyncError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Terjemahkan pesan error Supabase ke bahasa Indonesia
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Email atau password salah');
      }
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error('Email belum dikonfirmasi. Cek inbox Anda');
      }
      throw new Error(error.message);
    }
    // onAuthStateChange SIGNED_IN akan memanggil syncAndFetch otomatis
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT akan clear appUser
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, appUser, isLoading, isSyncing, syncError, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return ctx;
}
