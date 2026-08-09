import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BadgeTone = 'default' | 'success' | 'danger' | 'warning' | 'info';

export function Badge({ className, tone = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tone === 'default' && 'border-slate-600/70 text-slate-300 bg-slate-800/50',
        tone === 'success' && 'border-emerald-500/45 text-emerald-200 bg-emerald-500/15',
        tone === 'danger' && 'border-rose-500/45 text-rose-200 bg-rose-500/15',
        tone === 'warning' && 'border-amber-500/45 text-amber-100 bg-amber-500/15',
        tone === 'info' && 'border-cyan-500/45 text-cyan-200 bg-cyan-500/15',
        className,
      )}
      {...props}
    />
  );
}
