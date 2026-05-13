import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  analis:     'Analis',
  supervisor: 'Supervisor',
  admin:      'Admin',
  auditor:    'Auditor',
};

export function AppShell() {
  const { appUser } = useAuth();
  const role = appUser?.role.name;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <p className="text-xs text-slate-400">Ringkasan kerja analis dan supervisor lab</p>
            <h1 className="text-sm font-semibold text-slate-700">
              Dashboard Operasional Laboratorium
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
              Internal Lab Use
            </span>
            {appUser && (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                  {appUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-slate-700">{appUser.fullName}</p>
                  {role && (
                    <p className="text-[10px] text-slate-400">
                      {ROLE_LABEL[role] ?? role}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
