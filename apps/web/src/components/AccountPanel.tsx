import { Session } from '@/types/training';

export function AccountPanel({ session }: { session: Session }) {
  return <div className="space-y-1 rounded bg-slate-800 p-3 text-sm"><div>余额: {session.finalBalance.toFixed(2)}</div><div>持仓方向: {session.position?.side ?? '无'}</div><div>爆仓次数: {session.resetCount}</div></div>;
}
