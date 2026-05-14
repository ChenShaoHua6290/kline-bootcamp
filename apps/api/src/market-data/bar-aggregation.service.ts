import { Injectable } from '@nestjs/common';
import { Market, Prisma } from '@prisma/client';
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
    return this.aggregateMarketFrom15m('CRYPTO', symbolId, timeframes);
  }

  async aggregateMarketFrom15m(market: Market, symbolId: string, timeframes: string[] = [...TARGET_TIMEFRAMES]) {
    const table = marketToBarsTable(market);
    const hasBase = await this.prisma.$queryRaw<Array<{ one: number }>>(
      Prisma.sql`SELECT 1 AS one FROM ${Prisma.raw(table)} WHERE "symbolId"=${symbolId} AND "timeframe"='15m' LIMIT 1`,
    );
    if (hasBase.length === 0) return { inserted: 0, deduped: 0, timeframes };

    let inserted = 0;
    let deduped = 0;
    for (const timeframe of timeframes) {
      const tfMs = TF_MS[timeframe as keyof typeof TF_MS];
      if (!tfMs) throw new Error(`Unsupported target timeframe: ${timeframe}`);
      const counts = await this.prisma.$queryRaw<Array<{ inserted: string; candidates: string }>>(
        Prisma.sql`
          WITH src AS (
            SELECT
              "timestamp",
              "open",
              "high",
              "low",
              "close",
              COALESCE("volume", 0) AS "volume",
              floor((extract(epoch from "timestamp") * 1000) / ${tfMs})::bigint * ${tfMs} AS bucket_ms
            FROM ${Prisma.raw(table)}
            WHERE "symbolId" = ${symbolId}
              AND "timeframe" = '15m'
          ),
          ranked AS (
            SELECT
              bucket_ms,
              "timestamp",
              "open",
              "high",
              "low",
              "close",
              "volume",
              row_number() OVER (PARTITION BY bucket_ms ORDER BY "timestamp" ASC) AS rn_asc,
              row_number() OVER (PARTITION BY bucket_ms ORDER BY "timestamp" DESC) AS rn_desc
            FROM src
          ),
          agg AS (
            SELECT
              bucket_ms,
              max(CASE WHEN rn_asc = 1 THEN "open" END) AS "open",
              max("high") AS "high",
              min("low") AS "low",
              max(CASE WHEN rn_desc = 1 THEN "close" END) AS "close",
              sum("volume") AS "volume"
            FROM ranked
            GROUP BY bucket_ms
          ),
          ins AS (
            INSERT INTO ${Prisma.raw(table)} ("id","symbolId","timeframe","timestamp","open","high","low","close","volume","source","createdAt")
            SELECT
              md5(random()::text || clock_timestamp()::text || row_number() OVER ()::text),
              ${symbolId},
              ${timeframe},
              to_timestamp(bucket_ms::double precision / 1000.0),
              "open",
              "high",
              "low",
              "close",
              "volume",
              'AGGREGATED_15M',
              NOW()
            FROM agg
            ON CONFLICT ("symbolId","timeframe","timestamp") DO NOTHING
            RETURNING 1
          )
          SELECT
            (SELECT COUNT(*)::text FROM ins) AS inserted,
            (SELECT COUNT(*)::text FROM agg) AS candidates
        `,
      );

      const insertedThisTf = Number(counts[0]?.inserted ?? '0');
      const candidatesThisTf = Number(counts[0]?.candidates ?? '0');
      inserted += insertedThisTf;
      deduped += Math.max(0, candidatesThisTf - insertedThisTf);
    }
    return { inserted, deduped, timeframes };
  }

}

function marketToBarsTable(market: Market): string {
  if (market === 'CRYPTO') return '"bars_crypto"';
  if (market === 'FOREX') return '"bars_forex"';
  if (market === 'GOLD') return '"bars_gold"';
  if (market === 'FUTURES') return '"bars_futures"';
  if (market === 'STOCK') return '"bars_stock"';
  throw new Error(`Unsupported market: ${market}`);
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
