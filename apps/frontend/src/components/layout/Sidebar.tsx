import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Activity,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Microscope,
  ShieldCheck,
  TestTube,
  BookOpen,
  CheckSquare,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

// ─── Nav item type ─────────────────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

// ─── Role-based nav config ─────────────────────────────────────

const NAV_ANALIS: NavItem[] = [
  { label: 'Dashboard',        to: '/',                icon: <LayoutDashboard size={17} /> },
  { label: 'Sampel',           to: '/samples',         icon: <FlaskConical size={17} /> },
  { label: 'Persiapan Sampel', to: '/sample-prep',     icon: <TestTube size={17} /> },
  { label: 'Analisis Hasil',   to: '/results',         icon: <Microscope size={17} /> },
  { label: 'QC Harian',        to: '/qc',              icon: <ShieldCheck size={17} /> },
  { label: 'Dokumen Lab',      to: '/documents',       icon: <FileText size={17} /> },
  { label: 'Riwayat',          to: '/activity',        icon: <Activity size={17} /> },
  { label: 'SOP Lab',          to: '/sop',             icon: <BookOpen size={17} /> },
];

const NAV_SUPERVISOR: NavItem[] = [
  { label: 'Dashboard',        to: '/',                icon: <LayoutDashboard size={17} /> },
  { label: 'Review Hasil',     to: '/reviews',         icon: <CheckSquare size={17} /> },
  { label: 'QC Harian',        to: '/qc',              icon: <ShieldCheck size={17} /> },
  { label: 'Sampel',           to: '/samples',         icon: <FlaskConical size={17} /> },
  { label: 'Riwayat',          to: '/activity',        icon: <Activity size={17} /> },
  { label: 'Dokumen Lab',      to: '/documents',       icon: <FileText size={17} /> },
  { label: 'SOP Lab',          to: '/sop',             icon: <BookOpen size={17} /> },
];

const NAV_DEFAULT: NavItem[] = [
  { label: 'Dashboard',        to: '/',                icon: <LayoutDashboard size={17} /> },
  { label: 'Log Audit',        to: '/audit',           icon: <ClipboardList size={17} /> },
  { label: 'Riwayat',          to: '/activity',        icon: <Activity size={17} /> },
];

function getNavItems(role?: string): NavItem[] {
  if (role === 'analis') return NAV_ANALIS;
  if (role === 'supervisor') return NAV_SUPERVISOR;
  return NAV_DEFAULT;
}

// Badge warna per role
const ROLE_BADGE: Record<string, string> = {
  analis:     'bg-teal-50 text-teal-700',
  supervisor: 'bg-clinical-50 text-clinical-700',
  admin:      'bg-amber-50 text-amber-700',
  auditor:    'bg-slate-100 text-slate-600',
};

const ROLE_LABEL: Record<string, string> = {
  analis:     'Analis',
  supervisor: 'Supervisor',
  admin:      'Admin',
  auditor:    'Auditor',
};

// ─── Sidebar ──────────────────────────────────────────────────

export function Sidebar() {
  const { appUser, logout } = useAuth();
  const navigate = useNavigate();
  const role = appUser?.role.name;
  const navItems = getNavItems(role);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">

      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 shadow-sm">
          <FlaskConical size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">LabCermat</p>
          <p className="text-[10px] text-slate-400">Lab Management System</p>
        </div>
      </div>

      {/* Shift card */}
      <div className="mx-3 my-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-700">Shift Pagi</p>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            Aktif
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {appUser?.laboratory.name ?? 'Laboratorium'}
        </p>
        <div className="mt-2 flex gap-3 text-[10px] text-slate-400">
          <span>Sampel: <span className="font-medium text-slate-500">—</span></span>
          <span>QC: <span className="font-medium text-slate-500">—</span></span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Menu Utama
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-teal-600' : 'text-slate-400'}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-slate-100 p-3">
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            {/* Avatar + info */}
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                {appUser?.fullName?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-700">
                  {appUser?.fullName ?? '—'}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {appUser?.email ?? '—'}
                </p>
                {role && (
                  <span
                    className={cn(
                      'mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                      ROLE_BADGE[role] ?? 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {ROLE_LABEL[role] ?? role}
                  </span>
                )}
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Keluar"
              className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
