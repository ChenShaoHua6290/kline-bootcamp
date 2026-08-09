import { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function TableWrap({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('w-full overflow-x-auto overflow-y-hidden rounded-xl border border-slate-700/60 bg-slate-900/55', className)} {...props} />;
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('min-w-full text-[13px]', className)} {...props} />;
}
