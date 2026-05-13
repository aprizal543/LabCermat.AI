import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PlaceholderPageProps {
  title: string;
  sprint: string;
  description?: string;
}

export function PlaceholderPage({ title, sprint, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500">{description ?? 'Halaman ini sedang dikembangkan.'}</p>
      </div>
      <Card className="border-dashed border-slate-200">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Construction size={32} className="text-slate-300" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-xs text-slate-400">Tersedia di {sprint}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
