import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as readline from 'node:readline';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

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

type NormalizedBar = {
  timestampMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'market-symbols.json');
const NORMALIZED_ROOT = path.join(ROOT, 'data', 'normalized');

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkFiles(full)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) out.push(full);
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

function getInputDirs(cfg: MarketSymbolConfig): string[] {
  const rawDir = path.join(ROOT, cfg.rawPath);
  const unzippedPath = cfg.rawPath.replace(/^data\/raw\//, 'data/unzipped/');
  const unzippedDir = path.join(ROOT, unzippedPath);
  const dirs: string[] = [];

  // Prefer unzipped folder first so zip->unzip workflow works for all sources (including HistData).
  dirs.push(unzippedDir);
  dirs.push(rawDir);

  return Array.from(new Set(dirs));
}

function toNumber(v: string | number | undefined | null): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : NaN;
}

function toTimestampMsFromDateTime(dateTime: string, tz: string): number {
  const parsed = dayjs.tz(dateTime, 'YYYYMMDD HHmmss', tz);
  if (!parsed.isValid()) return NaN;
  return parsed.utc().valueOf();
}

function toTimestampMsFromDate(dateStr: string, tz: string): number {
  const s = String(dateStr).trim();
  let parsed = dayjs.tz(`${s} 00:00:00`, 'YYYY-MM-DD HH:mm:ss', tz);
  if (!parsed.isValid()) parsed = dayjs.tz(`${s} 00:00:00`, 'YYYY/MM/DD HH:mm:ss', tz);
  if (!parsed.isValid()) return NaN;
  return parsed.utc().valueOf();
}

function parseBinanceLine(line: string): NormalizedBar | null {
  const cols = line.split(',');
  if (cols.length < 6) return null;
  const timestampMs = toNumber(cols[0]);
  const open = toNumber(cols[1]);
  const high = toNumber(cols[2]);
  const low = toNumber(cols[3]);
  const close = toNumber(cols[4]);
  const volume = toNumber(cols[5]);
  if (![timestampMs, open, high, low, close].every(Number.isFinite)) return null;
  return {
    timestampMs,
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : 0,
  };
}

function parseHistDataLine(line: string, tz: string): NormalizedBar | null {
  const cols = line.split(';');
  if (cols.length < 5) return null;
  const ts = toTimestampMsFromDateTime(cols[0], tz);
  const open = toNumber(cols[1]);
  const high = toNumber(cols[2]);
  const low = toNumber(cols[3]);
  const close = toNumber(cols[4]);
  const volume = cols.length >= 6 ? toNumber(cols[5]) : 0;
  if (![ts, open, high, low, close].every(Number.isFinite)) return null;
  return { timestampMs: ts, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 };
}

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

function parseCsvWithHeaderLine(headers: string[], values: string[], tz: string): NormalizedBar | null {
  const map = new Map<string, string>();
  for (let i = 0; i < headers.length; i += 1) {
    map.set(normalizeKey(headers[i]), (values[i] ?? '').trim());
  }

  const getAny = (...keys: string[]) => {
    for (const k of keys) {
      const v = map.get(normalizeKey(k));
      if (v != null && v !== '') return v;
    }
    return '';
  };

  const rawTime = getAny('timestamp', 'time', 'datetime', 'date');
  if (!rawTime) return null;

  let timestampMs = NaN;
  if (/^\d{13}$/.test(rawTime)) timestampMs = Number(rawTime);
  else if (/^\d{10}$/.test(rawTime)) timestampMs = Number(rawTime) * 1000;
  else if (/^\d{8}\s\d{6}$/.test(rawTime)) timestampMs = toTimestampMsFromDateTime(rawTime, tz);
  else if (/^\d{4}-\d{2}-\d{2}$/.test(rawTime) || /^\d{4}\/\d{2}\/\d{2}$/.test(rawTime)) timestampMs = toTimestampMsFromDate(rawTime, tz);
  else {
    const parsed = dayjs.tz(rawTime, tz);
    if (parsed.isValid()) timestampMs = parsed.utc().valueOf();
  }

  const open = toNumber(getAny('open'));
  const high = toNumber(getAny('high'));
  const low = toNumber(getAny('low'));
  const close = toNumber(getAny('close'));
  let volume = toNumber(getAny('volume', 'vol'));
  if (!Number.isFinite(volume)) volume = 0;

  if (![timestampMs, open, high, low, close].every(Number.isFinite)) return null;
  return { timestampMs, open, high, low, close, volume };
}

