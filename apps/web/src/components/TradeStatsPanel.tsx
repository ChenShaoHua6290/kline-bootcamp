import { Session } from '@/types/training';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function TradeStatsPanel({ session }: { session: Session }) {
  const tradeActions = session.actions.filter((a) =>
    ['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'PARTIAL_CLOSE', 'FULL_CLOSE', 'TP', 'SL'].includes(a.actionType),
  );
  // A complete trade is counted only when position is fully closed.
  const closedTrades = tradeActions.filter((a) =>
    ['CLOSE', 'FULL_CLOSE', 'TP', 'SL'].includes(a.actionType),
  );
  const wins = closedTrades.filter((a) => (a.pnl ?? 0) > 0).length;
  const losses = closedTrades.filter((a) => (a.pnl ?? 0) < 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : null;
  const recentActions = tradeActions.slice().reverse();

  const formatActionText = (actionType: string) => {
    if (actionType === 'OPEN_LONG') return '买涨';
    if (actionType === 'OPEN_SHORT') return '买跌';
    if (actionType === 'PARTIAL_CLOSE') return '减仓';
    if (actionType === 'FULL_CLOSE') return '全平';
    if (actionType === 'TP') return '止盈';
    if (actionType === 'SL') return '止损';
    if (actionType === 'CLOSE') return '平仓';
    return actionType;
  };

  return (
    <Card className="shrink-0 p-3">
      <div className="mb-2 flex items-center justify-between text-[12px] text-slate-300">
        <span className="text-[13px] font-semibold text-slate-100">交易记录</span>
        <Badge tone="info" className="text-[10px]">
          胜率 {winRate == null ? '--' : `${winRate.toFixed(2)}%`}
        </Badge>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-2">
        <div className="text-slate-300">
          <span className="text-[11px] text-slate-400">交易</span>{' '}
          <span className="text-[12px] font-semibold text-slate-100">{closedTrades.length}</span>
        </div>
        <div className="text-center text-slate-300">
          <span className="text-[11px] text-slate-400">盈利</span>{' '}
          <span className="text-[12px] font-semibold text-emerald-300">{wins}</span>
        </div>
        <div className="text-right text-slate-300">
          <span className="text-[11px] text-slate-400">亏损</span>{' '}
          <span className="text-[12px] font-semibold text-rose-300">{losses}</span>
        </div>
      </div>
      <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
        {recentActions.length === 0 ? (
          <div className="surface-muted px-2 py-1.5 text-[11px] text-slate-500">暂无交易记录</div>
        ) : (
          recentActions.map((a) => (
            <div key={a.id} className="surface-muted flex items-center justify-between px-2 py-1.5">
              <div className="text-[11px] text-slate-400">{new Date(a.createdAt).toLocaleTimeString('zh-CN', { hour12: false })}</div>
              <Badge
                tone={a.actionType === 'OPEN_LONG' ? 'success' : a.actionType === 'OPEN_SHORT' ? 'warning' : 'default'}
                className="px-2 py-0.5 text-[10px] font-semibold"
              >
                {formatActionText(a.actionType)}
              </Badge>
              <div className="text-[12px] font-semibold text-slate-100">¥{a.price.toFixed(2)}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
