import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) => {
  const isPositive = trend && trend.value >= 0;

  return (
    <div className={cn('bg-card border rounded-lg p-4 lg:p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {isPositive ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};
