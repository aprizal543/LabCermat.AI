import { useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { QcStatus } from '@labcermat/shared-types';
import { useQcRecords, useQcInstruments } from '@/hooks/useQc';
import type { GetQcRecordsQuery } from '@/hooks/useQc';
import { QcStatusBadge } from './QcStatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// ─── Helpers ───────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Empty state ───────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="rounded-full bg-slate-100 p-4">
        <ShieldCheck size={24} className="text-slate-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-600">
          {filtered ? 'Tidak ada catatan QC dengan filter ini' : 'Belum ada catatan QC'}
        </p>
        <p className="text-xs text-slate-400">
          {filtered
            ? 'Coba ubah filter untuk melihat catatan lainnya'
            : 'Tambahkan catatan QC pertama dengan tombol Tambah QC'}
        </p>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────

export function QcTable() {
  const [statusFilter, setStatusFilter]     = useState<QcStatus | undefined>(undefined);
  const [instrumentFilter, setInstrumentFilter] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom]             = useState('');
  const [dateTo, setDateTo]                 = useState('');
  const [page, setPage]                     = useState(1);

  const LIMIT = 20;

  const query: GetQcRecordsQuery = {
    status:       statusFilter,
    instrumentId: instrumentFilter,
    dateFrom:     dateFrom || undefined,
    dateTo:       dateTo   || undefined,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, error } = useQcRecords(query);
  const { data: instrumentsData }           = useQcInstruments();

  const records    = data?.data ?? [];
  const meta       = data?.meta;
  const instruments = instrumentsData?.data ?? [];
  const isFiltered = statusFilter !== undefined || instrumentFilter !== undefined || !!dateFrom || !!dateTo;

  function resetFilters() {
    setStatusFilter(undefined);
    setInstrumentFilter(undefined);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const apiError =
    (error?.response?.data as { message?: string })?.message ??
    (isError ? 'Gagal memuat catatan QC.' : null);

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Status filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Status</label>
          <div className="flex gap-1">
            {[
              { label: 'Semua',            value: undefined },
              { label: 'Stabil',           value: QcStatus.STABIL },
              { label: 'Perlu Perhatian',  value: QcStatus.PERLU_PERHATIAN },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === opt.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instrument filter */}
        {instruments.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Alat</label>
            <select
              value={instrumentFilter ?? ''}
              onChange={(e) => { setInstrumentFilter(e.target.value || undefined); setPage(1); }}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Semua Alat</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date range */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Dari</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Sampai</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {isFiltered && (
          <button
            onClick={resetFilters}
            className="pb-0.5 text-xs text-teal-600 hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* ── Table card ── */}
      <Card>
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-red-500">
            <AlertCircle size={15} />
            <span>{apiError}</span>
          </div>
        )}

        {!isLoading && !isError && records.length === 0 && (
          <EmptyState filtered={isFiltered} />
        )}

        {!isLoading && !isError && records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Alat</th>
                  <th className="px-4 py-3">Tipe Kontrol</th>
                  <th className="px-4 py-3">Nilai</th>
                  <th className="hidden px-4 py-3 md:table-cell">Rentang</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Waktu</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Dicatat oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-700">{r.instrument.name}</p>
                      {r.instrument.department && (
                        <p className="text-[11px] text-slate-400">{r.instrument.department}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.controlType}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {r.controlValue}
                      {r.unit && (
                        <span className="ml-1 text-xs text-slate-400">{r.unit}</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-slate-500 md:table-cell">
                      {r.lowerLimit} – {r.upperLimit}
                      {r.unit && (
                        <span className="ml-1 text-slate-400">{r.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <QcStatusBadge status={r.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-400 sm:table-cell">
                      {formatDateTime(r.recordedAt)}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
                      {r.recorder.fullName}
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
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} dari {meta.total} catatan
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

      {!isLoading && !isError && meta && (
        <p className="text-xs text-slate-400">
          {meta.total} catatan ditemukan{isFiltered ? ' dengan filter aktif' : ''}
        </p>
      )}
    </div>
  );
}
