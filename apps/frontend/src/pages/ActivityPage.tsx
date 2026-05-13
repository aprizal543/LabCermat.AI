import { Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuditLogTable } from '@/components/audit/AuditLogTable';

export function ActivityPage() {
  const { appUser } = useAuth();
  const role = appUser?.role.name;

  const subtitle =
    role === 'supervisor'
      ? 'Semua aktivitas pengguna dalam laboratorium ini'
      : 'Riwayat aktivitas Anda dalam sistem';

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
          <Activity size={18} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Riwayat Aktivitas</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* ── Audit log table ── */}
      <AuditLogTable />
    </div>
  );
}
