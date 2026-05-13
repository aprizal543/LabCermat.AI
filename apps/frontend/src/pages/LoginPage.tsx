import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Akun demo lokal Sprint 2 — bukan credential production
const DEMO_ACCOUNTS = [
  { label: 'Masuk sebagai Analis', email: 'analis@labcermat.demo', password: 'demo12345', role: 'Analis' },
  { label: 'Masuk sebagai Supervisor', email: 'supervisor@labcermat.demo', password: 'demo12345', role: 'Supervisor' },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, session, appUser, isSyncing } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jika sudah login dan appUser sudah tersedia, redirect ke dashboard
  useEffect(() => {
    if (session && appUser) {
      navigate('/', { replace: true });
    }
  }, [session, appUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email dan password wajib diisi');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(trimmedEmail, password);
      // Redirect ditangani oleh useEffect saat appUser terisi
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login gagal, coba lagi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    if (isSubmitting) return;
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setIsSubmitting(true);

    try {
      await login(demoEmail, demoPassword);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login gagal, coba lagi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isSyncing;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 shadow-md">
            <FlaskConical size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">LabCermat</h1>
            <p className="text-sm text-slate-500">Platform Workflow Laboratorium</p>
          </div>
        </div>

        {/* Login card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-base font-semibold text-slate-700">
              Masuk ke Sistem
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sync indicator */}
            {isSyncing && !isSubmitting && (
              <div className="flex items-center gap-2 rounded-md bg-teal-50 px-3 py-2.5 text-sm text-teal-700">
                <Loader2 size={14} className="animate-spin" />
                <span>Memuat data akun…</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-slate-600">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@laboratorium.id"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  disabled={isBusy}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-slate-600">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  disabled={isBusy}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <Button
                type="submit"
                disabled={isBusy}
                className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800"
              >
                {isBusy ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {isSyncing ? 'Memuat akun…' : 'Masuk…'}
                  </span>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] text-slate-400">Akun Demo</span>
              </div>
            </div>

            {/* Demo buttons */}
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  disabled={isBusy}
                  className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs text-slate-600 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="font-medium">{account.label}</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400">
          LabCermat v1.0.0 · Sprint 2 · Supabase Auth
        </p>
      </div>
    </div>
  );
}
