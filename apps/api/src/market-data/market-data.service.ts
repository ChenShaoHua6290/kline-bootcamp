import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type Market } from '../common/domain-enums';
import { PrismaService } from '../common/prisma.service';
import { getNextBucketStart, getTimeframeBucketStart, timeframeRank } from './timeframes';

export type Bar = { open: number; high: number; low: number; close: number; time: string; volume?: number | null; isPartial?: boolean };
export type WindowSeries = {
  symbolId: string;
  symbol: string;
  bars: Bar[];
  contextStartIndex: number;
  trainStartIndex: number;
  trainEndIndex: number;
};

@Injectable()
export class MarketDataService {
  constructor(private readonly prisma: PrismaService) {}

  async pickRandomWindowSeries(
    market: Market,
    timeframe: string,
    trainBars: number,
    contextBars: number,
    futureBars: number,
  ): Promise<WindowSeries> {
    const symbols = await this.prisma.symbol.findMany({ where: { market }, select: { id: true, code: true } });
    if (symbols.length === 0) {
      throw new Error(`No symbols configured for market=${market}`);
    }

    const needed = contextBars + trainBars + futureBars;
    const shuffled = symbols
      .map((row) => ({ sortKey: Math.random(), ...row }))
      .sort((a, b) => a.sortKey - b.sortKey);

    for (const symbol of shuffled) {
      const allBars = await this.queryBarsByMarket(market, symbol.id, timeframe);
      if (allBars.length <= needed + 10) continue;
      const start = Math.floor(Math.random() * (allBars.length - needed));
      const sliced = allBars.slice(start, start + needed);
      const bars = sliced.map((b) => ({
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        time: new Date(b.timestamp).toISOString(),
        volume: b.volume ?? 0,
      }));
      return {
        symbolId: symbol.id,
        symbol: symbol.code,
        bars,
        contextStartIndex: 0,
        trainStartIndex: contextBars,
        trainEndIndex: contextBars + trainBars - 1,
      };
    }

    throw new Error(`Insufficient bars in db for market=${market}, timeframe=${timeframe}, required=${needed}`);
  }

  async getBarsByTimeRange(market: Market, symbolId: string, timeframe: string, fromTs: number, toTs: number): Promise<Bar[]> {
    const rows = await this.queryBarsByMarket(market, symbolId, timeframe, fromTs, toTs, 3000);
    return rows.map((r) => ({
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      time: new Date(r.timestamp).toISOString(),
      volume: r.volume ?? 0,
      isPartial: false,
    }));
  }

  async getBarsByTimeRangeForTraining(params: {
    market: Market;
    symbolId: string;
    timeframe: string;
    drivingTimeframe: string;
    fromTs: number;
    toTs: number;
    currentTimePointerTs: number;
  }): Promise<Bar[]> {
    const { market, symbolId, timeframe, drivingTimeframe, fromTs, toTs, currentTimePointerTs } = params;
    const safeTo = Math.min(toTs, currentTimePointerTs);
    if (safeTo <= fromTs) return [];

    const isHigherView = timeframeRank(timeframe) > timeframeRank(drivingTimeframe);

    if (!isHigherView) {
      return this.getBarsByTimeRange(market, symbolId, timeframe, fromTs, safeTo);
    }

    const currentBucketStart = getTimeframeBucketStart(currentTimePointerTs, timeframe);
    const completeUpperBound = Math.min(safeTo, currentBucketStart - 1);
    const completedRows =
      completeUpperBound >= fromTs
        ? await this.queryBarsByMarket(market, symbolId, timeframe, fromTs, completeUpperBound, 3000)
        : [];

    const completedBars: Bar[] = completedRows.map((r) => ({
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      time: new Date(r.timestamp).toISOString(),
      volume: r.volume ?? 0,
      isPartial: false,
    }));

    const partialFrom = Math.max(fromTs, currentBucketStart);
    if (partialFrom > safeTo) return completedBars;

    const partialRows = await this.queryBarsByMarket(market, symbolId, drivingTimeframe, partialFrom, safeTo, 3000);
    if (partialRows.length === 0) return completedBars;

    const partial = this.aggregatePartialFromRows(partialRows, timeframe);
    if (!partial) return completedBars;

    const out = [...completedBars, partial].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    return out;
  }

  private aggregatePartialFromRows(
    rows: Array<{ open: number; high: number; low: number; close: number; volume: number | null; timestamp: string | Date }>,
    timeframe: string,
  ): Bar | null {
    if (rows.length === 0) return null;
    const sorted = rows
      .map((r) => ({ ...r, ts: new Date(r.timestamp).getTime() }))
      .filter((r) => Number.isFinite(r.ts))
      .sort((a, b) => a.ts - b.ts);
    if (sorted.length === 0) return null;

    const last = sorted[sorted.length - 1];
    const bucketStart = getTimeframeBucketStart(last.ts, timeframe);
    const bucketEnd = getNextBucketStart(bucketStart, timeframe);
    const inBucket = sorted.filter((r) => r.ts >= bucketStart && r.ts < bucketEnd);
    if (inBucket.length === 0) return null;
    const first = inBucket[0];
    let high = Number.NEGATIVE_INFINITY;
    let low = Number.POSITIVE_INFINITY;
    let volume = 0;
    for (const row of inBucket) {
      high = Math.max(high, row.high);
      low = Math.min(low, row.low);
      volume += row.volume ?? 0;
    }
    return {
      time: new Date(bucketStart).toISOString(),
      open: first.open,
      high,
      low,
      close: inBucket[inBucket.length - 1].close,
      volume,
      isPartial: true,
    };
  }

  private async queryBarsByMarket(
    market: Market,
    symbolId: string,
    timeframe: string,
    fromTs?: number,
    toTs?: number,
    take?: number,
  ): Promise<Array<{ open: number; high: number; low: number; close: number; volume: number | null; timestamp: string | Date }>> {
    if (market === 'CRYPTO') {
      const where = Prisma.sql`
        "symbolId" = ${symbolId}
        AND "timeframe" = ${timeframe}
        ${fromTs != null ? Prisma.sql`AND "timestamp" >= ${new Date(fromTs)}` : Prisma.empty}
        ${toTs != null ? Prisma.sql`AND "timestamp" <= ${new Date(toTs)}` : Prisma.empty}
      `;
      const rows = await this.prisma.$queryRaw<Array<{ open: number; high: number; low: number; close: number; volume: number | null; timestamp: Date | string }>>(
        Prisma.sql`SELECT "open","high","low","close","volume","timestamp" FROM "bars_crypto" WHERE ${where} ORDER BY "timestamp" ASC`,
      );
      return take ? rows.slice(0, take) : rows;
    }

    throw new Error(`Market table routing not implemented for market=${market}`);
  }
}
