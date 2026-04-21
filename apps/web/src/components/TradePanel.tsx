'use client';
import { useState } from 'react';
import { Session } from '@/types/training';

export function TradePanel({ session, onAction }: { session: Session; onAction: (payload: any) => void }) {
  const [positionPercent, setPositionPercent] = useState(0.1);
  const [stopLossRatio, setStopLossRatio] = useState<number | undefined>();
  const [takeProfitRatio, setTakeProfitRatio] = useState<number | undefined>();

  return (
    <div className="space-y-2 rounded bg-slate-800 p-3 text-sm">
      {!session.position ? (
        <>
          <div>仓位: {(positionPercent * 100).toFixed(0)}%</div>
          <input type="range" min={1} max={100} value={positionPercent * 100} onChange={(e) => setPositionPercent(Number(e.target.value) / 100)} />
          <input className="w-full bg-slate-700 p-1" placeholder="止损比例 0.05" onChange={(e) => setStopLossRatio(Number(e.target.value) || undefined)} />
          <input className="w-full bg-slate-700 p-1" placeholder="止盈比例 0.1" onChange={(e) => setTakeProfitRatio(Number(e.target.value) || undefined)} />
          <div className="flex gap-2">
            <button className="flex-1 rounded bg-emerald-600 py-1" onClick={() => onAction({ action: 'BUY_LONG', positionPercent, stopLossRatio, takeProfitRatio })}>买涨</button>
            <button className="flex-1 rounded bg-rose-600 py-1" onClick={() => onAction({ action: 'BUY_SHORT', positionPercent, stopLossRatio, takeProfitRatio })}>买跌</button>
          </div>
        </>
      ) : (
        <button className="w-full rounded bg-yellow-600 py-1" onClick={() => onAction({ action: 'CLOSE' })}>平仓</button>
      )}
      <button className="w-full rounded bg-blue-600 py-1" onClick={() => onAction({ action: 'HOLD' })}>观望（下一根）</button>
    </div>
  );
}
