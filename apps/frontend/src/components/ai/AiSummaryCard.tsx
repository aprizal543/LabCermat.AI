import { ChevronDown, ChevronUp, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useTriggerSupervisorSummary } from '@/hooks/useAi';
import type { SupervisorSummaryResult } from '@/hooks/useAi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Build a safe summary sentence from structured stats, ignoring the backend
// free-text which can contradict other dashboard numbers (different time windows).
function buildSummaryText(stats: SupervisorSummaryResult['stats']): string {
  const { total_samples, recheck, qc_issues } = stats;
  if (total_samples === 0) {
    return 'Belum ada aktivitas sampel pada shift ini.';
  }
  const parts: string[] = [`Terdapat ${total_samples} sampel aktif pada shift ini.`];
  if (recheck > 0) {
    parts.push(`${recheck} sampel memerlukan cek ulang.`);
  }
  if (qc_issues > 0) {
    parts.push(`${qc_issues} catatan QC memerlukan perhatian.`);
  }
  return parts.join(' ');
}

export function AiSummaryCard() {
  const trigger = useTriggerSupervisorSummary();
  const [result, setResult] = useState<SupervisorSummaryResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [shiftHours, setShiftHours] = useState(8);

  function handleLoad() {
    trigger.mutate({ shiftHours }, {
      onSuccess: (res) => {
        setResult(res.data);
        setExpanded(true);
      },
    });
  }

  const errorMsg =
    (trigger.error?.response?.data as { message?: string })?.message ??
    (trigger.isError ? 'Gagal menghubungi AI service. Pastikan service berjalan.' : null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Ringkasan Shift</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 shrink-0">Rentang shift:</label>
            <select
              value={shiftHours}
              onChange={(e) => setShiftHours(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value={4}>4 jam</option>
              <option value={8}>8 jam</option>
              <option value={12}>12 jam</option>
              <option value={24}>24 jam</option>
            </select>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleLoad}
            disabled={trigger.isPending}
            className="text-xs"
          >
            {trigger.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            {trigger.isPending ? 'Memproses…' : result ? 'Perbarui' : 'Muat Ringkasan'}
          </Button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
            <TriangleAlert size={12} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            {/* Summary text — built from stats, avoids backend narrative mismatch */}
            <p className="text-sm text-slate-700 leading-relaxed">
              {buildSummaryText(result.stats)}
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total Sampel', value: result.stats.total_samples },
                { label: 'Tervalidasi',  value: result.stats.validated },
                { label: 'Cek Ulang',    value: result.stats.recheck },
                { label: 'Masalah QC',   value: result.stats.qc_issues },
              ].map((s) => (
                <div key={s.label} className="rounded-md bg-slate-50 border border-slate-100 px-2.5 py-2 text-center">
                  <p className="text-base font-bold text-slate-800">{s.value}</p>
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {result.focus_recommendations.length > 0 && (
              <div className="space-y-1.5">
                <button
                  onClick={() => setExpanded((p) => !p)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  Rekomendasi Fokus ({result.focus_recommendations.length})
                </button>
                {expanded && (
                  <ul className="space-y-1.5 pl-1">
                    {result.focus_recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Footer */}
            <p className="text-[10px] text-slate-400">
              Dibuat: {new Date(result.processed_at).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!result && !trigger.isPending && !errorMsg && (
          <p className="text-xs text-slate-400 pb-1">
            Klik "Muat Ringkasan" untuk melihat ringkasan aktivitas shift ini.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
