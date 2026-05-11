import { Session } from '@/types/training';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function TradeStatsPanel({ session }: { session: Session }) {
  const tradeActions = session.actions.filter((a) => ['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'TP', 'SL'].includes(a.actionType));
  const closedTrades = tradeActions.filter((a) => ['CLOSE', 'TP', 'SL'].includes(a.actionType));
  const wins = closedTrades.filter((a) => (a.pnl ?? 0) > 0).length;
  const losses = closedTrades.filter((a) => (a.pnl ?? 0) < 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
  const recentActions = tradeActions.slice().reverse();

  const formatActionText = (actionType: string) => {
    if (actionType === 'OPEN_LONG') return '买涨';
    if (actionType === 'OPEN_SHORT') return '买跌';
    if (actionType === 'TP') return '止盈';
    if (actionType === 'SL') return '止损';
    if (actionType === 'CLOSE') return '平仓';
    return actionType;
  };

  return (
    <Card className="shrink-0 p-2">
      <div className="mb-2 flex items-center justify-between text-[11px] text-slate-300">
        <span className="text-[13px] font-semibold text-slate-100">交易记录</span>
        <Badge tone="info">{closedTrades.length} 笔</Badge>
      </div>
      <div className="mb-1.5 grid grid-cols-2 gap-1.5">
        <div className="text-slate-300">
          <span className="text-[10px] text-slate-400">总交易次数:</span> <span className="text-[11px] font-semibold text-slate-100">{closedTrades.length}</span>
        </div>
        <div className="text-right text-[11px] font-semibold text-rose-300">{winRate.toFixed(2)}%</div>
        <div className="text-slate-300">
          <span className="text-[10px] text-slate-400">盈利次数:</span> <span className="text-[11px] font-semibold text-emerald-300">{wins}</span>
        </div>
        <div className="text-right text-slate-300">
          <span className="text-[10px] text-slate-400">亏损次数:</span> <span className="text-[11px] font-semibold text-rose-300">{losses}</span>
        </div>
      </div>
      <div className="max-h-24 space-y-1 overflow-y-auto pr-1">
        {recentActions.length === 0 ? (
          <div className="surface-muted px-2 py-1.5 text-[10px] text-slate-500">暂无交易记录</div>
        ) : (
          recentActions.map((a) => (
            <div key={a.id} className="surface-muted flex items-center justify-between px-2 py-1.5">
              <div className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleTimeString('zh-CN', { hour12: false })}</div>
              <Badge
                tone={a.actionType === 'OPEN_LONG' ? 'success' : a.actionType === 'OPEN_SHORT' ? 'warning' : 'default'}
                className="px-2 py-0.5 text-[10px] font-semibold"
              >
                {formatActionText(a.actionType)}
              </Badge>
              <div className="text-[11px] font-semibold text-slate-100">¥{a.price.toFixed(2)}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
