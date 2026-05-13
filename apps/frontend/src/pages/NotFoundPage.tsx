import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4 text-center">
      <p className="text-6xl font-bold text-slate-200">404</p>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-700">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-slate-400">
          Halaman yang Anda cari tidak tersedia.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/">Kembali ke Dashboard</Link>
      </Button>
    </div>
  );
}