function aggregateM1To15m(rows: NormalizedBar[]): NormalizedBar[] {
  const sorted = rows.slice().sort((a, b) => a.timestampMs - b.timestampMs);
  const groups = new Map<number, NormalizedBar[]>();
  for (const row of sorted) {
    const bucketStart = Math.floor(row.timestampMs / (15 * 60_000)) * (15 * 60_000);
    const list = groups.get(bucketStart) ?? [];
    list.push(row);
    groups.set(bucketStart, list);
  }

  const out: NormalizedBar[] = [];
  const starts = Array.from(groups.keys()).sort((a, b) => a - b);
  for (const start of starts) {
    const list = (groups.get(start) ?? []).sort((a, b) => a.timestampMs - b.timestampMs);
    if (list.length !== 15) continue;
    out.push({
      timestampMs: start,
      open: list[0].open,
      high: list.reduce((m, x) => Math.max(m, x.high), Number.NEGATIVE_INFINITY),
      low: list.reduce((m, x) => Math.min(m, x.low), Number.POSITIVE_INFINITY),
      close: list[list.length - 1].close,
      volume: list.reduce((s, x) => s + (Number.isFinite(x.volume) ? x.volume : 0), 0),
    });
  }
  return out;
}

async function parseOneFile(filePath: string, cfg: MarketSymbolConfig): Promise<{ rows: NormalizedBar[]; skipped: number }> {
  const rs = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: rs, crlfDelay: Infinity });

  const rows: NormalizedBar[] = [];
  let skipped = 0;
  let headers: string[] | null = null;

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;

    let parsed: NormalizedBar | null = null;

    if (cfg.source === 'binance_vision') {
      parsed = parseBinanceLine(line);
    } else if (cfg.source === 'histdata') {
      if (/^[A-Za-z]/.test(line)) continue;
      parsed = parseHistDataLine(line, cfg.timezone || 'UTC');
    } else {
      if (headers == null) {
        headers = line.split(',');
        const keySet = new Set(headers.map((h) => normalizeKey(h)));
        const looksLikeHeader = keySet.has('open') || keySet.has('date') || keySet.has('time') || keySet.has('timestamp');
        if (!looksLikeHeader) {
          headers = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
          const values = line.split(',');
          parsed = parseCsvWithHeaderLine(headers, values, cfg.timezone || 'UTC');
        }
        continue;
      }
      const values = line.split(',');
      parsed = parseCsvWithHeaderLine(headers, values, cfg.timezone || 'UTC');
    }

    if (!parsed) {
      skipped += 1;
      continue;
    }

    if (
      !Number.isFinite(parsed.timestampMs) ||
      !Number.isFinite(parsed.open) ||
      !Number.isFinite(parsed.high) ||
      !Number.isFinite(parsed.low) ||
      !Number.isFinite(parsed.close)
    ) {
      skipped += 1;
      continue;
    }

    if (!Number.isFinite(parsed.volume)) parsed.volume = 0;
    rows.push(parsed);
  }

  return { rows, skipped };
}

async function normalizeFile(filePath: string, cfg: MarketSymbolConfig): Promise<{ outputFile: string; valid: number; skipped: number }> {
  const outDir = path.join(NORMALIZED_ROOT, cfg.market, cfg.symbol, cfg.baseTimeframe);
  await fsp.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, path.basename(filePath));

  const { rows: parsedRows, skipped: parseSkipped } = await parseOneFile(filePath, cfg);
  const transformedRows =
    (cfg.market === 'forex' || cfg.market === 'gold') && cfg.rawTimeframe.toUpperCase() === 'M1' && cfg.baseTimeframe === '15m'
      ? aggregateM1To15m(parsedRows)
      : parsedRows.slice().sort((a, b) => a.timestampMs - b.timestampMs);

  const ws = fs.createWriteStream(outFile, { encoding: 'utf-8' });
  ws.write('timestamp,open,high,low,close,volume\n');
  for (const row of transformedRows) {
    ws.write(
      `${new Date(row.timestampMs).toISOString()},${row.open},${row.high},${row.low},${row.close},${Number.isFinite(row.volume) ? row.volume : 0}\n`,
    );
  }
  ws.end();

  return { outputFile: outFile, valid: transformedRows.length, skipped: parseSkipped + Math.max(0, parsedRows.length - transformedRows.length) };
}

async function main() {
  const configs = await loadConfig();
  const report: Array<{
    market: string;
    symbol: string;
    baseTimeframe: string;
    inputFile: string;
    outputFile: string;
    valid: number;
    skipped: number;
  }> = [];

  for (const cfg of configs) {
    const inputDirs = getInputDirs(cfg);
    for (const dir of inputDirs) {
      const files = await walkFiles(dir);
      for (const file of files) {
        const one = await normalizeFile(file, cfg);
        report.push({
          market: cfg.market,
          symbol: cfg.symbol,
          baseTimeframe: cfg.baseTimeframe,
          inputFile: file,
          outputFile: one.outputFile,
          valid: one.valid,
          skipped: one.skipped,
        });
      }
      if (files.length > 0) break;
    }
  }

  console.log(
    JSON.stringify(
      {
        fileCount: report.length,
        totalValid: report.reduce((n, r) => n + r.valid, 0),
        totalSkipped: report.reduce((n, r) => n + r.skipped, 0),
        report,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('[data:normalize] failed', err);
  process.exit(1);
});
