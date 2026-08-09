import { BadRequestException } from '@nestjs/common';
import { Bar } from '../market-data/market-data.service';
import { type PositionSide } from '../common/domain-enums';

export const FEE_RATE = 0.0005;
export const SLIPPAGE_BPS = 5; // 0.05%

export function calcFloatingPnl(side: PositionSide, entryPrice: number, currentClose: number, amount: number): number {
  if (side === 'LONG') return ((currentClose - entryPrice) / entryPrice) * amount;
  return ((entryPrice - currentClose) / entryPrice) * amount;
}

export function applyExecutionPrice(price: number, side: PositionSide, phase: 'OPEN' | 'CLOSE'): number {
  const slip = SLIPPAGE_BPS / 10_000;
  // Adverse selection:
  // LONG open -> buy worse (higher), LONG close -> sell worse (lower)
  // SHORT open -> sell worse (lower), SHORT close -> buy worse (higher)
  if (side === 'LONG') {
    return phase === 'OPEN' ? price * (1 + slip) : price * (1 - slip);
  }
  return phase === 'OPEN' ? price * (1 - slip) : price * (1 + slip);
}

export function buildStopPrices(side: PositionSide, entryPrice: number, stopLossRatio?: number, takeProfitRatio?: number) {
  if (!stopLossRatio && !takeProfitRatio) return { stopLossPrice: null, takeProfitPrice: null };
  if (side === 'LONG') {
    return {
      stopLossPrice: stopLossRatio ? entryPrice * (1 - stopLossRatio) : null,
      takeProfitPrice: takeProfitRatio ? entryPrice * (1 + takeProfitRatio) : null,
    };
  }
  return {
    stopLossPrice: stopLossRatio ? entryPrice * (1 + stopLossRatio) : null,
    takeProfitPrice: takeProfitRatio ? entryPrice * (1 - takeProfitRatio) : null,
  };
}

export function ensureSeries(bars: Bar[], pointer: number) {
  if (!bars[pointer]) throw new BadRequestException('Session has ended');
}
