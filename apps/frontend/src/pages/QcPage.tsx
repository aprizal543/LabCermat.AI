import { useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QcTable } from '@/components/qc/QcTable';
import { QcForm } from '@/components/qc/QcForm';
import { Button } from '@/components/ui/button';

export function QcPage() {
  const { appUser } = useAuth();
  const isAnalis = appUser?.role.name === 'analis';
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      {showForm && <QcForm onClose={() => setShowForm(false)} />}

      <div className="space-y-5">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
              <ShieldCheck size={18} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">QC Harian</h2>
              <p className="text-sm text-slate-500">
                {isAnalis
                  ? 'Pencatatan dan pemantauan quality control alat'
                  : 'Pemantauan quality control alat laboratorium'}
              </p>
            </div>
          </div>

          {isAnalis && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={15} />
              Tambah QC
            </Button>
          )}
        </div>

        {/* ── QC Table ── */}
        <QcTable />
      </div>
    </>
  );
}
