import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import axios from 'axios';

type MarketSymbolConfig = {
  market: string;
  exchange: string;
  source: string;
  symbol: string;
  displayName?: string;
  rawTimeframe: string;
  baseTimeframe: string;
  timezone: string;
  rawPath: string;
  enabled: boolean;
};

type Replacement = {
  from: string;
  to: string;
  reason: string;
};

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'market-symbols.json');
const CACHE_PATH = path.join(ROOT, 'storage', 'cache', 'binance-exchange-info.json');
const BINANCE_EXCHANGE_INFO_ENDPOINTS = [
  'https://fapi.binance.com/fapi/v1/exchangeInfo',
  'https://fapi1.binance.com/fapi/v1/exchangeInfo',
  'https://fapi2.binance.com/fapi/v1/exchangeInfo',
  'https://fapi3.binance.com/fapi/v1/exchangeInfo',
];
const MAX_RETRIES = 3;
const KNOWN_1000_MAP: Record<string, string> = {
  SHIBUSDT: '1000SHIBUSDT',
  PEPEUSDT: '1000PEPEUSDT',
  FLOKIUSDT: '1000FLOKIUSDT',
  BONKUSDT: '1000BONKUSDT',
  LUNCUSDT: '1000LUNCUSDT',
};

function hasApplyFlag(): boolean {
  return process.argv.slice(2).includes('--apply');
}

function isTarget(row: MarketSymbolConfig): boolean {
  return row.enabled && row.market === 'crypto' && row.exchange === 'binance';
}

async function fetchBinanceSymbols(): Promise<{ symbols: Set<string>; source: 'live' | 'cache' } | null> {
  let lastErr: unknown = null;

  for (const endpoint of BINANCE_EXCHANGE_INFO_ENDPOINTS) {
    for (let i = 0; i < MAX_RETRIES; i += 1) {
      try {
        const res = await axios.get(endpoint, {
          timeout: 30_000,
          validateStatus: () => true,
        });
        if (res.status < 200 || res.status >= 300 || !res.data?.symbols) {
          throw new Error(`Failed to fetch exchangeInfo: HTTP ${res.status} from ${endpoint}`);
        }
        const symbols = (res.data.symbols as Array<{ symbol: string }>).map((s) => s.symbol.toUpperCase());
        await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
        await fs.writeFile(
          CACHE_PATH,
          JSON.stringify({ fetchedAt: new Date().toISOString(), endpoint, symbols }, null, 2),
          'utf-8',
        );
        return { symbols: new Set(symbols), source: 'live' };
      } catch (err) {
        lastErr = err;
        const delayMs = 400 * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  try {
    const cachedRaw = await fs.readFile(CACHE_PATH, 'utf-8');
    const cached = JSON.parse(cachedRaw) as { symbols?: string[] };
    const symbols = Array.isArray(cached.symbols) ? cached.symbols.map((s) => s.toUpperCase()) : [];
    if (symbols.length > 0) {
      console.warn('[data:verify-binance-symbols] network unavailable, using cached exchangeInfo');
      return { symbols: new Set(symbols), source: 'cache' };
    }
  } catch {
    // ignore cache read failure
  }

  console.warn('[data:verify-binance-symbols] network unavailable and no cache found, fallback to heuristic mode');
  if (lastErr instanceof Error) {
    console.warn(`[data:verify-binance-symbols] last error: ${lastErr.message}`);
  }
  return null;
}

function suggest1000Variant(symbol: string, exists: Set<string>): string | null {
  const upper = symbol.toUpperCase();
  if (!upper.endsWith('USDT')) return null;
  if (upper.startsWith('1000')) return null;
  const base = upper.slice(0, -4);
  const candidate = `1000${base}USDT`;
  return exists.has(candidate) ? candidate : null;
}

function suggest1000VariantHeuristic(symbol: string): string | null {
  const upper = symbol.toUpperCase();
  if (upper.startsWith('1000')) return null;
  return KNOWN_1000_MAP[upper] ?? null;
}

function replaceSymbolInRawPath(rawPath: string, oldSymbol: string, nextSymbol: string): string {
  const parts = rawPath.split('/');
  return parts.map((p) => (p.toUpperCase() === oldSymbol.toUpperCase() ? nextSymbol : p)).join('/');
}

async function main() {
  const apply = hasApplyFlag();
  const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
  const allConfigs = JSON.parse(raw) as MarketSymbolConfig[];
  const targetConfigs = allConfigs.filter(isTarget);
  const fetched = await fetchBinanceSymbols();
  const exchangeSymbols = fetched?.symbols ?? null;

  const validSymbols: string[] = [];
  const invalidSymbols: string[] = [];
  const suggestedReplacements: Replacement[] = [];

  for (const row of targetConfigs) {
    const symbol = row.symbol.toUpperCase();
    if (exchangeSymbols && exchangeSymbols.has(symbol)) {
      validSymbols.push(symbol);
      continue;
    }
    const suggestion = exchangeSymbols ? suggest1000Variant(symbol, exchangeSymbols) : suggest1000VariantHeuristic(symbol);
    if (suggestion) {
      invalidSymbols.push(symbol);
      suggestedReplacements.push({
        from: symbol,
        to: suggestion,
        reason: exchangeSymbols ? `${symbol} not found, but ${suggestion} exists` : `${symbol} heuristic replacement -> ${suggestion}`,
      });
      continue;
    }
    if (exchangeSymbols) invalidSymbols.push(symbol);
    else validSymbols.push(symbol);
  }

  let appliedCount = 0;
  if (apply && suggestedReplacements.length > 0) {
    const map = new Map<string, string>(suggestedReplacements.map((x) => [x.from.toUpperCase(), x.to]));
    const next = allConfigs.map((row) => {
      if (!isTarget(row)) return row;
      const from = row.symbol.toUpperCase();
      const to = map.get(from);
      if (!to) return row;
      appliedCount += 1;
      return {
        ...row,
        symbol: to,
        rawPath: replaceSymbolInRawPath(row.rawPath, from, to),
      };
    });
    await fs.writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
  }

  console.log(
    JSON.stringify(
      {
        checkedCount: targetConfigs.length,
        verificationMode: exchangeSymbols ? `online-${fetched?.source}` : 'heuristic-offline',
        validCount: validSymbols.length,
        invalidCount: invalidSymbols.length,
        suggestionCount: suggestedReplacements.length,
        apply,
        appliedCount,
        validSymbols,
        invalidSymbols,
        suggestedReplacements,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('[data:verify-binance-symbols] failed', err);
  process.exit(1);
});
