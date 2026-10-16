import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  children,
  className,
}: PageHeaderProps) => {
  return (
    <div className={cn('flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0', className)}>
      <div className="space-y-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">{children}</div>}
    </div>
  );
};
