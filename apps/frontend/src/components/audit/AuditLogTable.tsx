import { useState } from 'react';
import { AlertCircle, Loader2, Activity } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import type { GetAuditLogsQuery, AuditLog } from '@/hooks/useAuditLogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// ─── Action badge ──────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  'sample.create':              { label: 'Buat Sampel',     variant: 'default'     },
  'sample.status_change':       { label: 'Ubah Status',     variant: 'secondary'   },
  'result.create':              { label: 'Input Hasil',     variant: 'default'     },
  'qc.create':                  { label: 'Catat QC',        variant: 'success'     },
  'supervisor.validate':        { label: 'Validasi',        variant: 'success'     },
  'supervisor.request_recheck': { label: 'Minta Cek Ulang', variant: 'warning'     },
  'supervisor.cancel':          { label: 'Batalkan',        variant: 'destructive' },
  'supervisor.status_change':   { label: 'Ubah Status',     variant: 'secondary'   },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action];
  if (cfg) {
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  }
  // Fallback: tampilkan action raw dengan format lebih rapi
  const parts = action.split('.');
  const label = parts.length === 2
    ? `${parts[0]} · ${parts[1].replace(/_/g, ' ')}`
    : action;
  return <Badge variant="outline" className="font-mono text-[10px]">{label}</Badge>;
}

// ─── Metadata ringkas ──────────────────────────────────────────

function MetadataPreview({ log }: { log: AuditLog }) {
  const m = log.metadata;
  if (!m) return <span className="text-slate-300">—</span>;

  // Sample actions
  if (log.action === 'sample.create' && m.sampleCode) {
    return <span className="font-mono text-xs">{String(m.sampleCode)}</span>;
  }
  if ((log.action === 'sample.status_change' || log.action.startsWith('supervisor.')) && m.from && m.to) {
    return (
      <span className="text-xs text-slate-500">
        {String(m.from).replace(/_/g, ' ')}
        {' → '}
        {String(m.to).replace(/_/g, ' ')}
        {m.note ? <span className="ml-1 text-slate-400">· {String(m.note)}</span> : null}
      </span>
    );
  }
  // Result
  if (log.action === 'result.create' && m.parameterName) {
    return (
      <span className="text-xs text-slate-500">
        {String(m.parameterName)}: {String(m.value ?? '—')}
      </span>
    );
  }
  // QC
  if (log.action === 'qc.create' && m.controlType) {
    return (
      <span className="text-xs text-slate-500">
        {String(m.controlType)} = {String(m.controlValue ?? '—')}
        {m.instrumentName ? <span className="ml-1 text-slate-400">· {String(m.instrumentName)}</span> : null}
      </span>
    );
  }
  // Generic: tampilkan key-value pertama yang bermakna
  const entries = Object.entries(m).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return <span className="text-slate-300">—</span>;
  const [key, val] = entries[0];
  return (
    <span className="text-xs text-slate-400 font-mono">
      {key}: {String(val)}
    </span>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Empty state ───────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="rounded-full bg-slate-100 p-4">
        <Activity size={24} className="text-slate-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-600">
          {filtered ? 'Tidak ada aktivitas dengan filter ini' : 'Belum ada aktivitas tercatat'}
        </p>
        <p className="text-xs text-slate-400">
          {filtered ? 'Coba ubah filter untuk melihat aktivitas lainnya' : 'Aktivitas akan muncul setelah ada tindakan dalam sistem'}
        </p>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────

export function AuditLogTable() {
  const [actionFilter, setActionFilter]         = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFrom, setDateFrom]                 = useState('');
  const [dateTo, setDateTo]                     = useState('');
  const [page, setPage]                         = useState(1);

  const LIMIT = 20;

  const query: GetAuditLogsQuery = {
    action:     actionFilter     || undefined,
    entityType: entityTypeFilter || undefined,
    dateFrom:   dateFrom         || undefined,
    dateTo:     dateTo           || undefined,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, error } = useAuditLogs(query);

  const logs       = data?.data ?? [];
  const meta       = data?.meta;
  const isFiltered = !!actionFilter || !!entityTypeFilter || !!dateFrom || !!dateTo;

  function resetFilters() {
    setActionFilter('');
    setEntityTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const apiError =
    (error?.response?.data as { message?: string })?.message ??
    (isError ? 'Gagal memuat riwayat aktivitas.' : null);

  const inputCls = 'rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500';

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Action filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className={inputCls}
          >
            <option value="">Semua Action</option>
            <option value="sample.create">Buat Sampel</option>
            <option value="sample.status_change">Ubah Status Sampel</option>
            <option value="result.create">Input Hasil</option>
            <option value="qc.create">Catat QC</option>
            <option value="supervisor.validate">Validasi</option>
            <option value="supervisor.request_recheck">Minta Cek Ulang</option>
            <option value="supervisor.cancel">Batalkan Sampel</option>
          </select>
        </div>

        {/* Entity type filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Entitas</label>
          <select
            value={entityTypeFilter}
            onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
            className={inputCls}
          >
            <option value="">Semua Entitas</option>
            <option value="samples">Sampel</option>
            <option value="sample_results">Hasil Pemeriksaan</option>
            <option value="qc_records">QC</option>
          </select>
        </div>

        {/* Date range */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Dari</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Sampai</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className={inputCls}
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

        {!isLoading && !isError && logs.length === 0 && (
          <EmptyState filtered={isFiltered} />
        )}

        {!isLoading && !isError && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="hidden px-4 py-3 md:table-cell">Detail</th>
                  <th className="hidden px-4 py-3 sm:table-cell">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <MetadataPreview log={log} />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {log.user ? (
                        <div>
                          <p className="text-xs font-medium text-slate-700">{log.user.fullName}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{log.user.role.name}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">Sistem</span>
                      )}
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
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} dari {meta.total} aktivitas
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
          {meta.total} aktivitas ditemukan{isFiltered ? ' dengan filter aktif' : ''}
        </p>
      )}
    </div>
  );
}
