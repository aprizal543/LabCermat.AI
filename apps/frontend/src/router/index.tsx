import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { SamplesPage } from '@/pages/SamplesPage';
import { SampleDetailPage } from '@/pages/SampleDetailPage';
import { QcPage } from '@/pages/QcPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { Loader2 } from 'lucide-react';

// ─── Splash spinner ────────────────────────────────────────────

function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-teal-600" />
        <p className="text-sm text-slate-400">Memuat…</p>
      </div>
    </div>
  );
}

// ─── Guards ────────────────────────────────────────────────────

function GuestOnly() {
  const { session, appUser, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (session && !appUser) return <PageSpinner />;
  if (session && appUser) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RequireAuth() {
  const { session, appUser, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!appUser) return <PageSpinner />;
  return <Outlet />;
}

// ─── Router ────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // Publik — hanya untuk guest
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },

  // Protected — wajib login
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          // Dashboard — berbeda per role (lihat DashboardPage)
          { index: true, element: <DashboardPage /> },

          // Analis routes
          {
            path: 'samples',
            element: <SamplesPage />,
          },
          {
            path: 'samples/:id',
            element: <SampleDetailPage />,
          },
          {
            path: 'sample-prep',
            element: <PlaceholderPage title="Persiapan Sampel" sprint="Sprint 3" description="Persiapan dan penerimaan sampel sebelum pemeriksaan." />,
          },
          {
            path: 'results',
            element: <PlaceholderPage title="Analisis Hasil" sprint="Sprint 4" description="Input dan analisis hasil pemeriksaan laboratorium." />,
          },
          {
            path: 'qc',
            element: <QcPage />,
          },
          {
            path: 'documents',
            element: <PlaceholderPage title="Dokumen Lab" sprint="Sprint 7" description="Upload dan manajemen dokumen laboratorium." />,
          },
          {
            path: 'activity',
            element: <ActivityPage />,
          },
          {
            path: 'sop',
            element: <PlaceholderPage title="SOP Lab" sprint="Sprint 7" description="Prosedur operasional standar laboratorium." />,
          },

          // Supervisor routes
          {
            path: 'reviews',
            element: <PlaceholderPage title="Review Hasil" sprint="Sprint 4" description="Review dan validasi hasil pemeriksaan oleh supervisor." />,
          },

          // Shared routes
          {
            path: 'audit',
            element: <PlaceholderPage title="Log Audit" sprint="Sprint 5" description="Semua aktivitas penting tercatat di sini." />,
          },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
