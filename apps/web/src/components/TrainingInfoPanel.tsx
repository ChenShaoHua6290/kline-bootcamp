import { Session } from '@/types/training';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function TrainingInfoPanel({ session, viewTimeframe }: { session: Session; viewTimeframe: string }) {
  const trainPointer = typeof session.trainPointer === 'number' ? session.trainPointer : session.pointer;
  const progress = Math.max(0, Math.min(100, (trainPointer / Math.max(1, session.totalBars)) * 100));
  const statusText =
    session.status === 'ACTIVE'
      ? '训练中'
      : session.status === 'COMPLETED' || session.status === 'ENDED'
        ? '已完成'
        : session.status === 'TERMINATED'
          ? '已结束'
          : session.status === 'LIQUIDATED'
            ? '已爆仓'
            : '已结束';
  const statusColor = session.status === 'ACTIVE' ? 'text-emerald-400' : session.status === 'LIQUIDATED' ? 'text-rose-400' : 'text-slate-300';

  return (
    <Card className="shrink-0 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold tracking-[0.01em] text-slate-100">训练信息</h3>
        <Badge tone={session.status === 'ACTIVE' ? 'success' : session.status === 'LIQUIDATED' ? 'danger' : 'default'} className={`${statusColor} text-[10px]`}>
          {statusText}
        </Badge>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-[11px] text-slate-400">训练K线数量</span>
          <span className="text-[12px] font-semibold text-slate-100">{session.totalBars} 根</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-[11px] text-slate-400">推进周期</span>
          <span className="text-[12px] font-semibold text-slate-100">{session.drivingTimeframe}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-[11px] text-slate-400">当前查看</span>
          <span className="text-[12px] font-semibold text-slate-100">{viewTimeframe}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-[11px] text-slate-400">已推进</span>
          <span className="text-[12px] font-semibold text-cyan-200">
            {trainPointer} / {session.totalBars}
          </span>
        </div>
      </div>
      <div className="mb-1 mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-700/70">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${progress}%` }} />
      </div>
      <div className="text-right text-[11px] text-slate-400">进度 {progress.toFixed(0)}%</div>
    </Card>
  );
}
