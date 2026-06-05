import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SampleStatus } from '@labcermat/shared-types';
import { useSamples } from '@/hooks/useSamples';
import { useUpdateSampleStatus } from '@/hooks/useSamples';
import { useSupervisorDashboard } from '@/hooks/useDashboard';
import { PriorityBadge } from '@/components/samples/PriorityBadge';
import { StatusBadge } from '@/components/samples/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SampleSummary } from '@/hooks/useSamples';

// ─── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Stat card ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color = 'slate',
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: 'amber' | 'green' | 'blue' | 'slate';
  loading?: boolean;
}) {
  const bg = { amber: 'bg-amber-50', green: 'bg-green-50', blue: 'bg-clinical-50', slate: 'bg-slate-50' };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            {loading ? (
              <Loader2 size={14} className="animate-spin text-slate-300" />
            ) : (
              <p className="text-2xl font-bold text-slate-800">{value}</p>
            )}
          </div>
          <div className={`rounded-lg p-2 ${bg[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Review row ────────────────────────────────────────────────

function ReviewRow({ sample }: { sample: SampleSummary }) {
  const navigate = useNavigate();
  const update = useUpdateSampleStatus();
  const pending = update.isPending;

  function handleValidasi(e: React.MouseEvent) {
    e.stopPropagation();
    update.mutate({ id: sample.id, status: SampleStatus.TERVALIDASI });
  }

  return (
    <div className="rounded-lg border border-slate-100 px-4 py-3 space-y-2">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => navigate(`/samples/${sample.id}`)}
        >
          <p className="font-mono text-xs font-semibold text-slate-700 hover:text-teal-600">
            {sample.sampleCode}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {sample.requestedTest}
            {sample.department ? ` · ${sample.department}` : ''}
            {' · '}
            <span className="text-slate-400">Analis: {sample.creator.fullName}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(sample.createdAt)}</p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <PriorityBadge priority={sample.priority} />
          <StatusBadge status={sample.status} />
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          onClick={handleValidasi}
          className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-teal-700 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
          {pending ? 'Memproses…' : 'Validasi'}
        </button>
        <button
          onClick={() => navigate(`/samples/${sample.id}`)}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-50"
        >
          <RefreshCw size={11} />
          Cek Ulang / Detail
        </button>
        <button
          onClick={() => navigate(`/samples/${sample.id}`)}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-teal-600"
        >
          Buka detail
          <ChevronRight size={11} />
        </button>
      </div>

      {/* Inline error */}
      {update.isError && (
        <p className="flex items-center gap-1 text-[11px] text-red-500">
          <AlertCircle size={11} />
          {(update.error?.response?.data as { message?: string })?.message ??
            'Gagal memproses. Coba lagi.'}
        </p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export function ReviewPage() {
  const navigate = useNavigate();
  const { data: dashData, isLoading: dashLoading } = useSupervisorDashboard();
  const d = dashData?.data;

  const menunggu = useSamples({ status: SampleStatus.MENUNGGU_REVIEW, limit: 50 });
  const cekUlang = useSamples({ status: SampleStatus.MINTA_CEK_ULANG, limit: 20 });

  const menungguList = menunggu.data?.data ?? [];
  const cekUlangList = cekUlang.data?.data ?? [];
  const listLoading = menunggu.isLoading || cekUlang.isLoading;
  const listError   = menunggu.isError   || cekUlang.isError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Review Hasil</h2>
        <p className="text-sm text-slate-500">
          Review dan validasi hasil pemeriksaan yang disubmit oleh analis.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Menunggu Review"
          value={d?.menungguReview ?? 0}
          icon={<ClipboardCheck size={16} className="text-amber-500" />}
          color="amber"
          loading={dashLoading}
        />
        <StatCard
          label="Minta Cek Ulang"
          value={d?.mintaCekUlang ?? 0}
          icon={<RefreshCw size={16} className="text-clinical-600" />}
          color="blue"
          loading={dashLoading}
        />
        <StatCard
          label="Tervalidasi Hari Ini"
          value={d?.tervalidasiHariIni ?? 0}
          icon={<CheckCircle size={16} className="text-green-600" />}
          color="green"
          loading={dashLoading}
        />
      </div>

      {/* Loading / error */}
      {listLoading && (
        <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          Memuat daftar review…
        </div>
      )}
      {listError && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={13} />
          Gagal memuat daftar. Coba muat ulang halaman.
        </div>
      )}

      {/* Menunggu Review */}
      {!listLoading && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Menunggu Review</CardTitle>
              {menungguList.length > 0 && (
                <Badge variant="warning" className="text-[10px] px-2 py-0">
                  {menungguList.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {menungguList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
                <p className="text-xs text-slate-400">Tidak ada hasil yang menunggu review.</p>
              </div>
            ) : (
              menungguList.map((s) => <ReviewRow key={s.id} sample={s} />)
            )}
          </CardContent>
        </Card>
      )}

      {/* Minta Cek Ulang */}
      {!listLoading && cekUlangList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Minta Cek Ulang</CardTitle>
              <Badge variant="outline" className="text-[10px] px-2 py-0 text-amber-600 border-amber-300">
                {cekUlangList.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {cekUlangList.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/samples/${s.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-mono text-xs font-semibold text-slate-700">{s.sampleCode}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {s.requestedTest}
                    {s.department ? ` · ${s.department}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDate(s.createdAt)}</p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={s.priority} />
                  <StatusBadge status={s.status} />
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-slate-400">
        Untuk tindakan lanjut (cek ulang dengan catatan, batalkan), buka halaman detail sampel.{' '}
        <button
          className="text-teal-600 hover:underline"
          onClick={() => navigate('/samples')}
        >
          Lihat semua sampel →
        </button>
      </p>
    </div>
  );
}
