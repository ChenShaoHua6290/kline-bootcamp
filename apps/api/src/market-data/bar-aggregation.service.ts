import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { REAL_MARKET_TIMEFRAME_SET } from './timeframes';

export const TARGET_TIMEFRAMES = ['30m', '1H', '2H', '4H', 'D', 'W', 'M'] as const;
const TF_MS: Record<(typeof TARGET_TIMEFRAMES)[number] | '15m', number> = {
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1H': 60 * 60_000,
  '2H': 2 * 60 * 60_000,
  '4H': 4 * 60 * 60_000,
  D: 24 * 60 * 60_000,
  W: 7 * 24 * 60 * 60_000,
  M: 30 * 24 * 60 * 60_000,
};

@Injectable()
export class BarAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateCryptoFrom15m(symbolId: string, timeframes: string[] = [...TARGET_TIMEFRAMES]) {
    const source = await this.prisma.$queryRaw<Array<{ timestamp: Date; open: number; high: number; low: number; close: number; volume: number | null }>>(
      Prisma.sql`SELECT "timestamp","open","high","low","close","volume" FROM "bars_crypto" WHERE "symbolId"=${symbolId} AND "timeframe"='15m' ORDER BY "timestamp" ASC`,
    );
    if (source.length === 0) return { inserted: 0, deduped: 0, timeframes };

    let inserted = 0;
    let deduped = 0;
    for (const timeframe of timeframes) {
      const rows = aggregateRowsFrom15m(source, timeframe);
      if (rows.length === 0) continue;
      let insertedThisTf = 0;
      for (const r of rows) {
        const result = await this.prisma.$executeRaw(
          Prisma.sql`INSERT INTO "bars_crypto" ("id","symbolId","timeframe","timestamp","open","high","low","close","volume","source","createdAt")
                     VALUES (${`bc_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`}, ${symbolId}, ${r.timeframe}, ${r.timestamp}, ${r.open}, ${r.high}, ${r.low}, ${r.close}, ${r.volume}, 'AGGREGATED_15M', NOW())
                     ON CONFLICT ("symbolId","timeframe","timestamp") DO NOTHING`,
        );
        insertedThisTf += Number(result ?? 0);
      }
      inserted += insertedThisTf;
      deduped += rows.length - insertedThisTf;
    }
    return { inserted, deduped, timeframes };
  }

}

export function aggregateRowsFrom15m(
  source: Array<{ timestamp: Date; open: number; high: number; low: number; close: number; volume: number | null }>,
  targetTf: string,
) {
  if (!REAL_MARKET_TIMEFRAME_SET.has(targetTf)) throw new Error(`Unsupported target timeframe: ${targetTf}`);
  const targetMs = TF_MS[targetTf as keyof typeof TF_MS];
  if (!targetMs) throw new Error(`Unsupported target timeframe: ${targetTf}`);

  const out: Array<{
    timeframe: string;
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  let bucket = -1;
  let current:
    | {
        timeframe: string;
        timestamp: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }
    | undefined;

  for (const row of source) {
    const ts = row.timestamp.getTime();
    const bucketStart = Math.floor(ts / targetMs) * targetMs;
    if (!current || bucket !== bucketStart) {
      if (current) out.push(current);
      bucket = bucketStart;
      current = {
        timeframe: targetTf,
        timestamp: new Date(bucketStart),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume ?? 0,
      };
    } else {
      current.high = Math.max(current.high, row.high);
      current.low = Math.min(current.low, row.low);
      current.close = row.close;
      current.volume += row.volume ?? 0;
    }
  }

  if (current) out.push(current);
  return out;
}
