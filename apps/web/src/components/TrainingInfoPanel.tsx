import { Session } from '@/types/training';

export function TrainingInfoPanel({ session, viewTimeframe }: { session: Session; viewTimeframe: string }) {
  return <div className="space-y-1 rounded bg-slate-800 p-3 text-sm"><div>市场: 双盲</div><div>推进周期: {session.drivingTimeframe}</div><div>观察周期: {viewTimeframe}</div><div>进度: {session.pointer + 1}/{session.totalBars}</div></div>;
}
