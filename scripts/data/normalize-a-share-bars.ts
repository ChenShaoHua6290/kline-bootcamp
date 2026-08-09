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

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'data', 'raw', 'stock', 'a_share', '15m');
const OUTPUT_ROOT = path.join(ROOT, 'data', 'normalized', 'stock', 'a_share');
const MARKET = 'stock';
const EXCHANGE = 'cn_a_share';
const SOURCE = 'csv_a_share';
const TIMEFRAME = '15m';
const TIMEZONE = 'Asia/Shanghai';

type FileMeta = {
  code: string;
  symbol: string;
  displayName: string;
  indexName: string;
  timeframe: string;
  market: string;
  exchange: string;
  source: string;
};

type CsvRow = {
  time: string;
  code: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  codeName: string;
  indexName: string;
};

type NormalizeResult = {
  file: string;
  symbol: string;
  outputFile: string;
  valid: number;
  skipped: number;
  invalid: number;
  durationMs: number;
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

function parseFileNameMeta(fileName: string): FileMeta | null {
  if (!fileName.toLowerCase().endsWith('.csv')) return null;
  const base = fileName.slice(0, -4);
  if (!base.endsWith('_15m')) return null;

  const body = base.slice(0, -4);
  const firstUnderscore = body.indexOf('_');
  const lastUnderscore = body.lastIndexOf('_');
  if (firstUnderscore <= 0 || lastUnderscore <= firstUnderscore) return null;

  const code = body.slice(0, firstUnderscore).trim();
  const displayName = body.slice(firstUnderscore + 1, lastUnderscore).trim();
  const indexName = body.slice(lastUnderscore + 1).trim();

  if (!code) return null;

  return {
    code,
    symbol: code,
    displayName,
    indexName,
    timeframe: TIMEFRAME,
    market: MARKET,
    exchange: EXCHANGE,
    source: SOURCE,
  };
}

export function parseAshareTimestamp(time: string): Date {
  const raw = String(time || '').trim();
  let s = raw;
  if (/^\d{17}$/.test(raw)) {
    s = raw.slice(0, 14);
  }

  const parsed = dayjs.tz(s, 'YYYYMMDDHHmmss', TIMEZONE);
  if (!parsed.isValid()) {
    throw new Error(`Invalid A-share timestamp: ${time}`);
  }
  return parsed.utc().toDate();
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

function toNum(v: string): number {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : NaN;
}

function validateRow(ts: Date, code: string, open: number, high: number, low: number, close: number): boolean {
  if (!(ts instanceof Date) || Number.isNaN(ts.getTime())) return false;
  if (!code) return false;
  if (!(open > 0 && high > 0 && low > 0 && close > 0)) return false;
  if (!(high >= open && high >= close && high >= low)) return false;
  if (!(low <= open && low <= close && low <= high)) return false;
  return true;
}

function buildRow(headers: string[], values: string[]): CsvRow | null {
  const map = new Map<string, string>();
  for (let i = 0; i < headers.length; i += 1) {
    map.set(normalizeKey(headers[i]), values[i] ?? '');
  }

  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = map.get(normalizeKey(k));
      if (v != null && v !== '') return v;
    }
    return '';
  };

  const time = get('time', 'timestamp');
  const code = get('code', 'symbol');
  const open = get('open');
  const high = get('high');
  const low = get('low');
  const close = get('close');
  const volume = get('volume', 'vol');
  const codeName = get('code_name', 'codename', 'name');
  const indexName = get('index_name', 'indexname');

  if (!time || !code || !open || !high || !low || !close) return null;

  return { time, code, open, high, low, close, volume, codeName, indexName };
}

