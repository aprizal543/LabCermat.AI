import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { SamplePriority } from '@labcermat/shared-types';
import { useCreateSample } from '@/hooks/useSamples';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ─────────────────────────────────────────────────────

interface SampleFormProps {
  onClose: () => void;
}

interface FormValues {
  sampleType: string;
  requestedTest: string;
  department: string;
  priority: SamplePriority;
  notes: string;
}

const EMPTY: FormValues = {
  sampleType: '',
  requestedTest: '',
  department: '',
  priority: SamplePriority.RUTIN,
  notes: '',
};

// ─── Component ─────────────────────────────────────────────────

export function SampleForm({ onClose }: SampleFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const createSample = useCreateSample();

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!values.sampleType.trim())    next.sampleType    = 'Jenis sampel wajib diisi';
    if (!values.requestedTest.trim()) next.requestedTest = 'Jenis pemeriksaan wajib diisi';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createSample.mutate(
      {
        sampleType:    values.sampleType.trim(),
        requestedTest: values.requestedTest.trim(),
        department:    values.department.trim() || undefined,
        priority:      values.priority,
        notes:         values.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setValues(EMPTY);
          onClose();
        },
      },
    );
  }

  const apiError =
    (createSample.error?.response?.data as { message?: string })?.message ??
    (createSample.isError ? 'Gagal mendaftarkan sampel. Coba lagi.' : null);

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-lg">
        {/* Header */}
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Tambah Sampel Baru</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* API error */}
            {apiError && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Jenis Sampel */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Jenis Sampel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={values.sampleType}
                onChange={(e) => set('sampleType', e.target.value)}
                placeholder="contoh: Darah Vena, Urin, Dahak"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {errors.sampleType && (
                <p className="text-xs text-red-500">{errors.sampleType}</p>
              )}
            </div>

            {/* Jenis Pemeriksaan */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Jenis Pemeriksaan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={values.requestedTest}
                onChange={(e) => set('requestedTest', e.target.value)}
                placeholder="contoh: Hematologi Lengkap, Kimia Darah, Urinalisis"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {errors.requestedTest && (
                <p className="text-xs text-red-500">{errors.requestedTest}</p>
              )}
            </div>

            {/* Departemen */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Departemen <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <input
                type="text"
                value={values.department}
                onChange={(e) => set('department', e.target.value)}
                placeholder="contoh: Penyakit Dalam, Bedah, Anak"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Prioritas */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Prioritas <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {([SamplePriority.RUTIN, SamplePriority.URGENT, SamplePriority.CITO] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('priority', p)}
                    className={[
                      'flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                      values.priority === p
                        ? p === SamplePriority.CITO
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : p === SamplePriority.URGENT
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-teal-400 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {p === SamplePriority.CITO ? 'CITO' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Catatan <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <textarea
                value={values.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Catatan tambahan untuk sampel ini"
                rows={2}
                className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={createSample.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createSample.isPending}
              >
                {createSample.isPending ? 'Mendaftarkan…' : 'Daftarkan Sampel'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
