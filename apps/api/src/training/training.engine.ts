import { BadRequestException } from '@nestjs/common';
import { PositionSide } from '@prisma/client';
import { Bar } from '../market-data/market-data.service';

export const FEE_RATE = 0.0005;

export function calcFloatingPnl(side: PositionSide, entryPrice: number, currentClose: number, amount: number): number {
  if (side === 'LONG') return ((currentClose - entryPrice) / entryPrice) * amount;
  return ((entryPrice - currentClose) / entryPrice) * amount;
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
