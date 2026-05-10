import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';

type SymbolConfig = {
  market: 'CRYPTO';
  symbol: string;
  baseTimeframe: '15m';
  source: 'BINANCE';
};

type SymbolsFile = { crypto: SymbolConfig[] };

const BINANCE_KLINE_HOSTS = [
  'https://api.binance.com/api/v3/klines',
  'https://api1.binance.com/api/v3/klines',
  'https://api2.binance.com/api/v3/klines',
  'https://api3.binance.com/api/v3/klines',
  'https://api4.binance.com/api/v3/klines',
];
const TF_MS: Record<string, number> = { '15m': 15 * 60_000 };
const MAX_RETRIES = 6;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchKlinesWithRetry(baseParams: { symbol: string; interval: string; startTime: number; endTime: number; limit: number }) {
  let lastErr: unknown;
  for (const host of BINANCE_KLINE_HOSTS) {
    for (let i = 0; i < MAX_RETRIES; i += 1) {
      const url = new URL(host);
      url.searchParams.set('symbol', baseParams.symbol);
      url.searchParams.set('interval', baseParams.interval);
      url.searchParams.set('startTime', String(baseParams.startTime));
      url.searchParams.set('endTime', String(baseParams.endTime));
      url.searchParams.set('limit', String(baseParams.limit));
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
        }
        return (await res.json()) as Array<[number, string, string, string, string, string]>;
      } catch (err) {
        lastErr = err;
        const backoffMs = 500 * Math.pow(2, i);
        console.warn(`[import] host=${new URL(host).host} failed (attempt ${i + 1}/${MAX_RETRIES}), retry in ${backoffMs}ms`);
        await sleep(backoffMs);
      }
    }
  }
  throw lastErr;
}

async function main() {
  const prisma = new PrismaClient();
  const startAt = Date.now();
  try {
    const configPath = path.resolve(process.cwd(), '../../config/symbols.json');
    const configRaw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configRaw) as SymbolsFile;
    const targets = config.crypto.filter((x) => x.market === 'CRYPTO' && x.baseTimeframe === '15m');
    if (targets.length === 0) throw new Error('No crypto symbols found in config/symbols.json');

    for (const target of targets) {
      await importCrypto15m(prisma, target);
    }
  } finally {
    await prisma.$disconnect();
    console.log(`[import] done in ${Date.now() - startAt}ms`);
  }
}

async function importCrypto15m(prisma: PrismaClient, target: SymbolConfig) {
  let symbol = await prisma.symbol.findFirst({
    where: { market: target.market, code: target.symbol },
    select: { id: true, code: true },
  });
  if (!symbol) {
    symbol = await prisma.symbol.create({
      data: { market: target.market, code: target.symbol },
      select: { id: true, code: true },
    });
  }

  const intervalMs = TF_MS[target.baseTimeframe];
  const now = Date.now();
  let cursor = Date.UTC(2017, 7, 17, 0, 0, 0, 0);
  let pages = 0;
  let fetched = 0;
  let inserted = 0;
  let firstTs: number | null = null;
  let lastTs: number | null = null;

  while (cursor < now) {
    const data = await fetchKlinesWithRetry({
      symbol: target.symbol,
      interval: target.baseTimeframe,
      startTime: cursor,
      endTime: now,
      limit: 1000,
    });
    if (data.length === 0) break;

    pages += 1;
    fetched += data.length;
    firstTs = firstTs == null ? data[0][0] : Math.min(firstTs, data[0][0]);
    lastTs = lastTs == null ? data[data.length - 1][0] : Math.max(lastTs, data[data.length - 1][0]);

    let pageInserted = 0;
    for (const k of data) {
      const result = await prisma.$executeRaw(
        Prisma.sql`INSERT INTO "bars_crypto" ("id","symbolId","timeframe","timestamp","open","high","low","close","volume","source","createdAt")
                   VALUES (${`bc_${k[0]}_${Math.floor(Math.random() * 1_000_000)}`}, ${symbol.id}, '15m', ${new Date(k[0])}, ${Number(k[1])}, ${Number(k[2])}, ${Number(k[3])}, ${Number(k[4])}, ${Number(k[5])}, ${target.source}, NOW())
                   ON CONFLICT ("symbolId","timeframe","timestamp") DO NOTHING`,
      );
      pageInserted += Number(result ?? 0);
    }
    inserted += pageInserted;

    const next = data[data.length - 1][0] + intervalMs;
    if (next <= cursor) break;
    cursor = next;
  }

  console.log(
    JSON.stringify(
      {
        market: target.market,
        symbol: symbol.code,
        timeframe: target.baseTimeframe,
        pages,
        fetched,
        inserted,
        deduped: fetched - inserted,
        from: firstTs ? new Date(firstTs).toISOString() : null,
        to: lastTs ? new Date(lastTs).toISOString() : null,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('[import] failed:', err);
  process.exit(1);
});
