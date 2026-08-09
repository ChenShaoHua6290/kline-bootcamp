import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function PageHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)} {...props} />;
}

export function PageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn('text-2xl font-semibold tracking-[0.01em] text-slate-100 sm:text-[26px]', className)} {...props} />;
}

export function PageDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-xs text-slate-400 sm:text-sm', className)} {...props} />;
}
