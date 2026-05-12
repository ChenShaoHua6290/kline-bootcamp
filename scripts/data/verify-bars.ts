import { Client } from 'pg';

type MarketRow = { market: string; table_name: string };

const MARKET_TABLES: MarketRow[] = [
  { market: 'crypto', table_name: 'bars_crypto' },
  { market: 'forex', table_name: 'bars_forex' },
  { market: 'gold', table_name: 'bars_gold' },
  { market: 'stock', table_name: 'bars_stock' },
  { market: 'futures', table_name: 'bars_futures' },
];

function unionSql(selectExpr: (t: MarketRow) => string) {
  return MARKET_TABLES.map((t) => selectExpr(t)).join('\nUNION ALL\n');
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const allBarsCte = unionSql(
      (t) =>
        `SELECT '${t.market}' AS market, b."symbolId", b.timeframe, b.timestamp, b.open, b.high, b.low, b.close, b.volume FROM ${t.table_name} b`,
    );

    const byMarket = await client.query<{ market: string; count: string }>(`
      WITH all_bars AS (${allBarsCte})
      SELECT market, COUNT(*)::text AS count
      FROM all_bars
      GROUP BY market
      ORDER BY market
    `);

    const bySymbol = await client.query<{ market: string; symbol: string; count: string }>(`
      WITH all_bars AS (${allBarsCte})
      SELECT a.market, s.code AS symbol, COUNT(*)::text AS count
      FROM all_bars a
      JOIN "Symbol" s ON s.id = a."symbolId"
      GROUP BY a.market, s.code
      ORDER BY a.market, s.code
    `);

    const byTimeframe = await client.query<{ market: string; timeframe: string; count: string }>(`
      WITH all_bars AS (${allBarsCte})
      SELECT market, timeframe, COUNT(*)::text AS count
      FROM all_bars
      GROUP BY market, timeframe
      ORDER BY market, timeframe
    `);

    const bySymbolTimeframeRange = await client.query<{
      market: string;
      symbol: string;
      timeframe: string;
      count: string;
      start: Date;
      end: Date;
    }>(`
      WITH all_bars AS (${allBarsCte})
      SELECT a.market, s.code AS symbol, a.timeframe, COUNT(*)::text AS count, MIN(a.timestamp) AS start, MAX(a.timestamp) AS end
      FROM all_bars a
      JOIN "Symbol" s ON s.id = a."symbolId"
      GROUP BY a.market, s.code, a.timeframe
      ORDER BY a.market, s.code, a.timeframe
    `);

    const duplicates = await client.query<{ market: string; symbol: string; timeframe: string; duplicate_rows: string }>(`
      WITH all_bars AS (${allBarsCte}), dups AS (
        SELECT market, "symbolId", timeframe, timestamp, COUNT(*) AS c
        FROM all_bars
        GROUP BY market, "symbolId", timeframe, timestamp
        HAVING COUNT(*) > 1
      )
      SELECT d.market, s.code AS symbol, d.timeframe, COUNT(*)::text AS duplicate_rows
      FROM dups d
      JOIN "Symbol" s ON s.id = d."symbolId"
      GROUP BY d.market, s.code, d.timeframe
      ORDER BY d.market, s.code, d.timeframe
    `);

    const anomalies = await client.query<{ market: string; symbol: string; timeframe: string; anomaly_rows: string }>(`
      WITH all_bars AS (${allBarsCte})
      SELECT a.market, s.code AS symbol, a.timeframe, COUNT(*)::text AS anomaly_rows
      FROM all_bars a
      JOIN "Symbol" s ON s.id = a."symbolId"
      WHERE a.high < a.low
         OR a.high < a.open
         OR a.high < a.close
         OR a.low > a.open
         OR a.low > a.close
         OR a.open <= 0
         OR a.high <= 0
         OR a.low <= 0
         OR a.close <= 0
      GROUP BY a.market, s.code, a.timeframe
      ORDER BY a.market, s.code, a.timeframe
    `);

    console.log(
      JSON.stringify(
        {
          byMarket: byMarket.rows.map((r) => ({ market: r.market, count: Number(r.count) })),
          bySymbol: bySymbol.rows.map((r) => ({ market: r.market, symbol: r.symbol, count: Number(r.count) })),
          byTimeframe: byTimeframe.rows.map((r) => ({ market: r.market, timeframe: r.timeframe, count: Number(r.count) })),
          bySymbolTimeframeRange: bySymbolTimeframeRange.rows.map((r) => ({
            market: r.market,
            symbol: r.symbol,
            timeframe: r.timeframe,
            count: Number(r.count),
            start: r.start?.toISOString() ?? null,
            end: r.end?.toISOString() ?? null,
          })),
          duplicates: duplicates.rows.map((r) => ({
            market: r.market,
            symbol: r.symbol,
            timeframe: r.timeframe,
            duplicateRows: Number(r.duplicate_rows),
          })),
          ohlcAnomalies: anomalies.rows.map((r) => ({
            market: r.market,
            symbol: r.symbol,
            timeframe: r.timeframe,
            anomalyRows: Number(r.anomaly_rows),
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[data:verify] failed', err);
  process.exit(1);
});
