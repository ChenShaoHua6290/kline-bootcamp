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
  // Real-time account pnl should include floating pnl while position is open.
  const totalPnl = session.finalBalance + floatingPnl - startBalance;
  const totalPnlPct = startBalance > 0 ? (totalPnl / startBalance) * 100 : 0;
  const equityBalance = session.finalBalance + floatingPnl;
  const holdingReturnPct = positionAmount > 0 ? (floatingPnl / positionAmount) * 100 : 0;
  const positionBadgeText = session.position
    ? session.position.side === 'LONG'
      ? '多仓中'
      : '空仓中'
    : '空仓';

  return (
    <section className="shrink-0 space-y-2">
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-slate-100">账户概览</div>
          <Badge tone={session.position ? 'info' : 'default'} className="text-[10px]">{positionBadgeText}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-slate-300">
            <div className="text-[11px] text-slate-400">总积分</div>
            <div className="text-[13px] font-semibold text-slate-100">{equityBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="text-right text-slate-300">
            <div className="text-[11px] text-slate-400">权益盈亏</div>
            <div className={`text-[13px] font-semibold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalPnl >= 0 ? '+' : ''}
              {totalPnl.toFixed(2)}
            </div>
          </div>
        </div>
        {showCurrentPnl ? (
          <>
          <div className="my-2 h-px bg-slate-700/70" />
          <div className="mb-2 text-[13px] font-semibold text-slate-100">本次训练盈亏</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="surface-muted p-2">
              <div className="mb-0.5 text-[10px] text-slate-400">总盈亏</div>
              <div className={`text-[13px] font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totalPnl.toFixed(2)}</div>
            </div>
            <div className="surface-muted p-2">
              <div className="mb-0.5 text-[10px] text-slate-400">收益率</div>
              <div className={`text-[13px] font-bold ${totalPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnlPct >= 0 ? '+' : ''}
                {totalPnlPct.toFixed(2)}%
              </div>
            </div>
          </div>
          </>
        ) : null}
      </Card>
      {session.position ? (
      <div className="rounded-lg border border-emerald-500/25 bg-slate-900/70 p-2.5">
        <div className="mb-1.5 text-[13px] font-semibold text-slate-100">持仓收益</div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <div className="text-[11px] text-slate-400">成本</div>
            <div className="text-[12px] font-semibold text-slate-100">¥{session.position ? session.position.entryPrice.toFixed(2) : '--'}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">浮动盈亏</div>
            <div className={`text-[12px] font-semibold ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{floatingPnl.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">收益率</div>
            <div className={`text-[12px] font-semibold ${holdingReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {holdingReturnPct >= 0 ? '+' : ''}
              {holdingReturnPct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
      ) : null}
    </section>
  );
}
