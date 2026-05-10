import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({
  title = '暂无数据',
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid min-h-[140px] place-items-center rounded-xl border border-dashed border-slate-700/70 bg-slate-900/45 p-6 text-center', className)}>
      <div>
        <div className="text-sm font-semibold text-slate-200">{title}</div>
        {description ? <div className="mt-1 text-xs text-slate-400">{description}</div> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

