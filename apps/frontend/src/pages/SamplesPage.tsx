import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, FlaskConical, Loader2, Plus, Search } from 'lucide-react';
import { SamplePriority, SampleStatus } from '@labcermat/shared-types';
import { useAuth } from '@/contexts/AuthContext';
import { useSamples } from '@/hooks/useSamples';
import { SampleForm } from '@/components/samples/SampleForm';
import { PriorityBadge } from '@/components/samples/PriorityBadge';
import { StatusBadge } from '@/components/samples/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ─── Filter tabs config ────────────────────────────────────────

const STATUS_TABS: { label: string; value: SampleStatus | undefined }[] = [
  { label: 'Semua',             value: undefined },
  { label: 'Menunggu',          value: SampleStatus.MENUNGGU_PEMERIKSAAN },
  { label: 'Dalam Proses',      value: SampleStatus.DALAM_PROSES },
  { label: 'Menunggu Review',   value: SampleStatus.MENUNGGU_REVIEW },
  { label: 'Tervalidasi',       value: SampleStatus.TERVALIDASI },
  { label: 'Minta Cek Ulang',   value: SampleStatus.MINTA_CEK_ULANG },
];

const PRIORITY_OPTIONS: { label: string; value: SamplePriority | undefined }[] = [
  { label: 'Semua Prioritas', value: undefined },
  { label: 'CITO',            value: SamplePriority.CITO },
  { label: 'Urgent',          value: SamplePriority.URGENT },
  { label: 'Rutin',           value: SamplePriority.RUTIN },
];

// ─── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Empty state ───────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="rounded-full bg-slate-100 p-4">
        <FlaskConical size={24} className="text-slate-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-600">
          {filtered ? 'Tidak ada sampel dengan filter ini' : 'Belum ada sampel'}
        </p>
        <p className="text-xs text-slate-400">
          {filtered
            ? 'Coba ubah filter untuk melihat sampel lainnya'
            : 'Daftarkan sampel pertama dengan tombol Tambah Sampel'}
        </p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export function SamplesPage() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const isAnalis = appUser?.role.name === 'analis';

  const [showForm, setShowForm]       = useState(false);
  const [statusFilter, setStatusFilter]     = useState<SampleStatus | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<SamplePriority | undefined>(undefined);
  const [page, setPage]               = useState(1);

  const LIMIT = 20;

  const { data, isLoading, isError, error } = useSamples({
    status: statusFilter,
    priority: priorityFilter,
    page,
    limit: LIMIT,
  });

  const samples   = data?.data ?? [];
  const meta      = data?.meta;
  const isFiltered = statusFilter !== undefined || priorityFilter !== undefined;

  function handleStatusTab(value: SampleStatus | undefined) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePriorityFilter(value: SamplePriority | undefined) {
    setPriorityFilter(value);
    setPage(1);
  }

  const apiError =
    (error?.response?.data as { message?: string })?.message ??
    (isError ? 'Gagal memuat daftar sampel.' : null);

  return (
    <>
      {/* Modal form */}
      {showForm && <SampleForm onClose={() => setShowForm(false)} />}

      <div className="space-y-5">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Sampel</h2>
            <p className="text-sm text-slate-500">Daftar dan manajemen sampel laboratorium</p>
          </div>
          {isAnalis && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={15} />
              Tambah Sampel
            </Button>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={String(tab.value)}
                onClick={() => handleStatusTab(tab.value)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === tab.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority select */}
          <div className="flex items-center gap-2">
            <Search size={13} className="shrink-0 text-slate-400" />
            <select
              value={priorityFilter ?? ''}
              onChange={(e) =>
                handlePriorityFilter(
                  e.target.value ? (e.target.value as SamplePriority) : undefined,
                )
              }
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={String(o.value)} value={o.value ?? ''}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Content ── */}
        <Card>
          {/* Loading */}
          {isLoading && (
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </CardContent>
          )}

          {/* Error */}
          {!isLoading && isError && (
            <CardContent className="py-10">
              <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                <AlertCircle size={15} />
                <span>{apiError}</span>
              </div>
            </CardContent>
          )}

          {/* Empty */}
          {!isLoading && !isError && samples.length === 0 && (
            <CardContent className="p-0">
              <EmptyState filtered={isFiltered} />
            </CardContent>
          )}

          {/* Table */}
          {!isLoading && !isError && samples.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-3">Kode Sampel</th>
                    <th className="px-4 py-3">Jenis Sampel</th>
                    <th className="hidden px-4 py-3 md:table-cell">Pemeriksaan</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Departemen</th>
                    <th className="px-4 py-3">Prioritas</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Tanggal</th>
                    <th className="px-4 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {samples.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => navigate(`/samples/${s.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">
                        {s.sampleCode}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{s.sampleType}</td>
                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                        {s.requestedTest}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                        {s.department ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={s.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-slate-400 sm:table-cell">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight size={15} className="ml-auto text-slate-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !isError && meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} dari {meta.total} sampel
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  ‹ Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.totalPages}
                >
                  Berikutnya ›
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Total info */}
        {!isLoading && !isError && meta && (
          <p className="text-xs text-slate-400">
            {meta.total} sampel ditemukan
            {isFiltered ? ' dengan filter aktif' : ''}
          </p>
        )}
      </div>
    </>
  );
}
