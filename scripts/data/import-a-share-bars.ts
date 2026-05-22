import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';

const ROOT = process.cwd();
const NORMALIZED_ROOT = path.join(ROOT, 'data', 'normalized', 'stock', 'a_share');
const RAW_ROOT = path.join(ROOT, 'data', 'raw', 'stock', 'a_share', '15m');

const MARKET_ENUM = 'STOCK';
const MARKET = 'stock';
const EXCHANGE = 'cn_a_share';
const SOURCE = 'csv_a_share';
const TIMEFRAME = '15m';
const TIMEZONE = 'Asia/Shanghai';

type ImportFile = {
  filePath: string;
  fileName: string;
  symbol: string;
  displayName: string;
  indexName: string;
  timeframe: string;
};

type ImportSummary = {
  file: string;
  symbol: string;
  importedCount: number;
  skippedCount: number;
  totalRows: number;
  durationMs: number;
};

function parseFileNameMeta(fileName: string): { symbol: string; displayName: string; indexName: string; timeframe: string } | null {
  if (!fileName.toLowerCase().endsWith('.csv')) return null;
  const base = fileName.slice(0, -4);
  if (!base.endsWith('_15m')) return null;

  const body = base.slice(0, -4);
  const firstUnderscore = body.indexOf('_');
  const lastUnderscore = body.lastIndexOf('_');
  if (firstUnderscore <= 0 || lastUnderscore <= firstUnderscore) return null;

  const symbol = body.slice(0, firstUnderscore).trim();
  const displayName = body.slice(firstUnderscore + 1, lastUnderscore).trim();
  const indexName = body.slice(lastUnderscore + 1).trim();
  if (!symbol) return null;

  return { symbol, displayName, indexName, timeframe: TIMEFRAME };
}

async function walkCsvFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkCsvFiles(full)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) out.push(full);
  }
  return out.sort();
}

async function findRawByFileName(fileName: string): Promise<string | null> {
  const files = await walkCsvFiles(RAW_ROOT);
  const found = files.find((f) => path.basename(f) === fileName);
  return found ?? null;
}

async function parseRawFallback(rawPath: string): Promise<{ symbol: string; displayName: string; indexName: string } | null> {
  const rs = fs.createReadStream(rawPath, { encoding: 'utf-8' });
  let content = '';
  for await (const chunk of rs) {
    content += chunk;
    if (content.length > 8192) break;
  }
  rs.close();

  const lines = content.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const headers = lines[0].split(',').map((x) => x.trim().toLowerCase());
  const values = lines[1].split(',').map((x) => x.trim());
  const idxCode = headers.indexOf('code');
  const idxCodeName = headers.indexOf('code_name');
  const idxIndexName = headers.indexOf('index_name');

  const symbol = idxCode >= 0 ? (values[idxCode] ?? '').trim() : '';
  const displayName = idxCodeName >= 0 ? (values[idxCodeName] ?? '').trim() : '';
  const indexName = idxIndexName >= 0 ? (values[idxIndexName] ?? '').trim() : '';

  if (!symbol) return null;
  return { symbol, displayName: displayName || symbol, indexName };
}

