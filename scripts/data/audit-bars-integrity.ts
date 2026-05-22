import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Client } from 'pg';

type MarketTable = { market: 'CRYPTO' | 'GOLD' | 'STOCK' | 'FUTURES'; table: string };

const MARKET_TABLES: MarketTable[] = [
  { market: 'CRYPTO', table: 'bars_crypto' },
  { market: 'GOLD', table: 'bars_gold' },
  { market: 'STOCK', table: 'bars_stock' },
  { market: 'FUTURES', table: 'bars_futures' },
];

const ALLOWED_TIMEFRAMES = ['15m', '30m', '1H', '2H', '4H', 'D', 'W', 'M'] as const;
const SAMPLE_LIMIT = 100;

function unionAllBarsSql(): string {
  return MARKET_TABLES.map((m) => {
    return `
      SELECT
        '${m.market}'::text AS market,
        b."id"::text AS bar_id,
        b."symbolId"::text AS symbol_id,
        b."timeframe"::text AS timeframe,
        b."timestamp" AS timestamp,
        b."open"::double precision AS open,
        b."high"::double precision AS high,
        b."low"::double precision AS low,
        b."close"::double precision AS close,
        b."volume"::double precision AS volume,
        b."source"::text AS source,
        b."createdAt" AS created_at
      FROM ${m.table} b
    `;
  }).join('\nUNION ALL\n');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const allBarsSql = unionAllBarsSql();

  try {
    const [{ count: totalSymbols }] = (await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM "Symbol"')).rows;
    const [{ count: totalBars }] = (
      await client.query<{ count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT COUNT(*)::text AS count FROM all_bars
      `)
    ).rows;

    const byMarket = (
      await client.query<{ market: string; count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT market, COUNT(*)::text AS count
        FROM all_bars
        GROUP BY market
        ORDER BY market
      `)
    ).rows.map((r) => ({ market: r.market, count: Number(r.count) }));

    const byTimeframe = (
      await client.query<{ timeframe: string; count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT timeframe, COUNT(*)::text AS count
        FROM all_bars
        GROUP BY timeframe
        ORDER BY timeframe
      `)
    ).rows.map((r) => ({ timeframe: r.timeframe, count: Number(r.count), isValid: ALLOWED_TIMEFRAMES.includes(r.timeframe as never) }));

    const duplicateCountRow = (
      await client.query<{ count: string }>(`
        WITH all_bars AS (${allBarsSql}), dups AS (
          SELECT market, symbol_id, timeframe, timestamp, COUNT(*) AS c
          FROM all_bars
          GROUP BY market, symbol_id, timeframe, timestamp
          HAVING COUNT(*) > 1
        )
        SELECT COUNT(*)::text AS count FROM dups
      `)
    ).rows[0];

    const duplicateSamples = (
      await client.query<{
        market: string;
        symbol_id: string;
        symbol: string | null;
        symbol_market: string | null;
        timeframe: string;
        timestamp: Date;
        duplicate_count: string;
      }>(`
        WITH all_bars AS (${allBarsSql}), dups AS (
          SELECT market, symbol_id, timeframe, timestamp, COUNT(*) AS c
          FROM all_bars
          GROUP BY market, symbol_id, timeframe, timestamp
          HAVING COUNT(*) > 1
        )
        SELECT d.market, d.symbol_id, s.code AS symbol, s.market::text AS symbol_market, d.timeframe, d.timestamp, d.c::text AS duplicate_count
        FROM dups d
        LEFT JOIN "Symbol" s ON s.id = d.symbol_id
        ORDER BY d.c DESC, d.market, d.symbol_id, d.timeframe, d.timestamp
        LIMIT ${SAMPLE_LIMIT}
      `)
    ).rows.map((r) => ({
      market: r.market,
      symbolId: r.symbol_id,
      symbol: r.symbol,
      symbolMarket: r.symbol_market,
      timeframe: r.timeframe,
      timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
      duplicateCount: Number(r.duplicate_count),
    }));

    const orphanCountRow = (
      await client.query<{ count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT COUNT(*)::text AS count
        FROM all_bars b
        LEFT JOIN "Symbol" s ON s.id = b.symbol_id
        WHERE s.id IS NULL
      `)
    ).rows[0];

    const orphanSamples = (
      await client.query<{
        market: string;
        bar_id: string;
        symbol_id: string;
        timeframe: string;
        timestamp: Date;
      }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT b.market, b.bar_id, b.symbol_id, b.timeframe, b.timestamp
        FROM all_bars b
        LEFT JOIN "Symbol" s ON s.id = b.symbol_id
        WHERE s.id IS NULL
        ORDER BY b.timestamp DESC
        LIMIT ${SAMPLE_LIMIT}
      `)
    ).rows.map((r) => ({
      market: r.market,
      barId: r.bar_id,
      symbolId: r.symbol_id,
      timeframe: r.timeframe,
      timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
    }));

    const mismatchRows = (
      await client.query<{ kind: string; count: string }>(`
        WITH all_bars AS (${allBarsSql}), joined AS (
          SELECT b.*, s.market::text AS symbol_market, s.code AS symbol_code, s.exchange AS symbol_exchange
          FROM all_bars b
          JOIN "Symbol" s ON s.id = b.symbol_id
        )
        SELECT 'market_mismatch'::text AS kind, COUNT(*)::text AS count FROM joined WHERE market <> symbol_market
        UNION ALL
        SELECT 'symbol_code_missing'::text AS kind, COUNT(*)::text AS count FROM joined WHERE symbol_code IS NULL OR btrim(symbol_code) = ''
        UNION ALL
        SELECT 'exchange_missing'::text AS kind, COUNT(*)::text AS count FROM joined WHERE symbol_exchange IS NULL OR btrim(symbol_exchange) = ''
      `)
    ).rows;

    const marketMismatchCount = Number(mismatchRows.find((r) => r.kind === 'market_mismatch')?.count ?? '0');
    const symbolMismatchCount = Number(mismatchRows.find((r) => r.kind === 'symbol_code_missing')?.count ?? '0');
    const exchangeMismatchCount = Number(mismatchRows.find((r) => r.kind === 'exchange_missing')?.count ?? '0');

    const marketMismatchSamples = (
      await client.query<{
        bar_id: string;
        bar_market: string;
        symbol_market: string;
        symbol_id: string;
        symbol_code: string;
        symbol_exchange: string | null;
        timeframe: string;
        timestamp: Date;
      }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT b.bar_id, b.market AS bar_market, s.market::text AS symbol_market, b.symbol_id, s.code AS symbol_code, s.exchange AS symbol_exchange, b.timeframe, b.timestamp
        FROM all_bars b
        JOIN "Symbol" s ON s.id = b.symbol_id
        WHERE b.market <> s.market::text
        ORDER BY b.timestamp DESC
        LIMIT ${SAMPLE_LIMIT}
      `)
    ).rows.map((r) => ({
      barId: r.bar_id,
      barMarket: r.bar_market,
      symbolMarket: r.symbol_market,
      symbolId: r.symbol_id,
      symbol: r.symbol_code,
      exchange: r.symbol_exchange,
      timeframe: r.timeframe,
      timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
    }));

    const mixedCodeInBars = (
      await client.query<{ symbol: string; markets: string[]; count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT s.code AS symbol, ARRAY_AGG(DISTINCT b.market ORDER BY b.market) AS markets, COUNT(*)::text AS count
        FROM all_bars b
        JOIN "Symbol" s ON s.id = b.symbol_id
        GROUP BY s.code
        HAVING COUNT(DISTINCT b.market) > 1
        ORDER BY COUNT(*) DESC, s.code
      `)
    ).rows.map((r) => ({ symbol: r.symbol, markets: r.markets, count: Number(r.count) }));

    const mixedCodeInSymbols = (
      await client.query<{ symbol: string; markets: string[]; count: string }>(`
        SELECT code AS symbol, ARRAY_AGG(DISTINCT market::text ORDER BY market::text) AS markets, COUNT(*)::text AS count
        FROM "Symbol"
        GROUP BY code
        HAVING COUNT(DISTINCT market) > 1
        ORDER BY COUNT(*) DESC, code
      `)
    ).rows.map((r) => ({ symbol: r.symbol, markets: r.markets, count: Number(r.count) }));

    const duplicateSymbols = (
      await client.query<{ market: string; exchange: string | null; symbol: string; count: string; ids: string[] }>(`
        SELECT market::text AS market, exchange, code AS symbol, COUNT(*)::text AS count, ARRAY_AGG(id ORDER BY id) AS ids
        FROM "Symbol"
        GROUP BY market, exchange, code
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC, market, exchange, code
      `)
    ).rows.map((r) => ({
      market: r.market,
      exchange: r.exchange,
      symbol: r.symbol,
      count: Number(r.count),
      ids: r.ids,
    }));

    const stockLinkedNonStockCount = Number((
      await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM bars_stock b
        JOIN "Symbol" s ON s.id = b."symbolId"
        WHERE s.market <> 'STOCK'
      `)
    ).rows[0]?.count ?? '0');

    const stockLinkedNonStockSamples = (
      await client.query<{
        bar_id: string;
        bar_symbol_id: string;
        symbol_market: string;
        symbol_code: string;
        timeframe: string;
        timestamp: Date;
      }>(`
        SELECT b.id::text AS bar_id, b."symbolId"::text AS bar_symbol_id, s.market::text AS symbol_market, s.code AS symbol_code, b.timeframe, b.timestamp
        FROM bars_stock b
        JOIN "Symbol" s ON s.id = b."symbolId"
        WHERE s.market <> 'STOCK'
        ORDER BY b.timestamp DESC
        LIMIT ${SAMPLE_LIMIT}
      `)
    ).rows.map((r) => ({
      barId: r.bar_id,
      symbolId: r.bar_symbol_id,
      symbolMarket: r.symbol_market,
      symbol: r.symbol_code,
      timeframe: r.timeframe,
      timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
    }));

    const cryptoLinkedNonCryptoCount = Number((
      await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM bars_crypto b
        JOIN "Symbol" s ON s.id = b."symbolId"
        WHERE s.market <> 'CRYPTO'
      `)
    ).rows[0]?.count ?? '0');

    const cryptoLinkedNonCryptoSamples = (
      await client.query<{
        bar_id: string;
        bar_symbol_id: string;
        symbol_market: string;
        symbol_code: string;
        timeframe: string;
        timestamp: Date;
      }>(`
        SELECT b.id::text AS bar_id, b."symbolId"::text AS bar_symbol_id, s.market::text AS symbol_market, s.code AS symbol_code, b.timeframe, b.timestamp
        FROM bars_crypto b
        JOIN "Symbol" s ON s.id = b."symbolId"
        WHERE s.market <> 'CRYPTO'
        ORDER BY b.timestamp DESC
        LIMIT ${SAMPLE_LIMIT}
      `)
    ).rows.map((r) => ({
      barId: r.bar_id,
      symbolId: r.bar_symbol_id,
      symbolMarket: r.symbol_market,
      symbol: r.symbol_code,
      timeframe: r.timeframe,
      timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
    }));

    const symbolIdNullCount = Number((
      await client.query<{ count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT COUNT(*)::text AS count
        FROM all_bars
        WHERE symbol_id IS NULL OR btrim(symbol_id) = ''
      `)
    ).rows[0]?.count ?? '0');

    const groupedStats = (
      await client.query<{
        market: string;
        symbol: string;
        timeframe: string;
        bar_count: string;
        min_ts: Date;
        max_ts: Date;
      }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT b.market, s.code AS symbol, b.timeframe, COUNT(*)::text AS bar_count, MIN(b.timestamp) AS min_ts, MAX(b.timestamp) AS max_ts
        FROM all_bars b
        JOIN "Symbol" s ON s.id = b.symbol_id
        GROUP BY b.market, s.code, b.timeframe
      `)
    ).rows.map((r) => ({
      market: r.market,
      symbol: r.symbol,
      timeframe: r.timeframe,
      barCount: Number(r.bar_count),
      minTimestamp: r.min_ts?.toISOString?.() ?? String(r.min_ts),
      maxTimestamp: r.max_ts?.toISOString?.() ?? String(r.max_ts),
    }));

    const top30Largest = groupedStats
      .slice()
      .sort((a, b) => b.barCount - a.barCount)
      .slice(0, 30);

    const top30SmallestPositive = groupedStats
      .filter((x) => x.barCount > 0)
      .slice()
      .sort((a, b) => a.barCount - b.barCount)
      .slice(0, 30);

    const smallDatasets = groupedStats
      .filter((x) => x.barCount < 500)
      .sort((a, b) => a.barCount - b.barCount)
      .slice(0, 300);

    const invalidTimeframes = byTimeframe.filter((x) => !x.isValid);
    const invalidTimeframeCount = invalidTimeframes.reduce((sum, x) => sum + x.count, 0);

    const suspiciousMarketTimeframes = groupedStats.filter((x) => {
      if (x.market === 'STOCK') {
        return !['15m', '30m', '1H', '2H', '4H', 'D', 'W', 'M'].includes(x.timeframe);
      }
      return !ALLOWED_TIMEFRAMES.includes(x.timeframe as never);
    });

    const ohlcInvalidCount = Number((
      await client.query<{ count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT COUNT(*)::text AS count
        FROM all_bars
        WHERE open <= 0
          OR high <= 0
          OR low <= 0
          OR close <= 0
          OR high < low
          OR high < open
          OR high < close
          OR low > open
          OR low > close
      `)
    ).rows[0]?.count ?? '0');

    const ohlcInvalidSamples = (
      await client.query<{
        market: string;
        bar_id: string;
        symbol_id: string;
        symbol: string | null;
        timeframe: string;
        timestamp: Date;
        open: number;
        high: number;
        low: number;
        close: number;
      }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT b.market, b.bar_id, b.symbol_id, s.code AS symbol, b.timeframe, b.timestamp, b.open, b.high, b.low, b.close
        FROM all_bars b
        LEFT JOIN "Symbol" s ON s.id = b.symbol_id
        WHERE b.open <= 0
          OR b.high <= 0
          OR b.low <= 0
          OR b.close <= 0
          OR b.high < b.low
          OR b.high < b.open
          OR b.high < b.close
          OR b.low > b.open
          OR b.low > b.close
        ORDER BY b.timestamp DESC
        LIMIT ${SAMPLE_LIMIT}
      `)
    ).rows.map((r) => ({
      market: r.market,
      barId: r.bar_id,
      symbolId: r.symbol_id,
      symbol: r.symbol,
      timeframe: r.timeframe,
      timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
    }));

    const timestampNullCount = Number((
      await client.query<{ count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT COUNT(*)::text AS count FROM all_bars WHERE timestamp IS NULL
      `)
    ).rows[0]?.count ?? '0');

    const timestampFutureCount = Number((
      await client.query<{ count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT COUNT(*)::text AS count FROM all_bars WHERE timestamp > NOW()
      `)
    ).rows[0]?.count ?? '0');

    const timestampTooOldCount = Number((
      await client.query<{ count: string }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT COUNT(*)::text AS count FROM all_bars WHERE timestamp < TIMESTAMPTZ '1990-01-01 00:00:00+00'
      `)
    ).rows[0]?.count ?? '0');

    const timestampFutureSamples = (
      await client.query<{ market: string; bar_id: string; symbol_id: string; symbol: string | null; timeframe: string; timestamp: Date }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT b.market, b.bar_id, b.symbol_id, s.code AS symbol, b.timeframe, b.timestamp
        FROM all_bars b
        LEFT JOIN "Symbol" s ON s.id = b.symbol_id
        WHERE b.timestamp > NOW()
        ORDER BY b.timestamp DESC
        LIMIT ${SAMPLE_LIMIT}
      `)
    ).rows.map((r) => ({
      market: r.market,
      barId: r.bar_id,
      symbolId: r.symbol_id,
      symbol: r.symbol,
      timeframe: r.timeframe,
      timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
    }));

    const timestampTooOldSamples = (
      await client.query<{ market: string; bar_id: string; symbol_id: string; symbol: string | null; timeframe: string; timestamp: Date }>(`
        WITH all_bars AS (${allBarsSql})
        SELECT b.market, b.bar_id, b.symbol_id, s.code AS symbol, b.timeframe, b.timestamp
        FROM all_bars b
        LEFT JOIN "Symbol" s ON s.id = b.symbol_id
        WHERE b.timestamp < TIMESTAMPTZ '1990-01-01 00:00:00+00'
        ORDER BY b.timestamp ASC
        LIMIT ${SAMPLE_LIMIT}
      `)
    ).rows.map((r) => ({
      market: r.market,
      barId: r.bar_id,
      symbolId: r.symbol_id,
      symbol: r.symbol,
      timeframe: r.timeframe,
      timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
    }));

    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        auditMode: 'read-only',
        allowedTimeframes: ALLOWED_TIMEFRAMES,
        note: 'Current schema uses market-split tables (bars_crypto/bars_stock/...). No write operations executed.',
      },
      summary: {
        totalSymbols: Number(totalSymbols),
        totalBars: Number(totalBars),
        duplicateBarsCount: Number(duplicateCountRow?.count ?? '0'),
        orphanBarsCount: Number(orphanCountRow?.count ?? '0'),
        marketMismatchCount,
        symbolMismatchCount,
        exchangeMismatchCount,
        duplicateSymbolsCount: duplicateSymbols.length,
        stockLinkedToNonStockCount: stockLinkedNonStockCount,
        cryptoLinkedToNonCryptoCount: cryptoLinkedNonCryptoCount,
        symbolIdNullCount,
        invalidTimeframeCount,
        ohlcInvalidCount,
        timestampNullCount,
        timestampFutureCount,
        timestampTooOldCount,
      },
      distributions: {
        barsByMarket: byMarket,
        barsByTimeframe: byTimeframe,
      },
      duplicates: {
        count: Number(duplicateCountRow?.count ?? '0'),
        samples: duplicateSamples,
      },
      orphans: {
        count: Number(orphanCountRow?.count ?? '0'),
        samples: orphanSamples,
      },
      mismatches: {
        marketMismatchCount,
        marketMismatchSamples,
        symbolMismatchCount,
        exchangeMismatchCount,
        schemaNote: 'bars tables do not store symbol/exchange columns directly; symbol/exchange checks are performed via joined Symbol table.',
      },
      crossMarketMixing: {
        barsSymbolAcrossMarkets: mixedCodeInBars,
        symbolsAcrossMarkets: mixedCodeInSymbols,
      },
      duplicateSymbols: {
        count: duplicateSymbols.length,
        rows: duplicateSymbols,
      },
      stockCryptoWrongLinks: {
        stockLinkedToNonStockCount: stockLinkedNonStockCount,
        stockLinkedToNonStockSamples,
        cryptoLinkedToNonCryptoCount,
        cryptoLinkedToNonCryptoSamples,
      },
      datasetStats: {
        top30Largest,
        top30SmallestPositive,
        smallDatasetsBelow500: smallDatasets,
        suspiciousMarketTimeframes,
      },
      timeframeAudit: {
        allowed: ALLOWED_TIMEFRAMES,
        invalidTimeframes,
      },
      ohlcAudit: {
        invalidCount: ohlcInvalidCount,
        samples: ohlcInvalidSamples,
      },
      timeAudit: {
        timestampNullCount,
        timestampFutureCount,
        timestampFutureSamples,
        timestampTooOldCount,
        timestampTooOldSamples,
      },
      suggestedFixPlan: [
        'If market mismatch exists (bars table market inferred by table name differs from Symbol.market), re-map symbolId by (targetMarket + symbol code + exchange) and dry-run update first.',
        'If duplicate bars exist, keep one row per (market, symbolId, timeframe, timestamp), prefer earliest createdAt or smallest id in a dry-run repair script.',
        'If orphan bars exist, try re-link by symbol code and market context; if no match, quarantine candidates instead of deleting directly.',
        'If stock bars linked to non-stock symbols (or crypto to non-crypto), re-associate symbolId based on market+code and validate row counts before applying.',
        'If duplicate symbols exist, choose canonical symbol id, remap bars symbolId, then archive redundant symbols after verification.',
      ],
    };

    const reportDir = path.join(process.cwd(), 'data', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'bars-integrity-audit.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('===== Bars Integrity Audit =====');
    console.log(`1. Total symbols: ${report.summary.totalSymbols}`);
    console.log(`2. Total bars: ${report.summary.totalBars}`);
    console.log('3. Bars by market:', report.distributions.barsByMarket);
    console.log('4. Bars by timeframe:', report.distributions.barsByTimeframe);
    console.log(`5. Duplicate bars count: ${report.summary.duplicateBarsCount}`);
    console.log(`6. Orphan bars count: ${report.summary.orphanBarsCount}`);
    console.log(`7. Market mismatch count: ${report.summary.marketMismatchCount}`);
    console.log(`8. Symbol mismatch count: ${report.summary.symbolMismatchCount}`);
    console.log(`9. Exchange mismatch count: ${report.summary.exchangeMismatchCount}`);
    console.log(`10. Duplicate symbols count: ${report.summary.duplicateSymbolsCount}`);
    console.log(`11. Stock linked to non-stock count: ${report.summary.stockLinkedToNonStockCount}`);
    console.log(`12. Crypto linked to non-crypto count: ${report.summary.cryptoLinkedToNonCryptoCount}`);
    console.log(`13. Invalid timeframe count: ${report.summary.invalidTimeframeCount}`);
    console.log(`14. OHLC invalid count: ${report.summary.ohlcInvalidCount}`);
    console.log(`15. Suspicious small datasets (<500): ${report.datasetStats.smallDatasetsBelow500.length}`);
    console.log('16. Suggested fix plan: see report.suggestedFixPlan');
    console.log(`JSON report written to: ${reportPath}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[data:audit-bars] failed', err);
  process.exit(1);
});
