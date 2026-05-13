import { Badge } from '@/components/ui/badge';

type SampleStatus =
  | 'menunggu_pemeriksaan'
  | 'dalam_proses'
  | 'menunggu_review'
  | 'tervalidasi'
  | 'minta_cek_ulang'
  | 'dibatalkan';

const STATUS_CONFIG: Record<
  SampleStatus,
  { label: string; variant: 'default' | 'warning' | 'secondary' | 'success' | 'destructive' | 'outline' }
> = {
  menunggu_pemeriksaan: { label: 'Menunggu Pemeriksaan', variant: 'secondary' },
  dalam_proses:         { label: 'Dalam Proses',         variant: 'warning'   },
  menunggu_review:      { label: 'Menunggu Review',      variant: 'default'   },
  tervalidasi:          { label: 'Tervalidasi',          variant: 'success'   },
  minta_cek_ulang:      { label: 'Minta Cek Ulang',      variant: 'destructive' },
  dibatalkan:           { label: 'Dibatalkan',           variant: 'outline'   },
};

interface StatusBadgeProps {
  status: SampleStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
