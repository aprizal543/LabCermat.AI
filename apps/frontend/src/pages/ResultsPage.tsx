import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronRight,
  ClipboardList,
  Loader2,
  Microscope,
} from 'lucide-react';
import { SampleStatus } from '@labcermat/shared-types';
import { useSamples } from '@/hooks/useSamples';
import { PriorityBadge } from '@/components/samples/PriorityBadge';
import { StatusBadge } from '@/components/samples/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ResultsPage() {
  const navigate = useNavigate();

  const dalamProses = useSamples({ status: SampleStatus.DALAM_PROSES, limit: 20 });
  const menungguReview = useSamples({ status: SampleStatus.MENUNGGU_REVIEW, limit: 20 });

  const dpList = dalamProses.data?.data ?? [];
  const mrList = menungguReview.data?.data ?? [];
  const isLoading = dalamProses.isLoading || menungguReview.isLoading;
  const isError = dalamProses.isError || menungguReview.isError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Analisis Hasil</h2>
        <p className="text-sm text-slate-500">
          Input hasil pemeriksaan dilakukan dari halaman detail setiap sampel.
        </p>
      </div>

      {/* How-to banner */}
      <div className="flex items-start gap-3 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
        <ClipboardList size={15} className="mt-0.5 shrink-0 text-teal-600" />
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-teal-800">Cara input hasil pemeriksaan</p>
          <p className="text-[11px] text-teal-700">
            Buka sampel dari daftar di bawah → klik <strong>Tambah Hasil</strong> di tab Hasil
            Pemeriksaan → isi nilai parameter → simpan.
            Supervisor dapat memvalidasi atau meminta cek ulang dari halaman yang sama.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-xs text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          Memuat daftar sampel…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={13} />
          Gagal memuat daftar sampel.
        </div>
      )}

      {!isLoading && !isError && dpList.length === 0 && mrList.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <Microscope size={24} className="text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">
                Tidak ada sampel yang perlu input hasil saat ini
              </p>
              <p className="text-xs text-slate-400">
                Sampel dengan status <strong>Dalam Proses</strong> akan muncul di sini.
              </p>
            </div>
            <button
              onClick={() => navigate('/samples')}
              className="mt-1 text-xs text-teal-600 hover:underline"
            >
              Lihat semua sampel →
            </button>
          </CardContent>
        </Card>
      )}

      {/* Dalam Proses */}
      {!isLoading && dpList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Dalam Proses — Perlu Input Hasil</CardTitle>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {dpList.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {dpList.map((s) => (
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

      {/* Menunggu Review */}
      {!isLoading && mrList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Menunggu Review Supervisor</CardTitle>
              <span className="rounded-full bg-clinical-100 px-2.5 py-0.5 text-[10px] font-semibold text-clinical-700">
                {mrList.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {mrList.map((s) => (
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
        Lihat semua sampel dengan status lain di halaman{' '}
        <button
          className="text-teal-600 hover:underline"
          onClick={() => navigate('/samples')}
        >
          Sampel
        </button>
        .
      </p>
    </div>
  );
}
