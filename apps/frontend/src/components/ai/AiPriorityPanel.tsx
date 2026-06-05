import { Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { useTriggerPrioritization } from '@/hooks/useAi';
import type { RankedSample } from '@/hooks/useAi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Priority badge ─────────────────────────────────────────────

function PriorityBadge({ score }: { score: number }) {
  const variant =
    score >= 120 ? 'destructive' :
    score >= 80  ? 'warning'     :
                   'outline';
  const label =
    score >= 120 ? 'Tinggi'  :
    score >= 80  ? 'Sedang'  :
                   'Normal';
  return (
    <Badge variant={variant} className="text-[10px] px-1.5 py-0 shrink-0">
      {label}
    </Badge>
  );
}

// ─── Component ─────────────────────────────────────────────────

export function AiPriorityPanel() {
  const trigger = useTriggerPrioritization();
  const result  = trigger.data?.data;
  const ranked  = result?.ranked_samples ?? [];

  const errorMsg =
    (trigger.error?.response?.data as { message?: string })?.message ??
    (trigger.isError ? 'Gagal menghubungi AI service.' : null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Prioritas Sampel</CardTitle>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Urutan sampel berdasarkan prioritas, status, dan waktu tunggu.
        </p>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Trigger button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => trigger.mutate()}
          disabled={trigger.isPending}
          className="text-xs"
        >
          {trigger.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {trigger.isPending
            ? 'Memproses…'
            : ranked.length > 0
            ? 'Perbarui'
            : 'Hitung Prioritas'}
        </Button>

        {/* Error */}
        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <TriangleAlert size={12} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loading */}
        {trigger.isPending && (
          <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
            <Loader2 size={13} className="animate-spin" />
            <span>Menghitung prioritas sampel…</span>
          </div>
        )}

        {/* Results */}
        {!trigger.isPending && ranked.length > 0 && (
          <div className="space-y-2">
            {ranked.map((s: RankedSample) => (
              <div
                key={s.id}
                className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                {/* Rank */}
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">
                  {s.rank}
                </span>

                {/* Info */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-xs font-medium text-slate-700">{s.reason}</p>
                  {s.estimated_duration_minutes && (
                    <p className="text-[10px] text-slate-400">
                      Est. {s.estimated_duration_minutes} menit
                    </p>
                  )}
                </div>

                {/* Priority level */}
                <PriorityBadge score={s.score} />
              </div>
            ))}

            <p className="text-[10px] text-slate-400">
              {ranked.length} sampel aktif · Diperbarui{' '}
              {result?.processed_at
                ? new Date(result.processed_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </p>
          </div>
        )}

        {/* Empty state after trigger */}
        {!trigger.isPending && trigger.isSuccess && ranked.length === 0 && (
          <p className="text-xs text-slate-400">
            Tidak ada sampel aktif yang perlu diprioritaskan saat ini.
          </p>
        )}

        {/* Idle state */}
        {!trigger.isPending && !trigger.isSuccess && !trigger.isError && (
          <p className="text-xs text-slate-400">
            Klik "Hitung Prioritas" untuk melihat urutan sampel berdasarkan prioritas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
