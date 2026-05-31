'use client';

import { useEffect, useRef, useState } from 'react';
import { Session } from '@/types/training';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/Slider';

export function TradePanel({
  session,
  onAction,
  onEnd,
  busy = false,
}: {
  session: Session;
  onAction: (payload: {
    action?: 'BUY_LONG' | 'BUY_SHORT' | 'CLOSE' | 'HOLD';
    actionType?: 'OPEN_LONG' | 'OPEN_SHORT' | 'ADD_LONG' | 'ADD_SHORT' | 'PARTIAL_CLOSE' | 'FULL_CLOSE' | 'HOLD';
    positionPercent?: number;
    closePercent?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    clearStopLossPrice?: boolean;
    clearTakeProfitPrice?: boolean;
    updateRiskOnly?: boolean;
  }) => void;
  onEnd?: () => void;
  busy?: boolean;
}) {
  const parsePositivePrice = (raw: string): number | undefined => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return value;
  };

  const [positionPercent, setPositionPercent] = useState(0.1);
  const [closePercent, setClosePercent] = useState(100);
  const [stopLossInput, setStopLossInput] = useState('');
  const [takeProfitInput, setTakeProfitInput] = useState('');
  const prevHasPositionRef = useRef(Boolean(session.position));
  const ended = session.status !== 'ACTIVE';

  const hasPosition = Boolean(session.position);
  const longOpen = session.position?.side === 'LONG';
  const shortOpen = session.position?.side === 'SHORT';

  const canBuy = !ended && !hasPosition && !busy;
  const canAddLong = !ended && longOpen && !busy;
  const canAddShort = !ended && shortOpen && !busy;
  const canCloseLong = !ended && longOpen && !busy;
  const canCloseShort = !ended && shortOpen && !busy;
  const canCloseAny = !ended && hasPosition && !busy;
  const canHold = !ended && !busy;
  const canEnd = !ended && !busy;
  const stopLossPrice = parsePositivePrice(stopLossInput);
  const takeProfitPrice = parsePositivePrice(takeProfitInput);
  const currentStopLossPrice = session.position?.stopLossPrice;
  const currentTakeProfitPrice = session.position?.takeProfitPrice;
  const clearStopLossPrice = hasPosition && stopLossInput.trim() === '' && typeof currentStopLossPrice === 'number';
  const clearTakeProfitPrice = hasPosition && takeProfitInput.trim() === '' && typeof currentTakeProfitPrice === 'number';
  const canUpdateRisk =
    !ended &&
    hasPosition &&
    !busy &&
    (typeof stopLossPrice === 'number' || typeof takeProfitPrice === 'number' || clearStopLossPrice || clearTakeProfitPrice);

  useEffect(() => {
    const hadPosition = prevHasPositionRef.current;
    const hasPositionNow = Boolean(session.position);
    const lastActionType = session.actions[session.actions.length - 1]?.actionType;
    const shouldClearByCloseAction = ['CLOSE', 'TP', 'SL', 'LIQUIDATED'].includes(lastActionType ?? '');

    if ((hadPosition && !hasPositionNow) || (!hasPositionNow && shouldClearByCloseAction)) {
      setStopLossInput('');
      setTakeProfitInput('');
    }
    prevHasPositionRef.current = hasPositionNow;
  }, [session.position, session.actions]);

  useEffect(() => {
    if (!hasPosition) return;
    const nextStopLoss = typeof currentStopLossPrice === 'number' && Number.isFinite(currentStopLossPrice) ? String(currentStopLossPrice) : '';
    const nextTakeProfit = typeof currentTakeProfitPrice === 'number' && Number.isFinite(currentTakeProfitPrice) ? String(currentTakeProfitPrice) : '';
    setStopLossInput((prev) => (prev === nextStopLoss ? prev : nextStopLoss));
    setTakeProfitInput((prev) => (prev === nextTakeProfit ? prev : nextTakeProfit));
  }, [hasPosition, currentStopLossPrice, currentTakeProfitPrice]);

  return (
    <section className="surface-panel relative z-10 flex flex-col bg-[#0b152b] p-2 md:p-2.5">
      {ended ? <div className="surface-muted mb-1.5 px-2 py-1 text-[11px] text-slate-300 md:py-1.5">本局已结束，无法继续下单。</div> : null}

      <Card className="mb-1.5 shrink-0 p-2">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300 md:mb-1.5 md:text-[12px]">
          <span className="text-[11px] font-medium tracking-normal text-slate-300 md:text-[12px]">下单数量</span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 md:text-[11px]">
            <span>仓位 {(positionPercent * 100).toFixed(0)}%</span>
            <Badge tone="info">按当前价格估算</Badge>
          </div>
        </div>
        <Slider
          min={1}
          max={100}
          value={positionPercent * 100}
          onChange={(e) => setPositionPercent(Number(e.target.value) / 100)}
          className="slider-compact w-full"
          disabled={busy}
        />
        <div className="mt-1 grid grid-cols-5 gap-1 text-[10px] md:text-[11px]">
          <Button variant="outline" size="sm" className="h-7 px-0.5 text-[10px] md:px-0.5 md:text-[11px]" onClick={() => setPositionPercent(0.1)} disabled={busy}>10%</Button>
          <Button variant="outline" size="sm" className="h-7 px-0.5 text-[10px] md:px-0.5 md:text-[11px]" onClick={() => setPositionPercent(0.2)} disabled={busy}>20%</Button>
          <Button variant="outline" size="sm" className="h-7 px-0.5 text-[10px] md:px-0.5 md:text-[11px]" onClick={() => setPositionPercent(0.5)} disabled={busy}>50%</Button>
          <Button variant="outline" size="sm" className="col-span-2 h-7 px-0.5 text-[10px] md:px-0.5 md:text-[11px]" onClick={() => setPositionPercent(1)} disabled={busy}>100%</Button>
        </div>
        {hasPosition ? (
          <>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300 md:text-[12px]">
              <span className="text-[11px] font-medium tracking-normal text-slate-300 md:text-[12px]">平仓比例</span>
              <span className="text-[13px] font-semibold text-cyan-200">{closePercent}%</span>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {[25, 50, 75, 100].map((n) => (
                <Button key={n} variant={closePercent === n ? 'primary' : 'outline'} size="sm" className="h-8 text-[10px] md:text-[11px]" onClick={() => setClosePercent(n)} disabled={busy}>
                  {n}%
                </Button>
              ))}
            </div>
          </>
        ) : null}
        <div className="mt-1.5 grid grid-cols-1 gap-1.5 md:grid-cols-3">
          <Input
            type="number"
            step="any"
            className="h-7 px-2 text-[10px] md:text-[11px]"
            placeholder="止损"
            value={stopLossInput}
            onChange={(e) => setStopLossInput(e.target.value)}
            disabled={busy}
          />
          <Input
            type="number"
            step="any"
            className="h-7 px-2 text-[10px] md:text-[11px]"
            placeholder="止盈"
            value={takeProfitInput}
            onChange={(e) => setTakeProfitInput(e.target.value)}
            disabled={busy}
          />
          {hasPosition ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-xl border border-[rgba(100,141,199,0.3)] bg-[rgba(8,21,43,0.82)] px-2 !text-[10px] font-semibold text-slate-300 hover:border-[rgba(100,141,199,0.45)] hover:bg-[rgba(10,26,52,0.88)] disabled:opacity-40 md:!text-[11px]"
              onClick={() => onAction({ action: 'HOLD', stopLossPrice, takeProfitPrice, clearStopLossPrice, clearTakeProfitPrice, updateRiskOnly: true })}
              disabled={!canUpdateRisk}
            >
              更新
            </Button>
          ) : (
            <div />
          )}
        </div>
      </Card>

      <div className="mb-1.5 grid shrink-0 grid-cols-2 gap-1.5">
        <Button
          size="sm"
          disabled={!(canBuy || canAddLong)}
          variant="success"
          className="h-8.5 !bg-emerald-700/70 !shadow-none !text-[11px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={() =>
            onAction(
              hasPosition
                ? { actionType: 'ADD_LONG', positionPercent, stopLossPrice, takeProfitPrice }
                : { action: 'BUY_LONG', positionPercent, stopLossPrice, takeProfitPrice },
            )
          }
        >
          {hasPosition ? '加仓买涨' : '买涨'}
        </Button>
        <Button
          size="sm"
          disabled={!canCloseAny}
          variant="danger"
          className="h-8.5 !bg-rose-700/70 !shadow-none !text-[11px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={() => onAction({ actionType: 'PARTIAL_CLOSE', closePercent })}
        >
          部分平仓
        </Button>
        <Button
          size="sm"
          disabled={!(canBuy || canAddShort)}
          variant="warning"
          className="h-8.5 !bg-amber-700/70 !shadow-none !text-[11px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={() =>
            onAction(
              hasPosition
                ? { actionType: 'ADD_SHORT', positionPercent, stopLossPrice, takeProfitPrice }
                : { action: 'BUY_SHORT', positionPercent, stopLossPrice, takeProfitPrice },
            )
          }
        >
          {hasPosition ? '加仓买跌' : '买跌'}
        </Button>
        <Button
          size="sm"
          disabled={!canCloseAny}
          variant="outline"
          className="h-8.5 !text-[11px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={() => onAction({ actionType: 'FULL_CLOSE', closePercent: 100 })}
        >
          全部平仓
        </Button>
      </div>

      <Button
        size="sm"
        variant="primary"
        className="mb-1.5 h-9 w-full shrink-0 !bg-blue-700/80 !shadow-none !text-[11px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
        onClick={() => onAction({ action: 'HOLD', stopLossPrice, takeProfitPrice, clearStopLossPrice, clearTakeProfitPrice })}
        disabled={!canHold}
      >
        下一条
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="h-7 !text-[11px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
        onClick={onEnd}
        disabled={!canEnd}
      >
        结束
      </Button>
    </section>
  );
}
