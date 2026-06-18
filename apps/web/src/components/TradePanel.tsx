'use client';

import { useEffect, useRef, useState } from 'react';
import { Session } from '@/types/training';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/Slider';
import { Modal } from '@/components/ui/Modal';

type RiskMode = 'price' | 'percent';
type RiskSide = 'LONG' | 'SHORT';
type RiskKind = 'stopLoss' | 'takeProfit';

function parsePositiveNumber(raw: string): number | undefined {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

function formatRiskPrice(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '--';
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

function calculateRiskPrice(side: RiskSide, kind: RiskKind, basePrice: number | undefined, percent: number | undefined) {
  if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice <= 0) return undefined;
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent <= 0) return undefined;
  const ratio = percent / 100;
  const next =
    side === 'LONG'
      ? kind === 'stopLoss'
        ? basePrice * (1 - ratio)
        : basePrice * (1 + ratio)
      : kind === 'stopLoss'
        ? basePrice * (1 + ratio)
        : basePrice * (1 - ratio);
  return next > 0 && Number.isFinite(next) ? next : undefined;
}

function calculateRiskPercent(side: RiskSide, kind: RiskKind, basePrice: number | undefined, price: number | undefined) {
  if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice <= 0) return '';
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return '';
  const ratio =
    side === 'LONG'
      ? kind === 'stopLoss'
        ? (basePrice - price) / basePrice
        : (price - basePrice) / basePrice
      : kind === 'stopLoss'
        ? (price - basePrice) / basePrice
        : (basePrice - price) / basePrice;
  if (!Number.isFinite(ratio) || ratio <= 0) return '';
  return (ratio * 100).toFixed(4).replace(/\.?0+$/, '');
}

