import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';

type Market = 'crypto' | 'forex' | 'gold' | 'stock' | 'futures';

type MarketSymbolConfig = {
  market: Market;
  exchange: string;
  source: string;
  symbol: string;
  displayName: string;
  rawTimeframe: string;
  baseTimeframe: string;
  timezone: string;
  rawPath: string;
  enabled: boolean;
};

type ImportFile = {
  filePath: string;
  market: Market;
  symbol: string;
  timeframe: string;
  fileName: string;
};

const ROOT = process.cwd();
const NORMALIZED_ROOT = path.join(ROOT, 'data', 'normalized');
const CONFIG_PATH = path.join(ROOT, 'config', 'market-symbols.json');
const MARKET_ENUM: Record<Market, string> = {
  crypto: 'CRYPTO',
  forex: 'FOREX',
  gold: 'GOLD',
  stock: 'STOCK',
  futures: 'FUTURES',
};
const MARKET_TABLE: Record<Market, string> = {
  crypto: 'bars_crypto',
  forex: 'bars_forex',
  gold: 'bars_gold',
  stock: 'bars_stock',
  futures: 'bars_futures',
};

async function walkCsvFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkCsvFiles(full)));
    else if (entry.isFile() && entry.name.endsWith('.csv')) out.push(full);
  }
  return out;
}

async function loadConfig(): Promise<MarketSymbolConfig[]> {
  const raw = await fsp.readFile(CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as MarketSymbolConfig[];
  const symbolFilter = new Set(
    (process.env.DATA_IMPORT_SYMBOLS ?? '')
      .split(',')
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean),
  );
  const enabled = parsed.filter((row) => row.enabled);
  if (symbolFilter.size === 0) return enabled;
  return enabled.filter((row) => symbolFilter.has(row.symbol.toUpperCase()));
}

function toImportFile(filePath: string): ImportFile {
  const rel = path.relative(NORMALIZED_ROOT, filePath);
  const parts = rel.split(path.sep);
  if (parts.length < 4) throw new Error(`Unexpected normalized path: ${filePath}`);
  return {
    filePath,
    market: parts[0] as Market,
    symbol: parts[1],
    timeframe: parts[2] === '1D' ? 'D' : parts[2],
    fileName: parts[3],
  };
}

function countDataRows(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(filePath, { encoding: 'utf-8' });
    let count = 0;
    let firstLine = true;
    let remain = '';
    rs.on('data', (chunk) => {
      const lines = (remain + chunk).split('\n');
      remain = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        if (firstLine) {
          firstLine = false;
          continue;
        }
        count += 1;
      }
    });
    rs.on('end', () => {
      if (remain.trim() && !firstLine) count += 1;
      resolve(count);
    });
    rs.on('error', reject);
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const configs = await loadConfig();
  const configMap = new Map<string, MarketSymbolConfig>();
  for (const cfg of configs) configMap.set(`${cfg.market}:${cfg.symbol}`, cfg);

  const files = (await walkCsvFiles(NORMALIZED_ROOT)).map(toImportFile);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const summary: Array<{
    market: string;
    symbol: string;
    timeframe: string;
    file: string;
    importedCount: number;
    skippedCount: number;
    duration: number;
  }> = [];

  try {
    for (const file of files) {
      const cfg = configMap.get(`${file.market}:${file.symbol}`);
      if (!cfg) continue;

      const start = Date.now();
      const marketEnum = MARKET_ENUM[file.market];
      const tableName = MARKET_TABLE[file.market];

      await client.query('BEGIN');

      await client.query(
        `INSERT INTO "Symbol" ("id", "market", "code", "createdAt")
         VALUES (md5(random()::text || clock_timestamp()::text), $1::"Market", $2, NOW())
         ON CONFLICT ("market", "code") DO NOTHING`,
        [marketEnum, file.symbol],
      );

      const symbolIdRes = await client.query<{ id: string }>(
        `SELECT "id" FROM "Symbol" WHERE "market"=$1::"Market" AND "code"=$2 LIMIT 1`,
        [marketEnum, file.symbol],
      );
      if (symbolIdRes.rows.length === 0) throw new Error(`Cannot find symbol id for ${file.market}:${file.symbol}`);
      const symbolId = symbolIdRes.rows[0].id;

      await client.query('DROP TABLE IF EXISTS temp_bars_import');
      await client.query(`
        CREATE TEMP TABLE temp_bars_import (
          timestamp timestamptz,
          open double precision,
          high double precision,
          low double precision,
          close double precision,
          volume double precision
        ) ON COMMIT DROP
      `);

      const copySql = `COPY temp_bars_import (timestamp, open, high, low, close, volume) FROM STDIN WITH (FORMAT csv, HEADER true)`;
      const ingest = client.query(copyFrom(copySql));
      const rs = fs.createReadStream(file.filePath);
      await new Promise<void>((resolve, reject) => {
        rs.pipe(ingest).on('finish', () => resolve()).on('error', reject);
      });

      const insertedRes = await client.query<{ inserted: string }>(
        `WITH inserted AS (
           INSERT INTO ${tableName} (
             "id", "symbolId", "timeframe", "timestamp", "open", "high", "low", "close", "volume", "source", "createdAt"
           )
           SELECT
             md5(random()::text || clock_timestamp()::text || row_number() over ()::text),
             $1,
             $2,
             t.timestamp,
             t.open,
             t.high,
             t.low,
             t.close,
             t.volume,
             $3,
             NOW()
           FROM temp_bars_import t
           ON CONFLICT ("symbolId", "timeframe", "timestamp") DO NOTHING
           RETURNING 1
         )
         SELECT COUNT(*)::text AS inserted FROM inserted`,
        [symbolId, file.timeframe, `${cfg.source}:${file.fileName}`],
      );

      await client.query('COMMIT');

      const totalRows = await countDataRows(file.filePath);
      const importedCount = Number(insertedRes.rows[0]?.inserted ?? '0');
      const skippedCount = Math.max(0, totalRows - importedCount);

      summary.push({
        market: file.market,
        symbol: file.symbol,
        timeframe: file.timeframe,
        file: file.fileName,
        importedCount,
        skippedCount,
        duration: Date.now() - start,
      });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }

  console.log(JSON.stringify({ files: files.length, summary }, null, 2));
}

main().catch((err) => {
  console.error('[data:import] failed', err);
  process.exit(1);
});
