import { useState } from 'react';
import { FlaskConical, Loader2, Plus } from 'lucide-react';
import { SampleStatus } from '@labcermat/shared-types';
import { useSampleResults } from '@/hooks/useResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResultForm } from './ResultForm';

// ─── Types ─────────────────────────────────────────────────────

interface ResultsSectionProps {
  sampleId: string;
  status: SampleStatus;
  role: string;
}

// ─── Component ─────────────────────────────────────────────────

export function ResultsSection({ sampleId, status, role }: ResultsSectionProps) {
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useSampleResults(sampleId);
  const results = data?.data ?? [];

  const canAddResult =
    role === 'analis' && status === SampleStatus.DALAM_PROSES;

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Hasil Pemeriksaan</CardTitle>
          {canAddResult && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="h-7 gap-1.5 px-2.5 text-xs"
            >
              <Plus size={13} />
              Tambah Hasil
            </Button>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FlaskConical size={22} className="text-slate-300" />
              <p className="text-xs text-slate-400">Belum ada hasil pemeriksaan.</p>
              {canAddResult && (
                <p className="text-xs text-slate-400">
                  Klik <span className="font-medium text-teal-600">Tambah Hasil</span> untuk mulai memasukkan data.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-2 pr-4 text-left font-medium text-slate-500">Parameter</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-500">Nilai</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-500">Satuan</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-500">Rentang Rujukan</th>
                    <th className="pb-2 pr-4 text-left font-medium text-slate-500">Catatan</th>
                    <th className="pb-2 text-left font-medium text-slate-500">Diinput oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.map((r) => (
                    <tr key={r.id} className="group">
                      <td className="py-2.5 pr-4 font-medium text-slate-800">
                        {r.parameterName}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-800">
                        {r.value}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {r.unit ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {r.referenceMin != null || r.referenceMax != null ? (
                          <span>
                            {r.referenceMin ?? '?'} – {r.referenceMax ?? '?'}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {r.note ? (
                          <span className="max-w-[160px] block truncate" title={r.note}>
                            {r.note}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {r.inputter.fullName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <ResultForm sampleId={sampleId} onClose={() => setShowForm(false)} />
      )}
    </>
  );
}