async function collectImportFiles(): Promise<ImportFile[]> {
  const normalizedFiles = await walkCsvFiles(NORMALIZED_ROOT);
  const out: ImportFile[] = [];

  for (const filePath of normalizedFiles) {
    const fileName = path.basename(filePath);
    const parsed = parseFileNameMeta(fileName);
    if (parsed) {
      out.push({
        filePath,
        fileName,
        symbol: parsed.symbol,
        displayName: parsed.displayName || parsed.symbol,
        indexName: parsed.indexName,
        timeframe: parsed.timeframe,
      });
      continue;
    }

    const rel = path.relative(NORMALIZED_ROOT, filePath).split(path.sep);
    const fallbackSymbol = rel.length >= 2 ? rel[0] : '';

    let symbol = fallbackSymbol;
    let displayName = fallbackSymbol;
    let indexName = '';

    const rawFile = await findRawByFileName(fileName);
    if (rawFile) {
      const fallback = await parseRawFallback(rawFile);
      if (fallback) {
        symbol = fallback.symbol || symbol;
        displayName = fallback.displayName || displayName;
        indexName = fallback.indexName || indexName;
      }
    }

    if (!symbol) continue;

    out.push({
      filePath,
      fileName,
      symbol,
      displayName,
      indexName,
      timeframe: TIMEFRAME,
    });
  }

  return out;
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

async function refreshSymbolStats(client: Client): Promise<void> {
  await client.query(`
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
    INSERT INTO "SymbolDataStats" ("id","symbolId","market","exchange","symbol","timeframe","barCount","startTime","endTime","isTrainable","updatedAt")
    SELECT
      CONCAT('sds_', a."symbolId", '_', a.timeframe),
      a."symbolId",
      a.market,
      s.exchange,
      s.code,
      a.timeframe,
      a.bar_count,
      a.start_time,
      a.end_time,
      (a.bar_count >= 500),
      NOW()
    FROM all_bars a
    JOIN "Symbol" s ON s.id = a."symbolId"
    ON CONFLICT ("symbolId","timeframe") DO UPDATE
    SET "barCount"=EXCLUDED."barCount",
        "startTime"=EXCLUDED."startTime",
        "endTime"=EXCLUDED."endTime",
        "isTrainable"=EXCLUDED."isTrainable",
        "exchange"=EXCLUDED."exchange",
        "symbol"=EXCLUDED."symbol",
        "market"=EXCLUDED."market",
        "updatedAt"=NOW()
  `);
}

async function importOneFile(client: Client, file: ImportFile, idx: number, total: number): Promise<ImportSummary> {
  const start = Date.now();

  await client.query('BEGIN');
  try {
    const metadata = JSON.stringify({
      indexName: file.indexName || null,
      region: 'CN',
      assetType: 'stock',
      timeZone: TIMEZONE,
    });

    await client.query(
      `INSERT INTO "Symbol" ("id", "market", "code", "exchange", "displayName", "source", "timezone", "quoteAsset", "isActive", "createdAt", "updatedAt")
       VALUES (md5(random()::text || clock_timestamp()::text), $1::"Market", $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW())
       ON CONFLICT ("market", "code") DO UPDATE
       SET "exchange"=EXCLUDED."exchange",
           "displayName"=COALESCE(NULLIF(EXCLUDED."displayName", ''), "Symbol"."displayName"),
           "source"=EXCLUDED."source",
           "timezone"=EXCLUDED."timezone",
           "quoteAsset"=EXCLUDED."quoteAsset",
           "isActive"=TRUE,
           "updatedAt"=NOW()`,
      [MARKET_ENUM, file.symbol, EXCHANGE, file.displayName, SOURCE, TIMEZONE, metadata],
    );

    const symbolIdRes = await client.query<{ id: string }>(
      `SELECT "id" FROM "Symbol" WHERE "market"=$1::"Market" AND "code"=$2 LIMIT 1`,
      [MARKET_ENUM, file.symbol],
    );
    if (symbolIdRes.rows.length === 0) {
      throw new Error(`Cannot find symbol id for ${file.symbol}`);
    }
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

    const copySql = 'COPY temp_bars_import (timestamp, open, high, low, close, volume) FROM STDIN WITH (FORMAT csv, HEADER true)';
    const ingest = client.query(copyFrom(copySql));
    const rs = fs.createReadStream(file.filePath);
    await new Promise<void>((resolve, reject) => {
      rs.pipe(ingest).on('finish', () => resolve()).on('error', reject);
    });

    const insertedRes = await client.query<{ inserted: string }>(
      `WITH inserted AS (
        INSERT INTO bars_stock (
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
      [symbolId, file.timeframe, `${SOURCE}:${file.fileName}`],
    );

    await client.query('COMMIT');

    const totalRows = await countDataRows(file.filePath);
    const importedCount = Number(insertedRes.rows[0]?.inserted ?? '0');
    const skippedCount = Math.max(0, totalRows - importedCount);
    const durationMs = Date.now() - start;

    console.log(`[import-a-share] ${idx}/${total} ${file.symbol} imported=${importedCount} skipped=${skippedCount} durationMs=${durationMs}`);

    return {
      file: file.fileName,
      symbol: file.symbol,
      importedCount,
      skippedCount,
      totalRows,
      durationMs,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const files = await collectImportFiles();
  if (files.length === 0) {
    console.log(JSON.stringify({ files: 0, market: MARKET, exchange: EXCHANGE, source: SOURCE, summary: [], failedFiles: [] }, null, 2));
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const summary: ImportSummary[] = [];
  const failedFiles: Array<{ file: string; symbol?: string; error: string }> = [];

  try {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        const one = await importOneFile(client, file, i + 1, files.length);
        summary.push(one);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failedFiles.push({ file: file.fileName, symbol: file.symbol, error: msg });
        console.error(`[import-a-share] failed file=${file.fileName} symbol=${file.symbol} error=${msg}`);
      }
    }

    await refreshSymbolStats(client);
  } finally {
    await client.end();
  }

  console.log(
    JSON.stringify(
      {
        files: files.length,
        market: MARKET,
        exchange: EXCHANGE,
        source: SOURCE,
        successFiles: summary.length,
        failedFiles,
        totalImported: summary.reduce((n, x) => n + x.importedCount, 0),
        totalSkipped: summary.reduce((n, x) => n + x.skippedCount, 0),
        summary,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('[data:import-a-share] failed', err);
  process.exit(1);
});
