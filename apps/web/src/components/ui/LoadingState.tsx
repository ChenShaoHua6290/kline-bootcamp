import { cn } from '@/lib/cn';

export function LoadingState({ message = '加载中...', className }: { message?: string; className?: string }) {
  return (
    <div className={cn('grid min-h-[140px] place-items-center rounded-xl border border-slate-700/70 bg-slate-900/45 p-6', className)}>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/40 border-t-cyan-300" />
        <span>{message}</span>
      </div>
    </div>
  );
}

