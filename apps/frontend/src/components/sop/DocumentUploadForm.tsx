import { useRef, useState } from 'react';
import { FileUp, Loader2, UploadCloud } from 'lucide-react';
import { useUploadSopDocument } from '@/hooks/useSopDocuments';
import { Button } from '@/components/ui/button';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function DocumentUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadSopDocument();

  function handleFileChange(f: File | null) {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      alert('Hanya file PDF yang diizinkan.');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      alert('Ukuran file maksimal 5 MB.');
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChange(dropped);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    upload.mutate(
      { file, title: title.trim() || undefined },
      {
        onSuccess: () => {
          setFile(null);
          setTitle('');
          if (inputRef.current) inputRef.current.value = '';
        },
      },
    );
  }

  const errorMessage =
    (upload.error?.response?.data as { message?: string })?.message ??
    upload.error?.message ??
    'Gagal mengunggah dokumen.';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition',
          dragOver
            ? 'border-teal-400 bg-teal-50'
            : file
              ? 'border-teal-300 bg-teal-50/40'
              : 'border-slate-200 bg-slate-50 hover:border-teal-300',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <FileUp size={20} className="text-teal-500" />
            <p className="text-xs font-medium text-teal-700">{file.name}</p>
            <p className="text-[10px] text-slate-400">
              {(file.size / 1024).toFixed(0)} KB — klik untuk ganti
            </p>
          </>
        ) : (
          <>
            <UploadCloud size={20} className="text-slate-300" />
            <p className="text-xs text-slate-500">
              Drag & drop PDF atau <span className="font-medium text-teal-600">klik untuk pilih</span>
            </p>
            <p className="text-[10px] text-slate-400">Maks. 5 MB</p>
          </>
        )}
      </div>

      {/* Title input */}
      {file && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Judul dokumen <span className="text-slate-400">(opsional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder={file.name.replace(/\.pdf$/i, '')}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      )}

      {/* Error */}
      {upload.isError && (
        <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Success */}
      {upload.isSuccess && (
        <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
          Dokumen berhasil diindeks.
        </div>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={!file || upload.isPending}
        className="w-full"
      >
        {upload.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <UploadCloud size={14} />
        )}
        {upload.isPending ? 'Memproses…' : 'Upload & Indeks SOP'}
      </Button>
    </form>
  );
}
