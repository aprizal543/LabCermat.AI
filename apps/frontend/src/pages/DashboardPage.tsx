import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FlaskConical,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { SampleStatus } from '@labcermat/shared-types';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalysisDashboard, useSupervisorDashboard } from '@/hooks/useDashboard';
import { useUpdateSampleStatus } from '@/hooks/useSamples';
import { PriorityBadge } from '@/components/samples/PriorityBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Health query ──────────────────────────────────────────────

interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  version: string;
  timestamp: string;
  database: 'connected' | 'disconnected';
}

function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await apiClient.get<HealthResponse>('/health');
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

// ─── System status bar ─────────────────────────────────────────

function SystemStatusBar() {
  const { data: health, isLoading, isError } = useHealth();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-2.5">
      {isLoading && <Loader2 size={13} className="animate-spin text-slate-400" />}
      {isError && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <WifiOff size={13} />
          <span>Backend tidak terjangkau</span>
        </div>
      )}
      {health && (
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Wifi size={13} className="text-teal-500" />
            <span>Backend</span>
            <Badge variant={health.status === 'ok' ? 'success' : 'destructive'} className="py-0 text-[10px]">
              {health.status === 'ok' ? 'Online' : 'Error'}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={13} className="text-teal-500" />
            <span>Database</span>
            <Badge variant={health.database === 'connected' ? 'success' : 'destructive'} className="py-0 text-[10px]">
              {health.database === 'connected' ? 'Terhubung' : 'Terputus'}
            </Badge>
          </div>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] text-slate-400">
            {new Date(health.timestamp).toLocaleTimeString('id-ID')}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  note: string;
  color?: 'teal' | 'amber' | 'blue' | 'green';
  loading?: boolean;
}

