import { Session } from '@/types/training';

export function TradeHistoryList({ session }: { session: Session }) {
  const items = session.actions.slice().reverse();

  return (
    <div className="surface-panel p-3">
      <div className="mb-2 text-sm font-semibold text-slate-100">操作记录</div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-xs">
        {items.length === 0 ? <div className="surface-muted px-2 py-1.5 text-slate-400">暂无记录</div> : null}
        {items.map((a) => (
          <div key={a.id} className="surface-muted flex items-center justify-between px-2 py-1.5">
            <span className="text-slate-300">{a.actionType}</span>
            <span className="font-semibold text-slate-100">¥{a.price.toFixed(2)}</span>
            <span className={`${(a.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {a.pnl !== null && a.pnl !== undefined ? `PNL ${a.pnl.toFixed(2)}` : '--'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
