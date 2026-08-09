import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { Prisma, PrismaClient } from '@prisma/client';

type Options = {
  file: string;
  market: 'CRYPTO';
  symbol: string;
  timeframe: '15m';
  source: string;
};

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const k = args[i];
    if (!k.startsWith('--')) continue;
    const v = args[i + 1];
    if (v && !v.startsWith('--')) {
      map.set(k.slice(2), v);
      i += 1;
    } else {
      map.set(k.slice(2), 'true');
    }
  }

  const file = map.get('file') || process.env.OFFLINE_CSV_PATH || '';
  if (!file) {
    throw new Error('Missing csv path. Use --file /abs/path/BTCUSDT-15m.csv or set OFFLINE_CSV_PATH.');
  }
  return {
    file: path.resolve(file),
    market: 'CRYPTO',
    symbol: (map.get('symbol') || 'BTCUSDT').toUpperCase(),
    timeframe: '15m',
    source: map.get('source') || 'BINANCE_OFFLINE',
  };
}

function isHeader(line: string): boolean {
  const l = line.trim().toLowerCase();
  return l.includes('open time') || l.startsWith('open_time');
}

function parseCsvLine(line: string) {
  // Binance kline csv columns:
  // 0 open time,1 open,2 high,3 low,4 close,5 volume,...
  const cols = line.split(',');
  if (cols.length < 6) return null;
  const openTime = Number(cols[0]);
  const open = Number(cols[1]);
  const high = Number(cols[2]);
  const low = Number(cols[3]);
  const close = Number(cols[4]);
  const volume = Number(cols[5]);
  if (![openTime, open, high, low, close, volume].every(Number.isFinite)) return null;
  return { openTime, open, high, low, close, volume };
}

async function main() {
  const opt = parseArgs();
  if (!fs.existsSync(opt.file)) throw new Error(`CSV not found: ${opt.file}`);

  const prisma = new PrismaClient();
  const startedAt = Date.now();

  try {
    let symbol = await prisma.symbol.findFirst({
      where: { market: opt.market, code: opt.symbol },
      select: { id: true, code: true },
    });
    if (!symbol) {
      symbol = await prisma.symbol.create({
        data: { market: opt.market, code: opt.symbol },
        select: { id: true, code: true },
      });
    }

    const stream = fs.createReadStream(opt.file, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let lineNo = 0;
    let parsed = 0;
    let inserted = 0;
    let skipped = 0;
    let firstTs: number | null = null;
    let lastTs: number | null = null;

    for await (const line of rl) {
      lineNo += 1;
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (lineNo === 1 && isHeader(trimmed)) continue;
      const row = parseCsvLine(trimmed);
      if (!row) {
        skipped += 1;
        continue;
      }
      parsed += 1;
      firstTs = firstTs == null ? row.openTime : Math.min(firstTs, row.openTime);
      lastTs = lastTs == null ? row.openTime : Math.max(lastTs, row.openTime);

      const result = await prisma.$executeRaw(
        Prisma.sql`INSERT INTO "bars_crypto" ("id","symbolId","timeframe","timestamp","open","high","low","close","volume","source","createdAt")
                   VALUES (${`bc_offline_${row.openTime}_${Math.floor(Math.random() * 1_000_000)}`}, ${symbol.id}, ${opt.timeframe}, ${new Date(row.openTime)}, ${row.open}, ${row.high}, ${row.low}, ${row.close}, ${row.volume}, ${opt.source}, NOW())
                   ON CONFLICT ("symbolId","timeframe","timestamp") DO NOTHING`,
      );
      inserted += Number(result ?? 0);
    }

    console.log(
      JSON.stringify(
        {
          market: opt.market,
          symbol: opt.symbol,
          timeframe: opt.timeframe,
          source: opt.source,
          file: opt.file,
          parsed,
          inserted,
          deduped: parsed - inserted,
          skipped,
          from: firstTs ? new Date(firstTs).toISOString() : null,
          to: lastTs ? new Date(lastTs).toISOString() : null,
          elapsedMs: Date.now() - startedAt,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[import:offline] failed:', err);
  process.exit(1);
});

