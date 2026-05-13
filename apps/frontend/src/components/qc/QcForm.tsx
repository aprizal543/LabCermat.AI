import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useQcInstruments, useCreateQcRecord } from '@/hooks/useQc';
import type { CreateQcInput } from '@/hooks/useQc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QcFormProps {
  onClose: () => void;
}

interface FormValues {
  instrumentId: string;
  controlType: string;
  controlValue: string;
  unit: string;
  lowerLimit: string;
  upperLimit: string;
  recordedAt: string;
  notes: string;
}

const EMPTY: FormValues = {
  instrumentId: '',
  controlType: '',
  controlValue: '',
  unit: '',
  lowerLimit: '',
  upperLimit: '',
  recordedAt: '',
  notes: '',
};

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

export function QcForm({ onClose }: QcFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const { data: instrumentsData } = useQcInstruments();
  const instruments = instrumentsData?.data ?? [];
  const createQc = useCreateQcRecord();

  function set<K extends keyof FormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};

    if (!values.instrumentId)          next.instrumentId  = 'Alat QC wajib dipilih';
    if (!values.controlType.trim())    next.controlType   = 'Tipe kontrol wajib diisi';
    if (!values.controlValue.trim())   next.controlValue  = 'Nilai kontrol wajib diisi';
    else if (!NUMERIC_RE.test(values.controlValue.trim()))
                                       next.controlValue  = 'Harus berupa angka';
    if (!values.lowerLimit.trim())     next.lowerLimit    = 'Batas bawah wajib diisi';
    else if (!NUMERIC_RE.test(values.lowerLimit.trim()))
                                       next.lowerLimit    = 'Harus berupa angka';
    if (!values.upperLimit.trim())     next.upperLimit    = 'Batas atas wajib diisi';
    else if (!NUMERIC_RE.test(values.upperLimit.trim()))
                                       next.upperLimit    = 'Harus berupa angka';

    if (
      !next.lowerLimit && !next.upperLimit &&
      NUMERIC_RE.test(values.lowerLimit.trim()) &&
      NUMERIC_RE.test(values.upperLimit.trim()) &&
      parseFloat(values.lowerLimit) > parseFloat(values.upperLimit)
    ) {
      next.lowerLimit = 'Batas bawah tidak boleh lebih besar dari batas atas';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const input: CreateQcInput = {
      instrumentId: values.instrumentId,
      controlType:  values.controlType.trim(),
      controlValue: values.controlValue.trim(),
      lowerLimit:   values.lowerLimit.trim(),
      upperLimit:   values.upperLimit.trim(),
      unit:         values.unit.trim()   || undefined,
      notes:        values.notes.trim()  || undefined,
      recordedAt:   values.recordedAt    || undefined,
    };

    createQc.mutate(input, {
      onSuccess: () => {
        setValues(EMPTY);
        onClose();
      },
    });
  }

  const apiError =
    (createQc.error?.response?.data as { message?: string })?.message ??
    (createQc.isError ? 'Gagal menyimpan catatan QC. Coba lagi.' : null);

  const inputCls = 'w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500';
  const labelCls = 'text-xs font-medium text-slate-700';
  const errorCls = 'text-xs text-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Tambah Catatan QC</CardTitle>
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

            {/* Alat QC */}
            <div className="space-y-1">
              <label className={labelCls}>
                Alat QC <span className="text-red-500">*</span>
              </label>
              <select
                value={values.instrumentId}
                onChange={(e) => set('instrumentId', e.target.value)}
                className={inputCls}
              >
                <option value="">-- Pilih Alat --</option>
                {instruments.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}{i.department ? ` (${i.department})` : ''}
                  </option>
                ))}
              </select>
              {errors.instrumentId && <p className={errorCls}>{errors.instrumentId}</p>}
            </div>

            {/* Tipe Kontrol */}
            <div className="space-y-1">
              <label className={labelCls}>
                Tipe Kontrol <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={values.controlType}
                onChange={(e) => set('controlType', e.target.value)}
                placeholder="contoh: Level 1, Level 2, Normal Control"
                className={inputCls}
              />
              {errors.controlType && <p className={errorCls}>{errors.controlType}</p>}
            </div>

            {/* Nilai Kontrol + Satuan */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className={labelCls}>
                  Nilai Kontrol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={values.controlValue}
                  onChange={(e) => set('controlValue', e.target.value)}
                  placeholder="contoh: 12.5"
                  className={inputCls}
                />
                {errors.controlValue && <p className={errorCls}>{errors.controlValue}</p>}
              </div>
              <div className="space-y-1">
                <label className={labelCls}>
                  Satuan <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={values.unit}
                  onChange={(e) => set('unit', e.target.value)}
                  placeholder="g/dL"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Batas Bawah & Atas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>
                  Batas Bawah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={values.lowerLimit}
                  onChange={(e) => set('lowerLimit', e.target.value)}
                  placeholder="contoh: 11.0"
                  className={inputCls}
                />
                {errors.lowerLimit && <p className={errorCls}>{errors.lowerLimit}</p>}
              </div>
              <div className="space-y-1">
                <label className={labelCls}>
                  Batas Atas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={values.upperLimit}
                  onChange={(e) => set('upperLimit', e.target.value)}
                  placeholder="contoh: 13.0"
                  className={inputCls}
                />
                {errors.upperLimit && <p className={errorCls}>{errors.upperLimit}</p>}
              </div>
            </div>

            {/* Waktu Pencatatan */}
            <div className="space-y-1">
              <label className={labelCls}>
                Waktu Pencatatan <span className="text-slate-400 font-normal">(opsional — kosong = sekarang)</span>
              </label>
              <input
                type="datetime-local"
                value={values.recordedAt}
                onChange={(e) => set('recordedAt', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Catatan */}
            <div className="space-y-1">
              <label className={labelCls}>
                Catatan <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <textarea
                value={values.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Catatan tambahan untuk catatan QC ini"
                rows={2}
                className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={createQc.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createQc.isPending}
              >
                {createQc.isPending ? 'Menyimpan…' : 'Simpan QC'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