function StatCard({ label, value, icon, note, color = 'teal', loading = false }: StatCardProps) {
  const iconBg: Record<string, string> = {
    teal:  'bg-teal-50',
    amber: 'bg-amber-50',
    blue:  'bg-clinical-50',
    green: 'bg-green-50',
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            {loading ? (
              <div className="h-8 flex items-center">
                <Loader2 size={16} className="animate-spin text-slate-300" />
              </div>
            ) : (
              <p className="text-2xl font-bold text-slate-800">{value}</p>
            )}
            <p className="text-[10px] text-slate-400">{note}</p>
          </div>
          <div className={`rounded-lg p-2 ${iconBg[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Analis ──────────────────────────────────────────

function DashboardAnalis() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAnalysisDashboard();
  const d = data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500">Ringkasan operasional harian Anda</p>
      </div>

      <SystemStatusBar />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Sampel Hari Ini"
          value={d?.totalToday ?? 0}
          icon={<FlaskConical size={18} className="text-teal-600" />}
          note="Masuk hari ini"
          color="teal"
          loading={isLoading}
        />
        <StatCard
          label="Dalam Proses"
          value={d?.dalamProses ?? 0}
          icon={<Clock size={18} className="text-amber-500" />}
          note="Sedang dikerjakan"
          color="amber"
          loading={isLoading}
        />
        <StatCard
          label="Menunggu Review"
          value={d?.menungguReview ?? 0}
          icon={<Activity size={18} className="text-clinical-600" />}
          note="Menunggu supervisor"
          color="blue"
          loading={isLoading}
        />
        <StatCard
          label="Tervalidasi Hari Ini"
          value={d?.tervalidasiHariIni ?? 0}
          icon={<CheckCircle size={18} className="text-green-600" />}
          note="Divalidasi hari ini"
          color="green"
          loading={isLoading}
        />
      </div>

      {/* Sampel Prioritas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Sampel Prioritas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-slate-300" />
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-1.5 py-4 text-xs text-red-400">
              <AlertCircle size={13} />
              <span>Gagal memuat data prioritas</span>
            </div>
          )}

          {!isLoading && !isError && (!d?.topPriority || d.topPriority.length === 0) && (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
              <p className="text-xs text-slate-400">Tidak ada sampel aktif saat ini</p>
            </div>
          )}

          {!isLoading && !isError && d?.topPriority && d.topPriority.length > 0 && (
            <div className="space-y-2">
              {d.topPriority.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/samples/${s.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-mono text-xs font-semibold text-slate-700">
                      {s.sampleCode}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {s.requestedTest}
                      {s.department ? ` · ${s.department}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <PriorityBadge priority={s.priority} />
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QC Hari Ini */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-teal-600" />
              <CardTitle className="text-sm">QC Hari Ini</CardTitle>
            </div>
            <button
              onClick={() => navigate('/qc')}
              className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
            >
              Lihat semua <ChevronRight size={12} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-slate-300" />
            </div>
          )}
          {!isLoading && (
            <div className="flex items-center gap-3">
              {/* Stabil */}
              <div className="flex flex-1 items-center gap-3 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
                <CheckCircle size={18} className="shrink-0 text-teal-600" />
                <div>
                  <p className="text-xl font-bold text-teal-700">{d?.qcHariIni?.stabil ?? 0}</p>
                  <p className="text-[11px] text-teal-600">Stabil</p>
                </div>
              </div>
              {/* Perlu Perhatian */}
              <div className={[
                'flex flex-1 items-center gap-3 rounded-lg border px-4 py-3',
                (d?.qcHariIni?.perluPerhatian ?? 0) > 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-100 bg-slate-50',
              ].join(' ')}>
                <AlertCircle size={18} className={[
                  'shrink-0',
                  (d?.qcHariIni?.perluPerhatian ?? 0) > 0 ? 'text-amber-500' : 'text-slate-300',
                ].join(' ')} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className={[
                      'text-xl font-bold',
                      (d?.qcHariIni?.perluPerhatian ?? 0) > 0 ? 'text-amber-700' : 'text-slate-400',
                    ].join(' ')}>
                      {d?.qcHariIni?.perluPerhatian ?? 0}
                    </p>
                    {(d?.qcHariIni?.perluPerhatian ?? 0) > 0 && (
                      <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                        Perhatian
                      </span>
                    )}
                  </div>
                  <p className={[
                    'text-[11px]',
                    (d?.qcHariIni?.perluPerhatian ?? 0) > 0 ? 'text-amber-600' : 'text-slate-400',
                  ].join(' ')}>
                    Perlu Perhatian
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Supervisor review list item ───────────────────────────────

function ReviewListItem({
  id,
  sampleCode,
  requestedTest,
  department,
  creatorName,
  priority,
}: {
  id: string;
  sampleCode: string;
  requestedTest: string;
  department: string | null;
  creatorName: string;
  priority: import('@labcermat/shared-types').SamplePriority;
}) {
  const navigate = useNavigate();
  const updateStatus = useUpdateSampleStatus();
  const isPending = updateStatus.isPending;

  function handleValidasi() {
    updateStatus.mutate({ id, status: SampleStatus.TERVALIDASI });
  }

  return (
    <div className="rounded-lg border border-slate-100 px-4 py-3 space-y-2">
      {/* Top row: info + priority */}
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => navigate(`/samples/${id}`)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="font-mono text-xs font-semibold text-slate-700 hover:text-teal-600">
            {sampleCode}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {requestedTest}
            {department ? ` · ${department}` : ''}
            {' · '}
            <span className="text-slate-400">Analis: {creatorName}</span>
          </p>
        </button>
        <PriorityBadge priority={priority} />
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        <button
          disabled={isPending}
          onClick={handleValidasi}
          className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <CheckCircle2 size={11} />
          )}
          {isPending ? 'Memproses…' : 'Validasi'}
        </button>
        <button
          disabled={isPending}
          onClick={() => navigate(`/samples/${id}`)}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50 disabled:pointer-events-none"
        >
          <RefreshCw size={11} />
          Cek Ulang
        </button>
      </div>

      {/* API error */}
      {updateStatus.isError && (
        <p className="flex items-center gap-1 text-[11px] text-red-500">
          <AlertCircle size={11} />
          {(updateStatus.error?.response?.data as { message?: string })?.message ??
            'Gagal memproses. Coba lagi.'}
        </p>
      )}
    </div>
  );
}

// ─── Dashboard Supervisor ──────────────────────────────────────

function DashboardSupervisor() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSupervisorDashboard();
  const d = data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Dashboard Supervisor</h2>
        <p className="text-sm text-slate-500">Fokus review dan validasi hasil pemeriksaan</p>
      </div>

      <SystemStatusBar />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Menunggu Review"
          value={d?.menungguReview ?? 0}
          icon={<ClipboardCheck size={18} className="text-amber-500" />}
          note="Perlu ditinjau"
          color="amber"
          loading={isLoading}
        />
        <StatCard
          label="Tervalidasi Hari Ini"
          value={d?.tervalidasiHariIni ?? 0}
          icon={<CheckCircle size={18} className="text-green-600" />}
          note="Divalidasi hari ini"
          color="green"
          loading={isLoading}
        />
        <StatCard
          label="Minta Cek Ulang"
          value={d?.mintaCekUlang ?? 0}
          icon={<RefreshCw size={18} className="text-clinical-600" />}
          note="Perlu diperiksa ulang"
          color="blue"
          loading={isLoading}
        />
        <StatCard
          label="QC Perlu Perhatian"
          value={d?.qcPerluPerhatian ?? 0}
          icon={<ShieldCheck size={18} className="text-amber-500" />}
          note="Semua waktu"
          color="amber"
          loading={isLoading}
        />
      </div>

      {/* Daftar Review Hasil */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Daftar Review Hasil</CardTitle>
            {!isLoading && d && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                {d.menungguReview} menunggu
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-slate-300" />
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-1.5 py-4 text-xs text-red-400">
              <AlertCircle size={13} />
              <span>Gagal memuat daftar review</span>
            </div>
          )}

          {!isLoading && !isError &&
            (!d?.sampelMenungguReview || d.sampelMenungguReview.length === 0) && (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
                <p className="text-xs text-slate-400">
                  Tidak ada sampel yang menunggu review saat ini
                </p>
              </div>
            )}

          {!isLoading && !isError &&
            d?.sampelMenungguReview &&
            d.sampelMenungguReview.length > 0 && (
              <div className="space-y-2">
                {d.sampelMenungguReview.map((s) => (
                  <ReviewListItem
                    key={s.id}
                    id={s.id}
                    sampleCode={s.sampleCode}
                    requestedTest={s.requestedTest}
                    department={s.department}
                    creatorName={s.creator.fullName}
                    priority={s.priority}
                  />
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      {/* QC Perlu Perhatian */}
      {!isLoading && (d?.qcPerluPerhatian ?? 0) > 0 && (
        <button
          onClick={() => navigate('/qc')}
          className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-left transition-colors hover:bg-amber-100"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <ShieldCheck size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {d?.qcPerluPerhatian} QC Perlu Perhatian
              </p>
              <p className="text-xs text-amber-600">
                Terdapat QC di luar batas kontrol — klik untuk melihat detail
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-amber-500" />
        </button>
      )}

      {/* Ringkasan Supervisor — Sprint 6 placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Ringkasan Supervisor</CardTitle>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-400">
              Tersedia Sprint 6
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
            <p className="text-xs text-slate-400">
              Ringkasan AI akan tersedia setelah workflow sampel diimplementasikan
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sprint info */}
      <Card className="border-dashed border-slate-200 bg-slate-50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-slate-500">Sprint 4 — Result Input & Supervisor Review</p>
          <p className="mt-1 text-xs text-slate-400">
            Validasi dan cek ulang aktif. Gunakan tombol di daftar atau buka halaman detail sampel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Entry point ───────────────────────────────────────────────

export function DashboardPage() {
  const { appUser } = useAuth();
  const role = appUser?.role.name;

  if (role === 'supervisor') return <DashboardSupervisor />;
  return <DashboardAnalis />;
}