function riskSideLabel(side: RiskSide) {
  return side === 'LONG' ? '买涨' : '买跌';
}

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
  const [positionPercent, setPositionPercent] = useState(0.1);
  const [closePercent, setClosePercent] = useState(100);
  const [showClosePercent, setShowClosePercent] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [riskMode, setRiskMode] = useState<RiskMode>('price');
  const [riskSide, setRiskSide] = useState<RiskSide>('LONG');
  const [stopLossInput, setStopLossInput] = useState('');
  const [takeProfitInput, setTakeProfitInput] = useState('');
  const [stopLossPercentInput, setStopLossPercentInput] = useState('');
  const [takeProfitPercentInput, setTakeProfitPercentInput] = useState('');
  const [draftRiskMode, setDraftRiskMode] = useState<RiskMode>('price');
  const [draftRiskSide, setDraftRiskSide] = useState<RiskSide>('LONG');
  const [draftStopLossInput, setDraftStopLossInput] = useState('');
  const [draftTakeProfitInput, setDraftTakeProfitInput] = useState('');
  const [draftStopLossPercentInput, setDraftStopLossPercentInput] = useState('');
  const [draftTakeProfitPercentInput, setDraftTakeProfitPercentInput] = useState('');
  const prevHasPositionRef = useRef(Boolean(session.position));
  const ended = session.status !== 'ACTIVE';

  const hasPosition = Boolean(session.position);
  const longOpen = session.position?.side === 'LONG';
  const shortOpen = session.position?.side === 'SHORT';
  const currentMarketPrice = session.barsData?.[Math.max(0, Math.min(session.pointer, session.barsData.length - 1))]?.close;

  const canBuy = !ended && !hasPosition && !busy;
  const canAddLong = !ended && longOpen && !busy;
  const canAddShort = !ended && shortOpen && !busy;
  const canCloseLong = !ended && longOpen && !busy;
  const canCloseShort = !ended && shortOpen && !busy;
  const canCloseAny = !ended && hasPosition && !busy;
  const canHold = !ended && !busy;
  const canEnd = !ended && !busy;
  const currentStopLossPrice = session.position?.stopLossPrice;
  const currentTakeProfitPrice = session.position?.takeProfitPrice;
  const committedRiskSide = session.position?.side ?? riskSide;
  const committedRiskBasePrice = hasPosition ? session.position?.entryPrice : currentMarketPrice;

  useEffect(() => {
    const hadPosition = prevHasPositionRef.current;
    const hasPositionNow = Boolean(session.position);
    const lastActionType = session.actions[session.actions.length - 1]?.actionType;
    const shouldClearByCloseAction = ['CLOSE', 'TP', 'SL', 'LIQUIDATED'].includes(lastActionType ?? '');

    if ((hadPosition && !hasPositionNow) || (!hasPositionNow && shouldClearByCloseAction)) {
      setStopLossInput('');
      setTakeProfitInput('');
      setStopLossPercentInput('');
      setTakeProfitPercentInput('');
      setShowClosePercent(false);
    }
    prevHasPositionRef.current = hasPositionNow;
  }, [session.position, session.actions]);

  useEffect(() => {
    const position = session.position;
    if (!position) return;
    setRiskSide(position.side);
    const nextStopLoss = typeof currentStopLossPrice === 'number' && Number.isFinite(currentStopLossPrice) ? String(currentStopLossPrice) : '';
    const nextTakeProfit = typeof currentTakeProfitPrice === 'number' && Number.isFinite(currentTakeProfitPrice) ? String(currentTakeProfitPrice) : '';
    setStopLossInput((prev) => (prev === nextStopLoss ? prev : nextStopLoss));
    setTakeProfitInput((prev) => (prev === nextTakeProfit ? prev : nextTakeProfit));
    if (riskMode === 'percent') {
      setStopLossPercentInput(calculateRiskPercent(position.side, 'stopLoss', position.entryPrice, currentStopLossPrice));
      setTakeProfitPercentInput(calculateRiskPercent(position.side, 'takeProfit', position.entryPrice, currentTakeProfitPrice));
    }
  }, [hasPosition, session.position?.side, session.position?.entryPrice, currentStopLossPrice, currentTakeProfitPrice, riskMode]);

  const resolveRiskValues = (
    mode: RiskMode,
    side: RiskSide,
    basePrice: number | undefined,
    stopLossRaw: string,
    takeProfitRaw: string,
    stopLossPercentRaw: string,
    takeProfitPercentRaw: string,
  ) => {
    const stopLossBlank = mode === 'price' ? stopLossRaw.trim() === '' : stopLossPercentRaw.trim() === '';
    const takeProfitBlank = mode === 'price' ? takeProfitRaw.trim() === '' : takeProfitPercentRaw.trim() === '';
    const stopLossPrice =
      mode === 'price'
        ? parsePositiveNumber(stopLossRaw)
        : calculateRiskPrice(side, 'stopLoss', basePrice, parsePositiveNumber(stopLossPercentRaw));
    const takeProfitPrice =
      mode === 'price'
        ? parsePositiveNumber(takeProfitRaw)
        : calculateRiskPrice(side, 'takeProfit', basePrice, parsePositiveNumber(takeProfitPercentRaw));
    return { stopLossPrice, takeProfitPrice, stopLossBlank, takeProfitBlank };
  };

  const buildRiskPayload = (
    mode: RiskMode,
    side: RiskSide,
    stopLossRaw: string,
    takeProfitRaw: string,
    stopLossPercentRaw: string,
    takeProfitPercentRaw: string,
  ) => {
    const basePrice = hasPosition ? session.position?.entryPrice : currentMarketPrice;
    const risk = resolveRiskValues(mode, side, basePrice, stopLossRaw, takeProfitRaw, stopLossPercentRaw, takeProfitPercentRaw);
    return {
      stopLossPrice: risk.stopLossPrice,
      takeProfitPrice: risk.takeProfitPrice,
      clearStopLossPrice: hasPosition && risk.stopLossBlank && typeof currentStopLossPrice === 'number',
      clearTakeProfitPrice: hasPosition && risk.takeProfitBlank && typeof currentTakeProfitPrice === 'number',
    };
  };

  const buildCommittedRiskPayload = (side: RiskSide) =>
    buildRiskPayload(riskMode, side, stopLossInput, takeProfitInput, stopLossPercentInput, takeProfitPercentInput);

  const buildDraftRiskPayload = () =>
    buildRiskPayload(
      draftRiskMode,
      hasPosition ? session.position?.side ?? draftRiskSide : draftRiskSide,
      draftStopLossInput,
      draftTakeProfitInput,
      draftStopLossPercentInput,
      draftTakeProfitPercentInput,
    );

  const committedRisk = resolveRiskValues(
    riskMode,
    committedRiskSide,
    committedRiskBasePrice,
    stopLossInput,
    takeProfitInput,
    stopLossPercentInput,
    takeProfitPercentInput,
  );
  const displayStopLossPrice = hasPosition && typeof currentStopLossPrice === 'number' ? currentStopLossPrice : committedRisk.stopLossPrice;
  const displayTakeProfitPrice = hasPosition && typeof currentTakeProfitPrice === 'number' ? currentTakeProfitPrice : committedRisk.takeProfitPrice;
  const draftRiskSideForPreview = hasPosition ? session.position?.side ?? draftRiskSide : draftRiskSide;
  const draftRiskBasePrice = hasPosition ? session.position?.entryPrice : currentMarketPrice;
  const draftRisk = resolveRiskValues(
    draftRiskMode,
    draftRiskSideForPreview,
    draftRiskBasePrice,
    draftStopLossInput,
    draftTakeProfitInput,
    draftStopLossPercentInput,
    draftTakeProfitPercentInput,
  );
  const draftCanUpdateRisk =
    !ended &&
    hasPosition &&
    !busy &&
    (typeof draftRisk.stopLossPrice === 'number' ||
      typeof draftRisk.takeProfitPrice === 'number' ||
      (draftRisk.stopLossBlank && typeof currentStopLossPrice === 'number') ||
      (draftRisk.takeProfitBlank && typeof currentTakeProfitPrice === 'number'));

  const openRiskModal = () => {
    const nextSide = session.position?.side ?? riskSide;
    const nextBasePrice = hasPosition ? session.position?.entryPrice : currentMarketPrice;
    setDraftRiskMode(riskMode);
    setDraftRiskSide(nextSide);
    setDraftStopLossInput(stopLossInput);
    setDraftTakeProfitInput(takeProfitInput);
    setDraftStopLossPercentInput(
      stopLossPercentInput || calculateRiskPercent(nextSide, 'stopLoss', nextBasePrice, parsePositiveNumber(stopLossInput)),
    );
    setDraftTakeProfitPercentInput(
      takeProfitPercentInput || calculateRiskPercent(nextSide, 'takeProfit', nextBasePrice, parsePositiveNumber(takeProfitInput)),
    );
    setRiskModalOpen(true);
  };

  const clearDraftRisk = () => {
    setDraftStopLossInput('');
    setDraftTakeProfitInput('');
    setDraftStopLossPercentInput('');
    setDraftTakeProfitPercentInput('');
  };

  const saveDraftRisk = () => {
    const payload = buildDraftRiskPayload();
    setRiskMode(draftRiskMode);
    setRiskSide(hasPosition ? session.position?.side ?? draftRiskSide : draftRiskSide);
    setStopLossInput(draftStopLossInput.trim());
    setTakeProfitInput(draftTakeProfitInput.trim());
    setStopLossPercentInput(draftStopLossPercentInput.trim());
    setTakeProfitPercentInput(draftTakeProfitPercentInput.trim());
    setRiskModalOpen(false);
    if (hasPosition) {
      onAction({ action: 'HOLD', ...payload, updateRiskOnly: true });
    }
  };

  return (
    <section className="surface-panel relative z-10 flex flex-col bg-[#0b152b] p-1.5 md:p-2.5">
      {ended ? <div className="surface-muted mb-1 px-2 py-1 text-[11px] text-slate-300 md:mb-1.5 md:py-1.5">本局已结束，无法继续下单。</div> : null}

      <Card className="mb-1 shrink-0 p-1.5 md:mb-1.5 md:p-2">
        <div className="grid grid-cols-[34px_repeat(4,minmax(0,1fr))_48px] items-center gap-1 md:hidden">
          <span className="text-[11px] font-medium text-slate-300">仓位</span>
          {[10, 20, 50, 100].map((n) => {
            const active = Math.round(positionPercent * 100) === n;
            return (
              <button
                key={n}
                type="button"
                className={`h-8 rounded-lg border px-0.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  active
                    ? 'border-cyan-300/65 bg-cyan-500/18 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.12)]'
                    : 'border-slate-700/75 bg-slate-950/45 text-slate-300 hover:border-slate-500'
                }`}
                onClick={() => setPositionPercent(n / 100)}
                disabled={busy}
              >
                {n}%
              </button>
            );
          })}
          <span className="inline-flex h-8 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-1 text-[10px] font-semibold text-cyan-100">
            当前价
          </span>
        </div>
        <div className="mb-1 hidden items-center justify-between gap-2 text-[11px] text-slate-300 md:mb-1.5 md:flex md:text-[12px]">
          <span className="text-[11px] font-medium tracking-normal text-slate-300 md:text-[12px]">下单数量</span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 md:text-[11px]">
            <span>仓位 {(positionPercent * 100).toFixed(0)}%</span>
            <Badge tone="info" className="whitespace-nowrap">按当前价</Badge>
          </div>
        </div>
        <Slider
          min={1}
          max={100}
          value={positionPercent * 100}
          onChange={(e) => setPositionPercent(Number(e.target.value) / 100)}
          className="slider-compact hidden w-full md:block"
          disabled={busy}
        />
        <div className="mt-1 hidden grid-cols-4 gap-1 text-[10px] md:grid md:grid-cols-5 md:text-[11px]">
          <Button variant="outline" size="sm" className="h-6 px-0.5 text-[10px] md:h-7 md:px-0.5 md:text-[11px]" onClick={() => setPositionPercent(0.1)} disabled={busy}>10%</Button>
          <Button variant="outline" size="sm" className="h-6 px-0.5 text-[10px] md:h-7 md:px-0.5 md:text-[11px]" onClick={() => setPositionPercent(0.2)} disabled={busy}>20%</Button>
          <Button variant="outline" size="sm" className="h-6 px-0.5 text-[10px] md:h-7 md:px-0.5 md:text-[11px]" onClick={() => setPositionPercent(0.5)} disabled={busy}>50%</Button>
          <Button variant="outline" size="sm" className="h-6 px-0.5 text-[10px] md:col-span-2 md:h-7 md:px-0.5 md:text-[11px]" onClick={() => setPositionPercent(1)} disabled={busy}>100%</Button>
        </div>
        {hasPosition && showClosePercent ? (
          <div className="hidden md:block">
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300 md:text-[12px]">
              <span className="text-[11px] font-medium tracking-normal text-slate-300 md:text-[12px]">平仓比例</span>
              <span className="text-[13px] font-semibold text-cyan-200">{closePercent}%</span>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {[25, 50, 75, 100].map((n) => (
                <Button key={n} variant={closePercent === n ? 'primary' : 'outline'} size="sm" className="h-7 text-[10px] md:h-8 md:text-[11px]" onClick={() => setClosePercent(n)} disabled={busy}>
                  {n}%
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/35 px-2 py-1 text-[10px] md:mt-2 md:py-1.5 md:text-[11px]">
          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 text-slate-500">
            <div className="min-w-0 truncate">
              止损 <span className="font-semibold text-rose-200">{formatRiskPrice(displayStopLossPrice)}</span>
            </div>
            <span className="text-slate-700">/</span>
            <div className="min-w-0 truncate">
              止盈 <span className="font-semibold text-emerald-200">{formatRiskPrice(displayTakeProfitPrice)}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 shrink-0 rounded-lg border border-[rgba(100,141,199,0.3)] bg-[rgba(8,21,43,0.82)] px-2 !text-[10px] font-semibold text-slate-300 hover:border-cyan-400/45 hover:bg-cyan-500/10 hover:text-cyan-100 disabled:opacity-40 md:!text-[11px]"
            onClick={openRiskModal}
            disabled={ended || busy}
          >
            设置
          </Button>
        </div>
      </Card>

      <div className="mb-2 grid shrink-0 grid-cols-[minmax(0,1fr)_86px] gap-2 border-b border-slate-700/60 pb-2 md:hidden">
        <Button
          size="sm"
          variant="primary"
          className="h-11 w-full !bg-blue-700/85 !shadow-none !text-[13px] font-semibold disabled:opacity-40"
          onClick={() => onAction({ action: 'HOLD', ...buildCommittedRiskPayload(committedRiskSide) })}
          disabled={!canHold}
        >
          下一条
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-11 w-full !text-[12px] font-semibold disabled:opacity-40"
          onClick={onEnd}
          disabled={!canEnd}
        >
          结束
        </Button>
      </div>

      {hasPosition && showClosePercent ? (
        <div className="mb-2 rounded-xl border border-slate-700/70 bg-slate-950/35 p-1.5 md:hidden">
          <div className="mb-1 flex items-center justify-between px-0.5 text-[11px] text-slate-300">
            <span className="font-medium">平仓比例</span>
            <span className="text-[13px] font-semibold text-cyan-200">{closePercent}%</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[25, 50, 75, 100].map((n) => (
              <Button
                key={n}
                variant={closePercent === n ? 'primary' : 'outline'}
                size="sm"
                className="h-9 !text-[11px] font-semibold"
                onClick={() => setClosePercent(n)}
                disabled={busy}
              >
                {n}%
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-1 grid shrink-0 grid-cols-4 gap-1 md:mb-1.5 md:grid-cols-2 md:gap-1.5">
        <Button
          size="sm"
          disabled={!(canBuy || canAddLong)}
          variant="success"
          className="h-9 px-0.5 !bg-emerald-700/70 !shadow-none !text-[10px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={() => {
            const riskPayload = buildCommittedRiskPayload('LONG');
            onAction(
              hasPosition
                ? { actionType: 'ADD_LONG', positionPercent, ...riskPayload }
                : { action: 'BUY_LONG', positionPercent, ...riskPayload },
            );
          }}
        >
          {hasPosition ? '加仓买涨' : '买涨'}
        </Button>
        <Button
          size="sm"
          disabled={!canCloseAny}
          variant="danger"
          className="h-9 px-0.5 !bg-rose-700/70 !shadow-none !text-[10px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={() => {
            if (!showClosePercent) {
              setShowClosePercent(true);
              return;
            }
            onAction({ actionType: 'PARTIAL_CLOSE', closePercent });
          }}
        >
          {showClosePercent ? '确认平仓' : '部分平仓'}
        </Button>
        <Button
          size="sm"
          disabled={!(canBuy || canAddShort)}
          variant="warning"
          className="h-9 px-0.5 !bg-amber-700/70 !shadow-none !text-[10px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={() => {
            const riskPayload = buildCommittedRiskPayload('SHORT');
            onAction(
              hasPosition
                ? { actionType: 'ADD_SHORT', positionPercent, ...riskPayload }
                : { action: 'BUY_SHORT', positionPercent, ...riskPayload },
            );
          }}
        >
          {hasPosition ? '加仓买跌' : '买跌'}
        </Button>
        <Button
          size="sm"
          disabled={!canCloseAny}
          variant="outline"
          className="h-9 px-0.5 !text-[10px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={() => {
            setShowClosePercent(false);
            onAction({ actionType: 'FULL_CLOSE', closePercent: 100 });
          }}
        >
          全部平仓
        </Button>
      </div>

      <div className="hidden shrink-0 md:block">
        <Button
          size="sm"
          variant="primary"
          className="h-9 w-full !bg-blue-700/80 !shadow-none !text-[11px] font-semibold disabled:opacity-40 md:mb-1.5 md:h-7 md:!text-[12px]"
          onClick={() => onAction({ action: 'HOLD', ...buildCommittedRiskPayload(committedRiskSide) })}
          disabled={!canHold}
        >
          下一条
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-9 w-full !text-[11px] font-semibold disabled:opacity-40 md:h-7 md:!text-[12px]"
          onClick={onEnd}
          disabled={!canEnd}
        >
          结束
        </Button>
      </div>

      <Modal open={riskModalOpen} onClose={() => setRiskModalOpen(false)} className="max-w-md p-0" maskClosable={false}>
        <div className="border-b border-slate-800 px-4 py-3">
          <div className="text-sm font-semibold text-slate-100">设置止盈止损</div>
          <div className="mt-1 text-xs text-slate-500">
            {hasPosition ? `当前持仓：${riskSideLabel(session.position?.side ?? draftRiskSide)} · 成本 ${formatRiskPrice(session.position?.entryPrice)}` : `未持仓，按当前价 ${formatRiskPrice(currentMarketPrice)} 预估`}
          </div>
        </div>
        <div className="space-y-3 px-4 py-3">
          {!hasPosition ? (
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-400">预估方向</div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant={draftRiskSide === 'LONG' ? 'success' : 'ghost'} onClick={() => setDraftRiskSide('LONG')}>
                  买涨
                </Button>
                <Button size="sm" variant={draftRiskSide === 'SHORT' ? 'warning' : 'ghost'} onClick={() => setDraftRiskSide('SHORT')}>
                  买跌
                </Button>
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-400">设置方式</div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant={draftRiskMode === 'price' ? 'primary' : 'ghost'} onClick={() => setDraftRiskMode('price')}>
                按点位
              </Button>
              <Button size="sm" variant={draftRiskMode === 'percent' ? 'primary' : 'ghost'} onClick={() => setDraftRiskMode('percent')}>
                按百分比
              </Button>
            </div>
          </div>

          {draftRiskMode === 'price' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-slate-400">止损点位</div>
                <Input
                  type="number"
                  step="any"
                  value={draftStopLossInput}
                  onChange={(event) => setDraftStopLossInput(event.target.value)}
                  placeholder={draftRiskSideForPreview === 'LONG' ? '低于开仓价' : '高于开仓价'}
                  disabled={busy}
                />
              </label>
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-slate-400">止盈点位</div>
                <Input
                  type="number"
                  step="any"
                  value={draftTakeProfitInput}
                  onChange={(event) => setDraftTakeProfitInput(event.target.value)}
                  placeholder={draftRiskSideForPreview === 'LONG' ? '高于开仓价' : '低于开仓价'}
                  disabled={busy}
                />
              </label>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-slate-400">止损比例</div>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    value={draftStopLossPercentInput}
                    onChange={(event) => setDraftStopLossPercentInput(event.target.value)}
                    placeholder="例如 2"
                    className="pr-8"
                    disabled={busy}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                </div>
              </label>
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-slate-400">止盈比例</div>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    value={draftTakeProfitPercentInput}
                    onChange={(event) => setDraftTakeProfitPercentInput(event.target.value)}
                    placeholder="例如 4"
                    className="pr-8"
                    disabled={busy}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                </div>
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-700/70 bg-slate-950/45 p-2 text-xs">
            <div>
              <div className="text-slate-500">止损预览</div>
              <div className="mt-0.5 font-semibold text-rose-200">{formatRiskPrice(draftRisk.stopLossPrice)}</div>
            </div>
            <div>
              <div className="text-slate-500">止盈预览</div>
              <div className="mt-0.5 font-semibold text-emerald-200">{formatRiskPrice(draftRisk.takeProfitPrice)}</div>
            </div>
          </div>

          {hasPosition ? (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs leading-5 text-cyan-100/80">
              保存后会立即更新当前持仓的止盈止损。
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 px-3 py-2 text-xs leading-5 text-slate-400">
              未持仓时先保存设置，点击买涨或买跌时会按实际方向换算并带入。
            </div>
          )}
        </div>
        <div className="flex justify-between gap-2 border-t border-slate-800 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={clearDraftRisk} disabled={busy}>
            清空
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRiskModalOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={saveDraftRisk} disabled={busy || (hasPosition && !draftCanUpdateRisk)}>
              保存设置
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
