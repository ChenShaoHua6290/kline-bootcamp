import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMarketLabel, formatSymbolLabel } from '@/lib/market';

export function ReviewSummary({ session }: { session: any }) {
  const finalBalance = session.finalBalance ?? session.initialBalance;
  const pnl = finalBalance - session.initialBalance;
  const pnlPct = session.initialBalance > 0 ? (pnl / session.initialBalance) * 100 : 0;
  const progressed = typeof session.trainPointer === 'number' ? session.trainPointer : session.totalBars;
  return (
    <Card className="border-slate-700/80 bg-slate-900/65 p-3 sm:p-3.5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] tracking-[0.06em] text-slate-400">训练概览</div>
          <div className="mt-1 text-[14px] font-semibold text-slate-100">
            {formatMarketLabel(session.market)} {formatSymbolLabel(session.symbol)}
          </div>
        </div>
        <Badge tone={session.isLiquidated ? 'danger' : 'success'}>{session.isLiquidated ? '爆仓' : '未爆仓'}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/45 px-2.5 py-2">
          <div className="text-[11px] text-slate-400">推进周期</div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-100">{session.drivingTimeframe}</div>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/45 px-2.5 py-2">
          <div className="text-[11px] text-slate-400">实际推进</div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-100">{progressed} / {session.totalBars}</div>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/45 px-2.5 py-2">
          <div className="text-[11px] text-slate-400">训练K线数量</div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-100">{session.totalBars} 根</div>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/45 px-2.5 py-2">
          <div className="text-[11px] text-slate-400">最终资金</div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-100">{finalBalance.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-2.5 rounded-lg border border-slate-700/70 bg-slate-900/45 px-2.5 py-2">
        <div className="text-[11px] text-slate-400">收益率</div>
        <div className={`mt-0.5 text-[16px] font-semibold ${pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
        </div>
      </div>
    </Card>
  );
}
