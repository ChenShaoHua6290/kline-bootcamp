import { Session } from '@/types/training';

export function ReplayStatsPanel({ session }: { session: Session }) {
  const tradeCount = session.actions.filter((a) => ['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'TP', 'SL'].includes(a.actionType)).length;
  return <div className="rounded bg-slate-800 p-3 text-sm"><div>交易次数: {tradeCount}</div><div>最终资金: {session.finalBalance.toFixed(2)}</div><div>是否爆仓: {session.isLiquidated ? '是' : '否'}</div></div>;
}
