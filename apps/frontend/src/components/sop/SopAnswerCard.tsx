import { AlertCircle, BookOpen, FileSearch, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SopSource, SopQuestionResult } from '@/hooks/useSop';

// ─── Mode badge ────────────────────────────────────────────────

const MODE_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' | 'outline' }
> = {
  groq_llm:              { label: 'Groq LLaMA',             variant: 'default'     },
  template_bm25:         { label: 'Template + Azure Search', variant: 'default'   },
  fallback_template_bm25:{ label: 'Fallback Template',       variant: 'warning'   },
  no_relevant_source:    { label: 'Tidak ada sumber',        variant: 'secondary' },
  search_unavailable:    { label: 'Search unavailable',      variant: 'warning'   },
  search_error:          { label: 'Search error',            variant: 'destructive' },
  validation_error:      { label: 'Input tidak valid',       variant: 'outline'   },
};

function ModeBadge({ mode }: { mode: string }) {
  const cfg = MODE_CONFIG[mode] ?? { label: mode, variant: 'outline' as const };
  return (
    <Badge variant={cfg.variant} className="text-[10px] px-2 py-0">
      {cfg.label}
    </Badge>
  );
}

// ─── Source card ───────────────────────────────────────────────

function SourceItem({ source, index }: { source: SopSource; index: number }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileSearch size={12} className="shrink-0 text-teal-500" />
          <span className="truncate text-xs font-medium text-slate-700">{source.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {source.source_page != null && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
              hal. {source.source_page}
            </span>
          )}
          {source.score != null && (
            <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-medium text-teal-600 ring-1 ring-teal-100">
              {source.score.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {source.section && (
        <p className="mt-0.5 text-[10px] text-slate-400">{source.section}</p>
      )}

      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
        {source.snippet}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">Chunk #{index + 1}</p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────

interface SopAnswerCardProps {
  result: SopQuestionResult;
}

export function SopAnswerCard({ result }: SopAnswerCardProps) {
  const hasAnswer  = result.mode === 'groq_llm' || result.mode === 'template_bm25' || result.mode === 'fallback_template_bm25';
  const hasSources = result.sources.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Jawaban SOP</CardTitle>
            <ModeBadge mode={result.mode} />
          </div>
          <BookOpen size={15} className="text-slate-300" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Answer text */}
        {hasAnswer ? (
          <div className="space-y-1">
            {result.answer.split('\n').map((line, i) => {
              if (line.trim() === '') return <div key={i} className="h-1" />;
              return (
                <p key={i} className="text-xs leading-relaxed text-slate-700">
                  {line}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-slate-600">{result.answer}</p>
        )}

        {/* Fallback reason */}
        {result.fallback_reason && (
          <div className="flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50 px-3 py-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-[11px] text-amber-700">{result.fallback_reason}</p>
          </div>
        )}

        {/* Sources */}
        {hasSources && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Sumber ({result.sources.length})
            </p>
            {result.sources.map((src, i) => (
              <SourceItem key={`${src.document_id}-${src.chunk_index}`} source={src} index={i} />
            ))}
          </div>
        )}

        {/* Safety note */}
        <div className="flex items-start gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
          <ShieldAlert size={12} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-[10px] leading-relaxed text-slate-400">{result.safety_note}</p>
        </div>
      </CardContent>
    </Card>
  );
}
