import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { SampleStatus } from '@labcermat/shared-types';
import { useAuth } from '@/contexts/AuthContext';
import { useSampleDetail, useUpdateSampleStatus } from '@/hooks/useSamples';
import { PriorityBadge } from '@/components/samples/PriorityBadge';
import { ResultsSection } from '@/components/samples/ResultsSection';
import { StatusBadge } from '@/components/samples/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Info row ──────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="w-36 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{children}</span>
    </div>
  );
}

// ─── Timeline entry ────────────────────────────────────────────

function TimelineEntry({
  isFirst,
  isLast,
  previousStatus,
  newStatus,
  changedByUser,
  note,
  createdAt,
}: {
  isFirst: boolean;
  isLast: boolean;
  previousStatus: SampleStatus | null;
  newStatus: SampleStatus;
  changedByUser: { fullName: string };
  note: string | null;
  createdAt: string;
}) {
  return (
    <div className="flex gap-3">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500 ring-2 ring-teal-100" />
        {!isLast && <div className="mt-1 w-px flex-1 bg-slate-200" />}
      </div>

      {/* Content */}
      <div className={isLast ? 'pb-0' : 'pb-4'}>
        <div className="flex flex-wrap items-center gap-2">
          {isFirst ? (
            <span className="text-xs font-medium text-slate-700">Sampel didaftarkan</span>
          ) : (
            <>
              <StatusBadge status={previousStatus!} className="text-[10px] py-0" />
              <span className="text-xs text-slate-400">→</span>
              <StatusBadge status={newStatus} className="text-[10px] py-0" />
            </>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {changedByUser.fullName} · {formatDateTime(createdAt)}
        </p>
        {note && (
          <p className="mt-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Action button ─────────────────────────────────────────────

function ActionSection({
  sampleId,
  status,
}: {
  sampleId: string;
  status: SampleStatus;
}) {
  const updateStatus = useUpdateSampleStatus();

  const ACTION_MAP: Partial<
    Record<
      SampleStatus,
      { label: string; next: SampleStatus; variant: 'default' | 'outline'; icon: React.ReactNode }
    >
  > = {
    [SampleStatus.MENUNGGU_PEMERIKSAAN]: {
      label: 'Mulai Proses',
      next: SampleStatus.DALAM_PROSES,
      variant: 'default',
      icon: <Clock size={14} />,
    },
    [SampleStatus.DALAM_PROSES]: {
      label: 'Kirim ke Review',
      next: SampleStatus.MENUNGGU_REVIEW,
      variant: 'default',
      icon: <CheckCircle2 size={14} />,
    },
    [SampleStatus.MINTA_CEK_ULANG]: {
      label: 'Mulai Proses Ulang',
      next: SampleStatus.DALAM_PROSES,
      variant: 'outline',
      icon: <RefreshCw size={14} />,
    },
  };

  const action = ACTION_MAP[status];
  if (!action) return null;

  const apiError =
    (updateStatus.error?.response?.data as { message?: string })?.message ??
    (updateStatus.isError ? 'Gagal mengubah status. Coba lagi.' : null);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-slate-700">Aksi Selanjutnya</p>
            <p className="text-xs text-slate-500">
              {status === SampleStatus.MENUNGGU_PEMERIKSAAN &&
                'Mulai pemeriksaan untuk sampel ini'}
              {status === SampleStatus.DALAM_PROSES &&
                'Kirim ke supervisor setelah pemeriksaan selesai'}
              {status === SampleStatus.MINTA_CEK_ULANG &&
                'Supervisor meminta pemeriksaan diulang'}
            </p>
          </div>

          <Button
            variant={action.variant}
            size="sm"
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({ id: sampleId, status: action.next })
            }
            className="shrink-0"
          >
            {updateStatus.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              action.icon
            )}
            {updateStatus.isPending ? 'Memproses…' : action.label}
          </Button>
        </div>

        {apiError && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={12} />
            <span>{apiError}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Supervisor action section ─────────────────────────────────

function SupervisorActionSection({
  sampleId,
  status,
}: {
  sampleId: string;
  status: SampleStatus;
}) {
  const updateStatus = useUpdateSampleStatus();

  // Which inline panel is open: null | 'cek_ulang' | 'batalkan'
  const [panel, setPanel] = useState<'cek_ulang' | 'batalkan' | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const TERMINAL: SampleStatus[] = [SampleStatus.TERVALIDASI, SampleStatus.DIBATALKAN];
  if (TERMINAL.includes(status)) return null;

  const canReview  = status === SampleStatus.MENUNGGU_REVIEW;
  const canCancel  = !TERMINAL.includes(status);

  const apiError =
    (updateStatus.error?.response?.data as { message?: string })?.message ??
    (updateStatus.isError ? 'Gagal mengubah status. Coba lagi.' : null);

  function openPanel(p: 'cek_ulang' | 'batalkan') {
    setPanel(p);
    setNote('');
    setNoteError('');
    updateStatus.reset();
  }

  function closePanel() {
    setPanel(null);
    setNote('');
    setNoteError('');
  }

  function handleValidasi() {
    updateStatus.mutate({ id: sampleId, status: SampleStatus.TERVALIDASI });
  }

  function handleInlineSubmit(targetStatus: SampleStatus) {
    if (!note.trim()) {
      setNoteError(
        targetStatus === SampleStatus.MINTA_CEK_ULANG
          ? 'Catatan wajib diisi saat meminta cek ulang'
          : 'Alasan pembatalan wajib diisi',
      );
      return;
    }
    updateStatus.mutate(
      { id: sampleId, status: targetStatus, note: note.trim() },
      { onSuccess: closePanel },
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs font-medium text-slate-700">Aksi Supervisor</p>

        {/* Button row */}
        {!panel && (
          <div className="flex flex-wrap gap-2">
            {canReview && (
              <Button
                size="sm"
                disabled={updateStatus.isPending}
                onClick={handleValidasi}
                className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
              >
                {updateStatus.isPending && !panel ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                {updateStatus.isPending && !panel ? 'Memproses…' : 'Validasi'}
              </Button>
            )}
            {canReview && (
              <Button
                size="sm"
                variant="outline"
                disabled={updateStatus.isPending}
                onClick={() => openPanel('cek_ulang')}
                className="border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0"
              >
                <RefreshCw size={13} />
                Cek Ulang
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                disabled={updateStatus.isPending}
                onClick={() => openPanel('batalkan')}
                className="border-red-300 text-red-600 hover:bg-red-50 shrink-0"
              >
                <XCircle size={13} />
                Batalkan
              </Button>
            )}
          </div>
        )}

        {/* Inline Cek Ulang panel */}
        {panel === 'cek_ulang' && (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">
              Catatan Cek Ulang <span className="text-red-500">*</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
              placeholder="Jelaskan parameter yang perlu diperiksa ulang"
              rows={3}
              className="w-full resize-none rounded-md border border-amber-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
            {noteError && <p className="text-xs text-red-500">{noteError}</p>}
            {apiError && (
              <div className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertCircle size={12} />
                <span>{apiError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={closePanel}
                disabled={updateStatus.isPending}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => handleInlineSubmit(SampleStatus.MINTA_CEK_ULANG)}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {updateStatus.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                {updateStatus.isPending ? 'Memproses…' : 'Kirim Cek Ulang'}
              </Button>
            </div>
          </div>
        )}

        {/* Inline Batalkan panel */}
        {panel === 'batalkan' && (
          <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium text-red-800">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
              placeholder="Jelaskan alasan pembatalan sampel ini"
              rows={3}
              className="w-full resize-none rounded-md border border-red-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
            />
            {noteError && <p className="text-xs text-red-500">{noteError}</p>}
            {apiError && (
              <div className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertCircle size={12} />
                <span>{apiError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={closePanel}
                disabled={updateStatus.isPending}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={updateStatus.isPending}
                onClick={() => handleInlineSubmit(SampleStatus.DIBATALKAN)}
              >
                {updateStatus.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <XCircle size={13} />
                )}
                {updateStatus.isPending ? 'Memproses…' : 'Batalkan Sampel'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export function SampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const isAnalis = appUser?.role.name === 'analis';

  const { data, isLoading, isError, error } = useSampleDetail(id);
  const sample = data?.data;

  const apiError =
    (error?.response?.data as { message?: string })?.message ??
    (isError ? 'Gagal memuat detail sampel.' : null);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Error ──
  if (isError || !sample) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/samples')}>
          <ArrowLeft size={14} />
          Kembali ke Sampel
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <AlertCircle size={24} className="text-red-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Sampel tidak ditemukan</p>
              <p className="text-xs text-slate-400">{apiError}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLogs = sample.statusLogs ?? [];
  const isSupervisor = appUser?.role.name === 'supervisor';

  // ── Main ──
  return (
    <div className="space-y-5">
      {/* Back button + header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/samples')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={13} />
            Kembali ke Sampel
          </button>
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-50 p-2">
              <FlaskConical size={18} className="text-teal-600" />
            </div>
            <div>
              <h2 className="font-mono text-base font-semibold text-slate-800">
                {sample.sampleCode}
              </h2>
              <p className="text-xs text-slate-500">{sample.sampleType}</p>
            </div>
          </div>
        </div>

        {/* Status + priority di kanan */}
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={sample.status} />
          <PriorityBadge priority={sample.priority} />
        </div>
      </div>

      {/* Action card — hanya analis */}
      {isAnalis && (
        <ActionSection sampleId={sample.id} status={sample.status} />
      )}

      {/* Supervisor actions — hanya supervisor */}
      {isSupervisor && (
        <SupervisorActionSection sampleId={sample.id} status={sample.status} />
      )}

      {/* Info detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Informasi Sampel</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-slate-100">
            <InfoRow label="Jenis Sampel">{sample.sampleType}</InfoRow>
            <InfoRow label="Jenis Pemeriksaan">{sample.requestedTest}</InfoRow>
            <InfoRow label="Departemen">
              {sample.department ?? <span className="text-slate-400">—</span>}
            </InfoRow>
            <InfoRow label="Prioritas">
              <PriorityBadge priority={sample.priority} />
            </InfoRow>
            <InfoRow label="Status Saat Ini">
              <StatusBadge status={sample.status} />
            </InfoRow>
            <InfoRow label="Laboratorium">{sample.laboratory.name}</InfoRow>
            <InfoRow label="Didaftarkan oleh">{sample.creator.fullName}</InfoRow>
            <InfoRow label="Tanggal Masuk">{formatDate(sample.createdAt)}</InfoRow>
            {sample.notes && (
              <InfoRow label="Catatan">
                <span className="text-slate-600">{sample.notes}</span>
              </InfoRow>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hasil Pemeriksaan */}
      <ResultsSection
        sampleId={sample.id}
        status={sample.status}
        role={appUser?.role.name ?? ''}
      />

      {/* Status timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riwayat Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {statusLogs.length === 0 ? (
            <p className="text-xs text-slate-400">Belum ada riwayat status.</p>
          ) : (
            <div>
              {statusLogs.map((log, i) => (
                <TimelineEntry
                  key={log.id}
                  isFirst={i === 0}
                  isLast={i === statusLogs.length - 1}
                  previousStatus={log.previousStatus}
                  newStatus={log.newStatus}
                  changedByUser={log.changedByUser}
                  note={log.note}
                  createdAt={log.createdAt}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
