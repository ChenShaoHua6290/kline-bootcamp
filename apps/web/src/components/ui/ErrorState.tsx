import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function ErrorState({ message = '加载失败，请稍后重试', action, className }: { message?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('grid min-h-[140px] place-items-center rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center', className)}>
      <div>
        <div className="text-sm font-semibold text-rose-200">请求失败</div>
        <div className="mt-1 text-xs text-rose-200/90">{message}</div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

