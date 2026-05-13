import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useCreateResult } from '@/hooks/useResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ─────────────────────────────────────────────────────

interface ResultFormProps {
  sampleId: string;
  onClose: () => void;
}

interface FormValues {
  parameterName: string;
  value: string;
  unit: string;
  referenceMin: string;
  referenceMax: string;
  note: string;
}

const EMPTY: FormValues = {
  parameterName: '',
  value: '',
  unit: '',
  referenceMin: '',
  referenceMax: '',
  note: '',
};

// ─── Component ─────────────────────────────────────────────────

export function ResultForm({ sampleId, onClose }: ResultFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const createResult = useCreateResult(sampleId);

  function set<K extends keyof FormValues>(key: K, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!values.parameterName.trim()) next.parameterName = 'Nama parameter wajib diisi';
    if (!values.value.trim())         next.value         = 'Nilai hasil wajib diisi';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createResult.mutate(
      {
        parameterName: values.parameterName.trim(),
        value:         values.value.trim(),
        unit:          values.unit.trim()         || undefined,
        referenceMin:  values.referenceMin.trim() || undefined,
        referenceMax:  values.referenceMax.trim() || undefined,
        note:          values.note.trim()         || undefined,
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
    (createResult.error?.response?.data as { message?: string })?.message ??
    (createResult.isError ? 'Gagal menyimpan hasil. Coba lagi.' : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Tambah Hasil Pemeriksaan</CardTitle>
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
            {apiError && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Nama Parameter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Nama Parameter <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={values.parameterName}
                onChange={(e) => set('parameterName', e.target.value)}
                placeholder="contoh: Hemoglobin, Leukosit, Glukosa"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {errors.parameterName && (
                <p className="text-xs text-red-500">{errors.parameterName}</p>
              )}
            </div>

            {/* Nilai + Satuan (berdampingan) */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nilai <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={values.value}
                  onChange={(e) => set('value', e.target.value)}
                  placeholder="contoh: 12.5, Positif, >200"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                {errors.value && (
                  <p className="text-xs text-red-500">{errors.value}</p>
                )}
              </div>

              <div className="w-28 space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Satuan <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={values.unit}
                  onChange={(e) => set('unit', e.target.value)}
                  placeholder="g/dL, /uL"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Rentang Rujukan (berdampingan) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Rentang Rujukan <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={values.referenceMin}
                  onChange={(e) => set('referenceMin', e.target.value)}
                  placeholder="Min"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <span className="shrink-0 text-xs text-slate-400">s/d</span>
                <input
                  type="text"
                  value={values.referenceMax}
                  onChange={(e) => set('referenceMax', e.target.value)}
                  placeholder="Maks"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Catatan */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Catatan <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <textarea
                value={values.note}
                onChange={(e) => set('note', e.target.value)}
                placeholder="Catatan observasi atau kondisi sampel"
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
                disabled={createResult.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createResult.isPending}
              >
                {createResult.isPending ? 'Menyimpan…' : 'Simpan Hasil'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
