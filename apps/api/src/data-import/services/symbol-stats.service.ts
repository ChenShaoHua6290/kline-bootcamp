import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SymbolStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshAll(): Promise<{ updated: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ market: string; symbolId: string; symbol: string; timeframe: string; exchange: string | null; bar_count: number; start_time: Date | null; end_time: Date | null }>>`
      WITH all_bars AS (
        SELECT 'CRYPTO'::"Market" AS market, b."symbolId", b.timeframe, COUNT(*)::int AS bar_count, MIN(b.timestamp) AS start_time, MAX(b.timestamp) AS end_time
        FROM bars_crypto b GROUP BY b."symbolId", b.timeframe
        UNION ALL
        SELECT 'GOLD'::"Market" AS market, b."symbolId", b.timeframe, COUNT(*)::int AS bar_count, MIN(b.timestamp) AS start_time, MAX(b.timestamp) AS end_time
        FROM bars_gold b GROUP BY b."symbolId", b.timeframe
        UNION ALL
        SELECT 'STOCK'::"Market" AS market, b."symbolId", b.timeframe, COUNT(*)::int AS bar_count, MIN(b.timestamp) AS start_time, MAX(b.timestamp) AS end_time
        FROM bars_stock b GROUP BY b."symbolId", b.timeframe
        UNION ALL
        SELECT 'FUTURES'::"Market" AS market, b."symbolId", b.timeframe, COUNT(*)::int AS bar_count, MIN(b.timestamp) AS start_time, MAX(b.timestamp) AS end_time
        FROM bars_futures b GROUP BY b."symbolId", b.timeframe
      )
      SELECT a.market::text AS market, a."symbolId", s.code AS symbol, a.timeframe, s.exchange, a.bar_count, a.start_time, a.end_time
      FROM all_bars a
      JOIN "Symbol" s ON s.id = a."symbolId"
    `;

    let updated = 0;
    for (const row of rows) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SymbolDataStats" ("id","symbolId","market","exchange","symbol","timeframe","barCount","startTime","endTime","isTrainable","updatedAt")
         VALUES ($1,$2,$3::"Market",$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT ("symbolId","timeframe") DO UPDATE
         SET "barCount"=EXCLUDED."barCount", "startTime"=EXCLUDED."startTime", "endTime"=EXCLUDED."endTime", "isTrainable"=EXCLUDED."isTrainable", "exchange"=EXCLUDED."exchange", "symbol"=EXCLUDED."symbol", "market"=EXCLUDED."market", "updatedAt"=NOW()`,
        `sds_${row.symbolId}_${row.timeframe}`,
        row.symbolId,
        row.market,
        row.exchange,
        row.symbol,
        row.timeframe,
        row.bar_count,
        row.start_time,
        row.end_time,
        row.bar_count >= 500,
      );
      updated += 1;
    }

    return { updated };
  }
}
