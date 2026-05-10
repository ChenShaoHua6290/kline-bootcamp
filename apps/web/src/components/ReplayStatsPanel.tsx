import { Session } from '@/types/training';
import { Card } from '@/components/ui/Card';

export function ReplayStatsPanel({ session }: { session: Session }) {
  const tradeCount = session.actions.filter((a) => ['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'TP', 'SL'].includes(a.actionType)).length;
  return (
    <Card className="p-3 text-sm">
      <div className="mb-2 text-sm font-semibold text-slate-100">回放统计</div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <span className="field-label normal-case tracking-normal">交易次数</span>
          <span className="field-value">{tradeCount}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="field-label normal-case tracking-normal">最终资金</span>
          <span className="field-value">¥{session.finalBalance.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="field-label normal-case tracking-normal">是否爆仓</span>
          <span className={`text-sm font-semibold ${session.isLiquidated ? 'text-rose-400' : 'text-emerald-400'}`}>{session.isLiquidated ? '是' : '否'}</span>
        </div>
      </div>
    </Card>
  );
}
