import { useState } from 'react';
import { AlertCircle, Bot, CheckCircle2, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAiLog, useTriggerResultReview } from '@/hooks/useAi';
import type { FlagStatus, ResultReviewResult } from '@/hooks/useAi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Flag badge ────────────────────────────────────────────────

const FLAG_CONFIG: Record<FlagStatus, { label: string; variant: 'success' | 'warning' | 'destructive'; icon: React.ReactNode }> = {
  normal: {
    label: 'Normal',
    variant: 'success',
    icon: <CheckCircle2 size={12} />,
  },
  perlu_perhatian: {
    label: 'Perlu Perhatian',
    variant: 'warning',
    icon: <TriangleAlert size={12} />,
  },
  perlu_review_supervisor: {
    label: 'Perlu Review Supervisor',
    variant: 'destructive',
    icon: <AlertCircle size={12} />,
  },
};

function FlagBadge({ status }: { status: FlagStatus }) {
  const cfg = FLAG_CONFIG[status];
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1 text-[11px]">
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

// ─── Component ─────────────────────────────────────────────────

interface AiResultCardProps {
  sampleId: string;
}

export function AiResultCard({ sampleId }: AiResultCardProps) {
  const { data: logData, isLoading, isError, error, refetch } = useAiLog(sampleId, 'result_review');
  const trigger = useTriggerResultReview(sampleId);
  const [triggered, setTriggered] = useState(false);

  const is404 = error?.response?.status === 404;
  const result = logData?.data?.responseData as ResultReviewResult | undefined;

  function handleTrigger() {
    setTriggered(true);
    trigger.mutate(undefined, {
      onSuccess: () => {
        void refetch();
      },
      onSettled: () => setTriggered(false),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Tinjauan Hasil</CardTitle>
          <Bot size={15} className="text-slate-300" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
            <Loader2 size={13} className="animate-spin" />
            <span>Memuat tinjauan AI…</span>
          </div>
        )}

        {/* No log yet — empty state with trigger button */}
        {!isLoading && (isError && is404) && (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-xs text-slate-400">
              Tinjauan AI belum tersedia untuk sampel ini.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTrigger}
              disabled={trigger.isPending || triggered}
              className="text-xs"
            >
              {trigger.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Bot size={12} />
              )}
              {trigger.isPending ? 'Memproses…' : 'Minta Tinjauan AI'}
            </Button>
            {trigger.isError && (
              <p className="text-xs text-red-500">
                {(trigger.error?.response?.data as { message?: string })?.message ?? 'Gagal menghubungi AI service.'}
              </p>
            )}
          </div>
        )}

        {/* Non-404 error */}
        {!isLoading && isError && !is404 && (
          <div className="flex items-center gap-1.5 py-2 text-xs text-slate-400">
            <AlertCircle size={12} />
            <span>Tidak dapat memuat tinjauan AI.</span>
          </div>
        )}

        {/* Result */}
        {!isLoading && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FlagBadge status={result.flag_status} />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{result.reason}</p>

            {result.recommendation && (
              <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Saran</p>
                <p className="text-xs text-slate-700">{result.recommendation}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                {logData?.data?.createdAt
                  ? new Date(logData.data.createdAt).toLocaleString('id-ID', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })
                  : ''}
              </span>
              <button
                onClick={handleTrigger}
                disabled={trigger.isPending}
                className="flex items-center gap-1 text-[10px] text-teal-600 hover:underline disabled:opacity-50"
              >
                <RefreshCw size={10} />
                Perbarui
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
