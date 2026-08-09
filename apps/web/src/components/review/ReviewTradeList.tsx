import { EmptyState } from '@/components/ui/EmptyState';

export function ReviewTradeList({
  trades,
  activeTradeId,
  onTradeClick,
  onTradeHover,
}: {
  trades: any[];
  activeTradeId?: string | null;
  onTradeClick?: (trade: any) => void;
  onTradeHover?: (trade: any | null) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-semibold text-cyan-300">交易记录</h3>
      {trades.length === 0 ? (
        <EmptyState title="暂无交易记录" className="min-h-[120px]" />
      ) : (
        <>
        <div className="space-y-2 sm:hidden">
          {trades.map((trade) => (
            <button
              key={trade.id}
              type="button"
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${activeTradeId === trade.id ? 'border-cyan-400/50 bg-cyan-500/12' : 'border-slate-700/80 bg-slate-900/50 hover:border-slate-500'}`}
              onClick={() => onTradeClick?.(trade)}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">{trade.direction === 'LONG' ? '买涨' : '买跌'}</span>
                <span className={`text-sm font-semibold ${(trade.pnl ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {trade.pnl == null ? '--' : `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>开仓 <span className="text-slate-200">{trade.openPrice?.toFixed?.(2) ?? '--'}</span></div>
                <div>平仓 <span className="text-slate-200">{trade.closePrice != null ? trade.closePrice.toFixed(2) : '--'}</span></div>
                <div className="col-span-2">原因 <span className="text-slate-200">{trade.closeReason ?? '--'}</span></div>
              </div>
            </button>
          ))}
        </div>
        <div className="hidden max-h-[400px] overflow-auto rounded-xl border border-slate-700/80 sm:block">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead className="bg-slate-900/80 text-[12px] text-slate-400">
              <tr>
                <th className="px-3 py-2">方向</th>
                <th className="px-3 py-2">开仓价</th>
                <th className="px-3 py-2">平仓价</th>
                <th className="px-3 py-2">盈亏</th>
                <th className="px-3 py-2">原因</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className={`cursor-pointer border-t border-slate-800 transition ${activeTradeId === trade.id ? 'bg-cyan-500/10' : 'hover:bg-slate-800/60'}`}
                  onClick={() => onTradeClick?.(trade)}
                  onMouseEnter={() => onTradeHover?.(trade)}
                  onMouseLeave={() => onTradeHover?.(null)}
                >
                  <td className="px-3 py-2">{trade.direction === 'LONG' ? '买涨' : '买跌'}</td>
                  <td className="px-3 py-2">{trade.openPrice?.toFixed?.(2) ?? '--'}</td>
                  <td className="px-3 py-2">{trade.closePrice != null ? trade.closePrice.toFixed(2) : '--'}</td>
                  <td className={`px-3 py-2 ${(trade.pnl ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {trade.pnl == null ? '--' : `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}`}
                  </td>
                  <td className="px-3 py-2">{trade.closeReason ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
