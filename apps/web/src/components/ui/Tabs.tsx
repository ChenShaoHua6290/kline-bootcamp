import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Tabs({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5', className)}>{children}</div>;
}

export function TabButton({ className, active, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'h-10 shrink-0 rounded-xl border px-3 text-xs font-semibold transition',
        active
          ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
          : 'border-slate-700/70 bg-slate-900/55 text-slate-300 hover:border-slate-500',
        className,
      )}
      {...props}
    />
  );
}
