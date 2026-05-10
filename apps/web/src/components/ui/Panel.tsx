import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-muted rounded-xl', className)} {...props} />;
}
