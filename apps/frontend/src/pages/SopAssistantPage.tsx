import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Loader2, Search, Upload } from 'lucide-react';
import { useAskSopQuestion } from '@/hooks/useSop';
import { useSopDocuments } from '@/hooks/useSopDocuments';
import { SopAnswerCard } from '@/components/sop/SopAnswerCard';
import { DocumentUploadForm } from '@/components/sop/DocumentUploadForm';
import { SopDocumentList } from '@/components/sop/SopDocumentList';
import { Button } from '@/components/ui/button';

// ─── Example questions ─────────────────────────────────────────

const EXAMPLE_QUESTIONS = [
  'Apa yang dilakukan jika QC di luar batas?',
  'Bagaimana prosedur minta cek ulang?',
  'Kapan supervisor perlu melakukan validasi?',
];

const TOP_K_OPTIONS = [3, 5, 10] as const;

// ─── Page ──────────────────────────────────────────────────────

export function SopAssistantPage() {
  const [question, setQuestion]         = useState('');
  const [topK, setTopK]                 = useState<3 | 5 | 10>(5);
  const [docsExpanded, setDocsExpanded] = useState(false);

  const ask  = useAskSopQuestion();
  const docs = useSopDocuments();

  const docCount   = docs.data?.data?.length ?? 0;
  const hasIndexed = docs.data?.data?.some((d) => d.status === 'indexed') ?? false;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    ask.mutate({ question: q, topK });
  }

  const errorMessage =
    (ask.error?.response?.data as { message?: string })?.message ??
    ask.error?.message ??
    'Gagal menghubungi layanan SOP.';

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
          <BookOpen size={18} className="text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Asisten SOP</h2>
          <p className="text-sm text-slate-500">
            Tanyakan prosedur operasional berdasarkan SOP yang terindeks.
          </p>
        </div>
      </div>

      {/* ── No indexed document warning ── */}
      {!docs.isLoading && !hasIndexed && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5">
          <Upload size={14} className="shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">
            Belum ada dokumen SOP yang terindeks. Upload SOP PDF terlebih dahulu agar
            Asisten SOP memiliki sumber.
          </p>
        </div>
      )}

      {/* ── Question form ── */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="sop-question"
            className="block text-xs font-semibold text-slate-600"
          >
            Pertanyaan
          </label>
          <textarea
            id="sop-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ketik pertanyaan tentang SOP laboratorium…"
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* topK + submit row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="sop-topk"
              className="text-xs font-medium text-slate-500 whitespace-nowrap"
            >
              Jumlah sumber
            </label>
            <select
              id="sop-topk"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value) as 3 | 5 | 10)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {TOP_K_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={ask.isPending || question.trim().length < 3}
            className="ml-auto"
          >
            {ask.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            {ask.isPending ? 'Mencari…' : 'Tanya SOP'}
          </Button>
        </div>

        {/* Error banner */}
        {ask.isError && (
          <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {errorMessage}
          </div>
        )}
      </form>

      {/* ── Empty state with examples ── */}
      {!ask.data && !ask.isPending && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Contoh pertanyaan
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-teal-300 hover:text-teal-700 hover:shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {ask.data && (
        <SopAnswerCard result={ask.data.data} />
      )}

      {/* ── Documents section (collapsible) ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setDocsExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left"
        >
          <div className="flex items-center gap-2">
            <Upload size={15} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Dokumen SOP</span>
            {docCount > 0 && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                {docCount}
              </span>
            )}
          </div>
          {docsExpanded
            ? <ChevronUp size={15} className="text-slate-400" />
            : <ChevronDown size={15} className="text-slate-400" />
          }
        </button>

        {docsExpanded && (
          <div className="space-y-4 border-t border-slate-100 px-5 py-4">
            {/* Upload form */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">Upload Dokumen Baru</p>
              <DocumentUploadForm />
            </div>

            {/* Document list */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">Dokumen Terindeks</p>
              <SopDocumentList
                documents={docs.data?.data ?? []}
                isLoading={docs.isLoading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
