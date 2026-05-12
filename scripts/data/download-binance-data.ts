import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';
import dayjs from 'dayjs';

type MarketSymbolConfig = {
  market: string;
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

type CliArgs = {
  start: string;
  end: string;
};

const MAX_RETRY = 3;
const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'market-symbols.json');
const LEGACY_CONFIG_PATH = path.join(ROOT, 'config', 'binance-symbols.json');

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let start = '';
  let end = '';

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--start') start = args[i + 1] ?? '';
    if (args[i] === '--end') end = args[i + 1] ?? '';
  }

  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) {
    throw new Error('Usage: npm run data:download-binance -- --start YYYY-MM --end YYYY-MM');
  }

  if (dayjs(`${end}-01`).isBefore(dayjs(`${start}-01`))) {
    throw new Error(`Invalid range: start=${start}, end=${end}`);
  }

  return { start, end };
}

function listMonths(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = dayjs(`${start}-01`);
  const endDate = dayjs(`${end}-01`);

  while (cursor.isBefore(endDate) || cursor.isSame(endDate, 'month')) {
    out.push(cursor.format('YYYY-MM'));
    cursor = cursor.add(1, 'month');
  }

  return out;
}

async function loadConfig(): Promise<MarketSymbolConfig[]> {
  const intervalFromEnv = (process.env.DATA_IMPORT_INTERVAL ?? '15m').trim() || '15m';
  const symbolFilter = new Set(
    (process.env.DATA_IMPORT_SYMBOLS ?? '')
      .split(',')
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean),
  );
  const applyFilter = (rows: MarketSymbolConfig[]) =>
    symbolFilter.size > 0 ? rows.filter((row) => symbolFilter.has(row.symbol.toUpperCase())) : rows;

  if (fs.existsSync(CONFIG_PATH)) {
    const raw = await fsp.readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as MarketSymbolConfig[];
    const enabled = parsed.filter(
      (row) =>
        row.enabled &&
        row.market === 'crypto' &&
        row.exchange === 'binance' &&
        (row.source === 'binance_vision' || row.source === 'binance'),
    );
    if (enabled.length > 0) {
      const filtered = applyFilter(enabled);
      if (filtered.length > 0) return filtered;
    }
  }

  if (fs.existsSync(LEGACY_CONFIG_PATH)) {
    const raw = await fsp.readFile(LEGACY_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Array<{ market: string; exchange?: string; symbol: string; interval: string; enabled: boolean }>;
    const legacyRows = applyFilter(
      parsed
      .filter((row) => row.enabled && row.market === 'crypto')
      .map((row) => ({
        market: 'crypto',
        exchange: 'binance',
        source: 'binance_vision',
        symbol: row.symbol,
        displayName: row.symbol,
        rawTimeframe: row.interval,
        baseTimeframe: row.interval,
        timezone: 'UTC',
        rawPath: `data/raw/crypto/binance/${row.symbol}/${row.interval}`,
        enabled: true,
      })),
    );
    if (legacyRows.length > 0) return legacyRows;
  }

  // When task provides symbols not present in config, allow on-the-fly Binance downloads.
  if (symbolFilter.size > 0) {
    return Array.from(symbolFilter).map((symbol) => ({
      market: 'crypto',
      exchange: 'binance',
      source: 'binance_vision',
      symbol,
      displayName: symbol,
      rawTimeframe: intervalFromEnv,
      baseTimeframe: intervalFromEnv,
      timezone: 'UTC',
      rawPath: `data/raw/crypto/binance/${symbol}/${intervalFromEnv}`,
      enabled: true,
    }));
  }

  return [];
}

function buildUrl(symbol: string, interval: string, month: string): string {
  const [yyyy, mm] = month.split('-');
  return `https://data.binance.vision/data/futures/um/monthly/klines/${symbol}/${interval}/${symbol}-${interval}-${yyyy}-${mm}.zip`;
}

async function ensureDir(dir: string) {
  await fsp.mkdir(dir, { recursive: true });
}

async function fileSize(filePath: string): Promise<number> {
  const stat = await fsp.stat(filePath);
  return stat.size;
}

async function downloadToFile(url: string, filePath: string) {
  const res = await axios.get(url, {
    responseType: 'stream',
    timeout: 30_000,
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 300 || !res.data) {
    throw new Error(`HTTP ${res.status}`);
  }
  const ws = fs.createWriteStream(filePath);
  await pipeline(res.data, ws);
}

async function downloadWithRetry(url: string, filePath: string): Promise<{ ok: boolean; notFound?: boolean; error?: string }> {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt += 1) {
    try {
      await downloadToFile(url, filePath);
      const size = await fileSize(filePath);
      if (size <= 0) {
        await fsp.rm(filePath, { force: true });
        throw new Error('Downloaded file is 0 bytes');
      }
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await fsp.rm(filePath, { force: true });
      if (msg.includes('HTTP 404')) {
        return { ok: false, notFound: true };
      }
      if (attempt === MAX_RETRY) {
        return { ok: false, error: msg };
      }
    }
  }
  return { ok: false, error: 'Unknown error' };
}

async function main() {
  const startedAt = Date.now();
  const { start, end } = parseArgs();
  const months = listMonths(start, end);
  const configs = await loadConfig();

  if (configs.length === 0) {
    throw new Error('No enabled Binance symbols found in config/market-symbols.json');
  }

  const success: string[] = [];
  const skipped: string[] = [];
  const notFound: string[] = [];
  const failed: Array<{ file: string; error: string }> = [];

  for (const cfg of configs) {
    for (const month of months) {
      const fileName = `${cfg.symbol}-${cfg.rawTimeframe}-${month}.zip`;
      const dir = path.join(ROOT, cfg.rawPath);
      const filePath = path.join(dir, fileName);
      const url = buildUrl(cfg.symbol, cfg.rawTimeframe, month);

      await ensureDir(dir);

      if (fs.existsSync(filePath)) {
        const size = await fileSize(filePath).catch(() => 0);
        if (size > 0) {
          skipped.push(filePath);
          continue;
        }
        await fsp.rm(filePath, { force: true });
      }

      const result = await downloadWithRetry(url, filePath);
      if (result.ok) success.push(filePath);
      else if (result.notFound) notFound.push(filePath);
      else failed.push({ file: filePath, error: result.error ?? 'download failed' });
    }
  }

  console.log(
    JSON.stringify(
      {
        start,
        end,
        elapsedMs: Date.now() - startedAt,
        successCount: success.length,
        skipCount: skipped.length + notFound.length,
        notFoundCount: notFound.length,
        failCount: failed.length,
        success,
        skipped,
        notFound,
        failed,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[data:download-binance] failed', err);
  process.exit(1);
});
