import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function SectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-semibold text-slate-200 sm:text-lg', className)} {...props} />;
}

export function SectionHint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-xs text-slate-400', className)} {...props} />;
}

