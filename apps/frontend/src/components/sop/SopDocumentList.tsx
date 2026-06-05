import { useState } from 'react';
import { FileText, Loader2, Trash2, TriangleAlert } from 'lucide-react';
import { useDeleteSopDocument } from '@/hooks/useSopDocuments';
import type { SopDocument, SopDocumentStatus } from '@/hooks/useSopDocuments';
import { Badge } from '@/components/ui/badge';

// ─── Status badge ──────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SopDocumentStatus,
  { label: string; variant: 'success' | 'default' | 'secondary' | 'warning' | 'destructive' }
> = {
  indexed:  { label: 'Terindeks',  variant: 'success'     },
  parsed:   { label: 'Diparsing',  variant: 'default'     },
  pending:  { label: 'Pending',    variant: 'secondary'   },
  failed:   { label: 'Gagal',      variant: 'destructive' },
};

function StatusBadge({ status }: { status: SopDocumentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">{cfg.label}</Badge>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Document row ──────────────────────────────────────────────

function DocRow({ doc }: { doc: SopDocument }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMut = useDeleteSopDocument();

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteMut.mutate(doc.id, { onSettled: () => setConfirmDelete(false) });
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3.5 py-3">
      <FileText size={16} className="mt-0.5 shrink-0 text-slate-300" />

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="truncate text-xs font-medium text-slate-800">{doc.title}</span>
          <StatusBadge status={doc.status} />
          {doc.status === 'indexed' && (
            <span className="text-[10px] text-slate-400">
              {doc.chunkCount} chunk
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-400 truncate">{doc.originalFilename}</p>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span>{formatBytes(doc.sizeBytes)}</span>
          <span>·</span>
          <span>{doc.uploadedBy.fullName}</span>
          <span>·</span>
          <span>
            {new Date(doc.createdAt).toLocaleDateString('id-ID', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </span>
        </div>

        {doc.status === 'failed' && doc.errorMessage && (
          <div className="flex items-start gap-1 mt-1">
            <TriangleAlert size={10} className="mt-0.5 shrink-0 text-red-400" />
            <p className="text-[10px] text-red-500 leading-tight">{doc.errorMessage}</p>
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleteMut.isPending}
        title={confirmDelete ? 'Klik lagi untuk konfirmasi hapus' : 'Hapus dokumen'}
        className={[
          'flex h-6 w-6 shrink-0 items-center justify-center rounded transition',
          confirmDelete
            ? 'bg-red-50 text-red-500 ring-1 ring-red-200'
            : 'text-slate-300 hover:bg-red-50 hover:text-red-400',
        ].join(' ')}
      >
        {deleteMut.isPending
          ? <Loader2 size={12} className="animate-spin" />
          : <Trash2 size={12} />
        }
      </button>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────

interface SopDocumentListProps {
  documents: SopDocument[];
  isLoading?: boolean;
}

export function SopDocumentList({ documents, isLoading }: SopDocumentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
        <Loader2 size={13} className="animate-spin" />
        Memuat daftar dokumen…
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
        <FileText size={20} className="mx-auto mb-2 text-slate-200" />
        <p className="text-xs text-slate-500">Belum ada dokumen SOP.</p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          Upload SOP PDF terlebih dahulu agar Asisten SOP memiliki sumber.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <DocRow key={doc.id} doc={doc} />
      ))}
    </div>
  );
}
