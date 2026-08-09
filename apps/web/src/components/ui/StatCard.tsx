import { ReactNode } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

export function StatCard({
  label,
  value,
  icon,
  tone = 'default',
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'cyan' | 'green' | 'rose';
  hint?: string;
  className?: string;
}) {
  const toneCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'green'
        ? 'text-emerald-300'
        : tone === 'rose'
          ? 'text-rose-300'
          : 'text-slate-100';

  return (
    <Card className={cn('transition hover:border-[color:var(--line-strong)] hover:shadow-[0_14px_26px_rgba(0,0,0,0.25)]', className)}>
      <CardBody className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium tracking-[0.06em] text-slate-400">{label}</div>
          {icon ? <div className="text-slate-400">{icon}</div> : null}
        </div>
        <div className={cn('mt-2 text-[30px] font-bold leading-none tracking-tight', toneCls)}>{value}</div>
        {hint ? <div className="mt-1.5 text-xs text-slate-400">{hint}</div> : null}
      </CardBody>
    </Card>
  );
}
