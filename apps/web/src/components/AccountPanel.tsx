import { Session } from '@/types/training';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function AccountPanel({ session, showCurrentPnl = true }: { session: NonNullable<Session>; showCurrentPnl?: boolean }) {
  const lastClose = session.barsData?.[session.pointer]?.close ?? 0;
  const startBalance = session.initialBalance || 10000;
  const positionAmount = session.position?.positionAmount ?? (session.position ? session.finalBalance * session.position.positionPercent : 0);
  const floatingPnl = session.position
    ? ((session.position.side === 'LONG' ? (lastClose - session.position.entryPrice) : (session.position.entryPrice - lastClose)) /
        session.position.entryPrice) *
      positionAmount
    : 0;
  const totalPnl = session.finalBalance - startBalance;
  const totalPnlPct = startBalance > 0 ? (totalPnl / startBalance) * 100 : 0;
  const sideText = session.position?.side === 'LONG' ? '多仓' : session.position?.side === 'SHORT' ? '空仓' : '空仓';
  const qty = session.position ? (positionAmount / Math.max(lastClose, 0.0001)).toFixed(2) : '0';
  const holdingReturnPct = positionAmount > 0 ? (floatingPnl / positionAmount) * 100 : 0;

  return (
    <section className="shrink-0 space-y-1.5">
      <Card className="p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-100">账户概览</div>
          <Badge tone={session.position ? 'info' : 'default'}>{session.position ? '持仓中' : '空仓'}</Badge>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between text-slate-300">
            <span className="field-label normal-case tracking-normal">账户总积分</span>
            <span className="text-base font-semibold text-slate-100">{session.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="field-label normal-case tracking-normal">持仓方向</span>
            <span className="field-value">{sideText}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="field-label normal-case tracking-normal">持仓数量</span>
            <span className="field-value">{qty} 股</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="field-label normal-case tracking-normal">总盈亏</span>
            <span className={`text-sm font-semibold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalPnl >= 0 ? '+' : ''}
              {totalPnl.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>
      {showCurrentPnl ? (
        <Card className="p-3">
          <div className="mb-1.5 text-xs text-slate-300">当前盈亏</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="surface-muted p-2">
              <div className="mb-1 text-[10px] text-slate-400">总盈亏</div>
              <div className={`text-base font-bold ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{floatingPnl.toFixed(2)}</div>
            </div>
            <div className="surface-muted p-2">
              <div className="mb-1 text-[10px] text-slate-400">收益率</div>
              <div className={`text-base font-bold ${totalPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnlPct >= 0 ? '+' : ''}
                {totalPnlPct.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">重置次数: {session.resetCount}</div>
        </Card>
      ) : null}
      <div className="rounded-lg border border-emerald-500/25 bg-slate-900/70 p-2.5">
        <div className="mb-1 text-xs text-slate-300">持仓收益</div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <div className="field-label normal-case tracking-normal">成本</div>
            <div className="field-value">¥{session.position ? session.position.entryPrice.toFixed(2) : '--'}</div>
          </div>
          <div>
            <div className="field-label normal-case tracking-normal">浮动盈亏</div>
            <div className={`font-semibold ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{floatingPnl.toFixed(2)}</div>
          </div>
          <div>
            <div className="field-label normal-case tracking-normal">收益率</div>
            <div className={`font-semibold ${holdingReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {holdingReturnPct >= 0 ? '+' : ''}
              {holdingReturnPct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
