export const REAL_MARKET_TIMEFRAMES = ['15m', '30m', '1H', '2H', '4H', 'D', 'W', 'M'] as const;
export type RealMarketTimeframe = (typeof REAL_MARKET_TIMEFRAMES)[number];

export const REAL_MARKET_TIMEFRAME_SET = new Set<string>(REAL_MARKET_TIMEFRAMES);
const TF_RANK: Record<string, number> = {
  '15m': 1,
  '30m': 2,
  '1H': 3,
  '2H': 4,
  '4H': 5,
  D: 6,
  W: 7,
  M: 8,
};

const TF_MINUTES: Record<string, number> = {
  '15m': 15,
  '30m': 30,
  '1H': 60,
  '2H': 120,
  '4H': 240,
};

export function timeframeToMinutes(timeframe: string): number | null {
  return TF_MINUTES[timeframe] ?? null;
}

export function timeframeRank(timeframe: string): number {
  return TF_RANK[timeframe] ?? Number.MAX_SAFE_INTEGER;
}

export function timeframeToMs(timeframe: string): number | null {
  const minutes = timeframeToMinutes(timeframe);
  return minutes == null ? null : minutes * 60_000;
}

export function getTimeframeBucketStart(timestampMs: number, timeframe: string): number {
  const ms = timeframeToMs(timeframe);
  if (ms != null) return Math.floor(timestampMs / ms) * ms;

  const d = new Date(timestampMs);
  if (timeframe === 'D') {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
  }
  if (timeframe === 'W') {
    const day = d.getUTCDay(); // 0=Sun,1=Mon...
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + mondayOffset, 0, 0, 0, 0);
  }
  if (timeframe === 'M') {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0);
  }
  throw new Error(`Unsupported timeframe: ${timeframe}`);
}

export function getNextBucketStart(bucketStartMs: number, timeframe: string): number {
  const ms = timeframeToMs(timeframe);
  if (ms != null) return bucketStartMs + ms;

  const d = new Date(bucketStartMs);
  if (timeframe === 'D') return bucketStartMs + 24 * 60 * 60_000;
  if (timeframe === 'W') return bucketStartMs + 7 * 24 * 60 * 60_000;
  if (timeframe === 'M') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0);
  throw new Error(`Unsupported timeframe: ${timeframe}`);
}
