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
  const [stopLossPrice, setStopLossPrice] = useState<number | undefined>();
  const [takeProfitPrice, setTakeProfitPrice] = useState<number | undefined>();
  const prevHasPositionRef = useRef(Boolean(session.position));
  const ended = session.status !== 'ACTIVE';

  const lastBar = session.barsData?.[session.pointer];
  const currentPrice = lastBar?.close ?? 0;
  const quantity = Math.max(1, Math.round((session.finalBalance * positionPercent) / Math.max(currentPrice, 0.0001)));
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

  useEffect(() => {
    const hadPosition = prevHasPositionRef.current;
    const hasPositionNow = Boolean(session.position);
    const lastActionType = session.actions[session.actions.length - 1]?.actionType;
    const shouldClearByCloseAction = ['CLOSE', 'TP', 'SL', 'LIQUIDATED'].includes(lastActionType ?? '');

    if ((hadPosition && !hasPositionNow) || (!hasPositionNow && shouldClearByCloseAction)) {
      setStopLossPrice(undefined);
      setTakeProfitPrice(undefined);
    }
    prevHasPositionRef.current = hasPositionNow;
  }, [session.position, session.actions]);

  return (
    <section className="surface-panel relative z-10 flex flex-col bg-[#0b152b] p-2 md:p-2.5">
      {ended ? <div className="surface-muted mb-1.5 px-2 py-1 text-[11px] text-slate-300 md:py-1.5">本局已结束，无法继续下单。</div> : null}

      <Card className="mb-1.5 shrink-0 p-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-slate-300 md:mb-1.5 md:text-[11px]">
          <span className="field-label normal-case tracking-normal">下单数量</span>
          <span className="text-sm font-semibold text-slate-100">{quantity}</span>
        </div>
        <Slider
          min={1}
          max={100}
          value={positionPercent * 100}
          onChange={(e) => setPositionPercent(Number(e.target.value) / 100)}
          className="h-2 w-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(6,182,212,0.14)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4"
          disabled={busy}
        />
        <div className="mt-1 grid grid-cols-6 gap-1 text-[9px]">
          <Button variant="outline" size="sm" className="h-8 px-1 text-[9px] md:px-1" onClick={() => setPositionPercent(0.5)} disabled={busy}>1/2</Button>
          <Button variant="outline" size="sm" className="h-8 px-1 text-[9px] md:px-1" onClick={() => setPositionPercent(1 / 3)} disabled={busy}>1/3</Button>
          <Button variant="outline" size="sm" className="h-8 px-1 text-[9px] md:px-1" onClick={() => setPositionPercent(0.25)} disabled={busy}>1/4</Button>
          <Button variant="outline" size="sm" className="h-8 px-1 text-[9px] md:px-1" onClick={() => setPositionPercent(0.2)} disabled={busy}>1/5</Button>
          <Button variant="outline" size="sm" className="col-span-2 h-8 px-1 text-[9px] md:px-1.5" onClick={() => setPositionPercent(1)} disabled={busy}>全部</Button>
        </div>
        {hasPosition ? (
          <>
            <div className="mt-2 flex items-center justify-between text-[9px] text-slate-300 md:text-[10px]">
              <span className="field-label normal-case tracking-normal">平仓比例</span>
              <span className="text-[13px] font-semibold text-cyan-200">{closePercent}%</span>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {[25, 50, 75, 100].map((n) => (
                <Button key={n} variant={closePercent === n ? 'primary' : 'outline'} size="sm" className="h-8 text-[9px]" onClick={() => setClosePercent(n)} disabled={busy}>
                  {n}%
                </Button>
              ))}
            </div>
          </>
        ) : null}
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Input
            type="number"
            step="0.01"
            className="h-7 px-2 text-[10px] md:text-[11px]"
            placeholder="止损点位 95.50"
            value={stopLossPrice ?? ''}
            onChange={(e) => setStopLossPrice(parsePositivePrice(e.target.value))}
            disabled={busy}
          />
          <Input
            type="number"
            step="0.01"
            className="h-7 px-2 text-[10px] md:text-[11px]"
            placeholder="止盈点位 108.80"
            value={takeProfitPrice ?? ''}
            onChange={(e) => setTakeProfitPrice(parsePositivePrice(e.target.value))}
            disabled={busy}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
          <span>仓位比例 {(positionPercent * 100).toFixed(0)}%</span>
          <Badge tone="info">按当前价格估算</Badge>
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
        onClick={() => onAction({ action: 'HOLD', stopLossPrice, takeProfitPrice })}
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
