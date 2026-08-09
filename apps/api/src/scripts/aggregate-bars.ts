import { PrismaClient } from '@prisma/client';
import { BarAggregationService } from '../market-data/bar-aggregation.service';

async function main() {
  const prisma = new PrismaClient();
  const service = new BarAggregationService(prisma as never);
  const startAt = Date.now();
  try {
    const requested = (process.env.AGGREGATE_MARKETS ?? '')
      .split(',')
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean) as Array<'CRYPTO' | 'GOLD' | 'FUTURES' | 'STOCK'>;
    const markets: Array<'CRYPTO' | 'GOLD' | 'FUTURES' | 'STOCK'> =
      requested.length > 0 ? requested : ['CRYPTO', 'GOLD', 'FUTURES', 'STOCK'];

    for (const market of markets) {
      const symbolFilter = new Set(
        (process.env.AGGREGATE_SYMBOLS ?? '')
          .split(',')
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean),
      );
      const symbols = await prisma.symbol.findMany({
        where: { market },
        select: { id: true, code: true },
      });
      for (const s of symbols) {
        if (symbolFilter.size > 0 && !symbolFilter.has(s.code.toUpperCase())) continue;
        const result = await service.aggregateMarketFrom15m(market, s.id);
        console.log(
          JSON.stringify(
            {
              market,
              symbol: s.code,
              inserted: result.inserted,
              deduped: result.deduped,
              timeframes: result.timeframes,
            },
            null,
            2,
          ),
        );
      }
    }
  } finally {
    await prisma.$disconnect();
    console.log(`[aggregate] done in ${Date.now() - startAt}ms`);
  }
}

main().catch((err) => {
  console.error('[aggregate] failed:', err);
  process.exit(1);
});
