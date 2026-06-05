import { Bot, Loader2, TriangleAlert } from 'lucide-react';
import { useAiLog } from '@/hooks/useAi';
import type { QcAiMode, QcAiStatus, QcAnomalyResult } from '@/hooks/useAi';
import { Badge } from '@/components/ui/badge';

// ─── Status config ─────────────────────────────────────────────

const STATUS_CONFIG: Record<QcAiStatus, {
  label: string;
  variant: 'success' | 'warning' | 'destructive';
}> = {
  stabil:          { label: 'Stabil',          variant: 'success'     },
  perlu_perhatian: { label: 'Perlu Perhatian',  variant: 'warning'     },
  potensi_drift:   { label: 'Potensi Drift',    variant: 'destructive' },
};

// ─── Mode label ────────────────────────────────────────────────

function modeLabel(mode: QcAiMode): string {
  if (mode === 'azure_ml_artifact')  return 'Azure ML';
  if (mode === 'fallback_rule_based') return 'Fallback';
  return 'Operasional';
}

// ─── Component ─────────────────────────────────────────────────

interface AiAnomalyBadgeProps {
  recordId: string;
}

export function AiAnomalyBadge({ recordId }: AiAnomalyBadgeProps) {
  const { data, isLoading, isError, error } = useAiLog(recordId, 'qc_anomaly');

  const is404 = error?.response?.status === 404;

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-300">
        <Loader2 size={10} className="animate-spin" />
      </span>
    );
  }

  if (isError && is404) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-slate-300"
        title="AI belum tersedia"
      >
        <Bot size={10} />
        <span>—</span>
      </span>
    );
  }

  if (isError || !data) return null;

  const result = data.data?.responseData as QcAnomalyResult | undefined;
  if (!result?.status) return null;

  const cfg = STATUS_CONFIG[result.status];
  if (!cfg) return null;

  const isFallback   = result.mode === 'fallback_rule_based';
  const isAzureMl    = result.mode === 'azure_ml_artifact';
  const confidencePct = isAzureMl && result.confidence != null
    ? `${Math.round(result.confidence * 100)}%`
    : null;

  // Tooltip: show reason + fallback_reason if present
  const tooltipParts: string[] = [];
  if (result.reason) tooltipParts.push(result.reason);
  if (result.fallback_reason) tooltipParts.push(`(${result.fallback_reason})`);
  const tooltip = tooltipParts.join(' ');

  return (
    <span title={tooltip || undefined} className="inline-flex items-center gap-1 flex-wrap">
      {/* Status badge */}
      <Badge
        variant={isFallback ? 'outline' : cfg.variant}
        className="flex items-center gap-1 text-[10px] py-0 px-1.5 whitespace-nowrap"
      >
        {result.status === 'potensi_drift' && <TriangleAlert size={9} />}
        {cfg.label}
      </Badge>

      {/* Mode chip + confidence */}
      <span className={[
        'inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium leading-4',
        isFallback
          ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
          : isAzureMl
            ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
            : 'bg-slate-100 text-slate-500',
      ].join(' ')}>
        {modeLabel(result.mode)}
        {confidencePct && (
          <span className="ml-0.5 font-semibold">{confidencePct}</span>
        )}
      </span>
    </span>
  );
}
