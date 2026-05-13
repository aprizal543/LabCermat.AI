import { Badge } from '@/components/ui/badge';

type SamplePriority = 'rutin' | 'urgent' | 'cito';

const PRIORITY_CONFIG: Record<
  SamplePriority,
  { label: string; variant: 'default' | 'warning' | 'destructive' | 'outline' }
> = {
  rutin:  { label: 'Rutin',  variant: 'outline'     },
  urgent: { label: 'Urgent', variant: 'warning'      },
  cito:   { label: 'CITO',   variant: 'destructive'  },
};

interface PriorityBadgeProps {
  priority: SamplePriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] ?? { label: priority, variant: 'outline' as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
