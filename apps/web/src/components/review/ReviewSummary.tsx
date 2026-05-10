import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMarketLabel, formatSymbolLabel } from '@/lib/market';

export function ReviewSummary({ session }: { session: any }) {
  const finalBalance = session.finalBalance ?? session.initialBalance;
  const pnl = finalBalance - session.initialBalance;
  const pnlPct = session.initialBalance > 0 ? (pnl / session.initialBalance) * 100 : 0;
  const progressed = typeof session.trainPointer === 'number' ? session.trainPointer : session.totalBars;
  return (
    <Card className="border-slate-700/80 bg-slate-900/65 px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div>市场：<span className="font-semibold text-slate-100">{formatMarketLabel(session.market)} {formatSymbolLabel(session.symbol)}</span></div>
        <div>推进周期：<span className="font-semibold text-slate-100">{session.drivingTimeframe}</span></div>
        <div>训练K线数量：<span className="font-semibold text-slate-100">{session.totalBars}根</span></div>
        <div>实际推进：<span className="font-semibold text-slate-100">{progressed} / {session.totalBars}</span></div>
        <div>最终资金：<span className="font-semibold text-slate-100">{finalBalance.toFixed(2)}</span></div>
        <div>
          盈亏：<span className={`font-semibold ${pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span>
        </div>
        <Badge tone={session.isLiquidated ? 'danger' : 'success'}>{session.isLiquidated ? '爆仓' : '未爆仓'}</Badge>
      </div>
    </Card>
  );
}