async function normalizeOneFile(filePath: string, idx: number, total: number): Promise<NormalizeResult> {
  const start = Date.now();
  const fileName = path.basename(filePath);
  let meta = parseFileNameMeta(fileName);

  const rs = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: rs, crlfDelay: Infinity });

  let headers: string[] | null = null;
  let ws: fs.WriteStream | null = null;
  let outputFile = '';

  let valid = 0;
  let skipped = 0;
  let invalid = 0;
  let symbol = meta?.symbol ?? '';

  try {
    for await (const rawLine of rl) {
      const line = rawLine.trim();
      if (!line) continue;

      if (headers == null) {
        headers = splitCsvLine(line);
        continue;
      }

      const values = splitCsvLine(line);
      const row = buildRow(headers, values);
      if (!row) {
        skipped += 1;
        continue;
      }

      if (!meta) {
        const fallbackCode = row.code.trim();
        if (!fallbackCode) {
          invalid += 1;
          continue;
        }
        symbol = fallbackCode;
        meta = {
          code: fallbackCode,
          symbol: fallbackCode,
          displayName: row.codeName.trim() || fallbackCode,
          indexName: row.indexName.trim() || '',
          timeframe: TIMEFRAME,
          market: MARKET,
          exchange: EXCHANGE,
          source: SOURCE,
        };
      }

      if (!symbol) symbol = meta.symbol;
      if (!symbol) {
        invalid += 1;
        continue;
      }

      if (!ws) {
        const outDir = path.join(OUTPUT_ROOT, symbol, TIMEFRAME);
        await fsp.mkdir(outDir, { recursive: true });
        outputFile = path.join(outDir, fileName);
        ws = fs.createWriteStream(outputFile, { encoding: 'utf-8' });
        ws.write('timestamp,open,high,low,close,volume\n');
      }

      let ts: Date;
      try {
        ts = parseAshareTimestamp(row.time);
      } catch {
        invalid += 1;
        continue;
      }

      const open = toNum(row.open);
      const high = toNum(row.high);
      const low = toNum(row.low);
      const close = toNum(row.close);
      const volumeRaw = toNum(row.volume);
      const volume = Number.isFinite(volumeRaw) ? volumeRaw : 0;
      const code = row.code.trim() || meta.code;

      if (!validateRow(ts, code, open, high, low, close)) {
        invalid += 1;
        continue;
      }

      ws.write(`${ts.toISOString()},${row.open},${row.high},${row.low},${row.close},${Number.isFinite(volume) ? volume : 0}\n`);
      valid += 1;
    }
  } finally {
    rl.close();
    rs.close();
    if (ws) {
      await new Promise<void>((resolve, reject) => {
        ws!.end(() => resolve());
        ws!.on('error', reject);
      });
    }
  }

  const durationMs = Date.now() - start;
  const resolvedSymbol = symbol || meta?.symbol || 'unknown';
  console.log(`[normalize-a-share] ${idx}/${total} ${resolvedSymbol} valid=${valid} skipped=${skipped} invalid=${invalid} durationMs=${durationMs}`);

  return {
    file: fileName,
    symbol: resolvedSymbol,
    outputFile,
    valid,
    skipped,
    invalid,
    durationMs,
  };
}

async function main() {
  const files = await walkCsvFiles(INPUT_DIR);
  if (files.length === 0) {
    console.log(JSON.stringify({ fileCount: 0, totalValid: 0, totalSkipped: 0, totalInvalid: 0, failedFiles: [] }, null, 2));
    return;
  }

  const results: NormalizeResult[] = [];
  const failedFiles: Array<{ file: string; error: string }> = [];

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    try {
      const one = await normalizeOneFile(file, i + 1, files.length);
      results.push(one);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failedFiles.push({ file: path.basename(file), error: msg });
      console.error(`[normalize-a-share] failed file=${file} error=${msg}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        fileCount: files.length,
        successFiles: results.length,
        failedFiles,
        totalValid: results.reduce((n, x) => n + x.valid, 0),
        totalSkipped: results.reduce((n, x) => n + x.skipped, 0),
        totalInvalid: results.reduce((n, x) => n + x.invalid, 0),
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('[data:normalize-a-share] failed', err);
  process.exit(1);
});
