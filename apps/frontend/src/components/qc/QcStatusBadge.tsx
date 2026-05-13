import { Badge } from '@/components/ui/badge';
import { QcStatus } from '@labcermat/shared-types';

interface QcStatusBadgeProps {
  status: QcStatus;
  className?: string;
}

export function QcStatusBadge({ status, className }: QcStatusBadgeProps) {
  if (status === QcStatus.STABIL) {
    return (
      <Badge variant="success" className={className}>
        Stabil
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className={className}>
      Perlu Perhatian
    </Badge>
  );
}
