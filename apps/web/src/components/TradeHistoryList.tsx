import { Session } from '@/types/training';

export function TradeHistoryList({ session }: { session: Session }) {
  return <div className="space-y-1 rounded bg-slate-800 p-3 text-xs">{session.actions.map((a) => <div key={a.id}>{a.actionType} @ {a.price.toFixed(2)} {a.pnl ? `PNL ${a.pnl.toFixed(2)}` : ''}</div>)}</div>;
}
