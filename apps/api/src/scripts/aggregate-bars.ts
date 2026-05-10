import { PrismaClient } from '@prisma/client';
import { BarAggregationService } from '../market-data/bar-aggregation.service';

async function main() {
  const prisma = new PrismaClient();
  const service = new BarAggregationService(prisma as never);
  const startAt = Date.now();
  try {
    const symbols = await prisma.symbol.findMany({
      where: { market: 'CRYPTO' },
      select: { id: true, code: true },
    });
    if (symbols.length === 0) throw new Error('No CRYPTO symbols found. Run import first.');

    for (const s of symbols) {
      const result = await service.aggregateCryptoFrom15m(s.id);
      console.log(
        JSON.stringify(
          {
            market: 'CRYPTO',
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
  } finally {
    await prisma.$disconnect();
    console.log(`[aggregate] done in ${Date.now() - startAt}ms`);
  }
}

main().catch((err) => {
  console.error('[aggregate] failed:', err);
  process.exit(1);
});

