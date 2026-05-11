import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type Market } from '../common/domain-enums';
import { PrismaService } from '../common/prisma.service';

export type Bar = { open: number; high: number; low: number; close: number; time: string; volume?: number | null };
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
    }));
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
