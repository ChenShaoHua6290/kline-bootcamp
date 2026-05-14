const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: 'postgresql://kline_user:123456@localhost:5432/kline' });
  await c.connect();

  const summary = await c.query(`
    WITH stock_symbols AS (
      SELECT id, code FROM "Symbol" WHERE market='STOCK' AND exchange='cn_a_share' AND "isActive"=true
    ),
    bars AS (
      SELECT b."symbolId", b.timeframe, COUNT(*)::bigint AS bar_count, MIN(b.timestamp) AS start_time, MAX(b.timestamp) AS end_time
      FROM bars_stock b
      GROUP BY b."symbolId", b.timeframe
    ),
    tf AS (
      SELECT
        bars.timeframe,
        COUNT(*)::int AS symbols_with_data,
        SUM(bars.bar_count)::bigint AS total_bars,
        MIN(bars.bar_count)::int AS min_bars_per_symbol,
        MAX(bars.bar_count)::int AS max_bars_per_symbol,
        MIN(bars.start_time) AS global_start_time,
        MAX(bars.end_time) AS global_end_time
      FROM bars
      JOIN stock_symbols s ON s.id = bars."symbolId"
      GROUP BY bars.timeframe
    ),
    train AS (
      SELECT timeframe,
             COUNT(*)::int AS stats_symbols,
             SUM(CASE WHEN "isTrainable" THEN 1 ELSE 0 END)::int AS trainable_symbols,
             MIN("barCount")::int AS min_stats_bars,
             MAX("barCount")::int AS max_stats_bars
      FROM "SymbolDataStats"
      WHERE market='STOCK'
      GROUP BY timeframe
    )
    SELECT
      tf.timeframe,
      tf.symbols_with_data,
      (SELECT COUNT(*)::int FROM stock_symbols) AS total_stock_symbols,
      ((SELECT COUNT(*)::int FROM stock_symbols) - tf.symbols_with_data) AS missing_symbols,
      tf.total_bars,
      tf.min_bars_per_symbol,
      tf.max_bars_per_symbol,
      tf.global_start_time,
      tf.global_end_time,
      COALESCE(train.stats_symbols, 0) AS stats_symbols,
      COALESCE(train.trainable_symbols, 0) AS trainable_symbols,
      COALESCE(train.min_stats_bars, 0) AS min_stats_bars,
      COALESCE(train.max_stats_bars, 0) AS max_stats_bars
    FROM tf
    LEFT JOIN train ON train.timeframe = tf.timeframe
    ORDER BY CASE tf.timeframe
      WHEN '15m' THEN 1
      WHEN '30m' THEN 2
      WHEN '1H' THEN 3
      WHEN '2H' THEN 4
      WHEN '4H' THEN 5
      WHEN 'D' THEN 6
      WHEN 'W' THEN 7
      WHEN 'M' THEN 8
      ELSE 99 END
  `);

  const jobs = await c.query(`
    SELECT
      COUNT(*)::int AS active_sessions
    FROM "TrainingSession"
    WHERE status='ACTIVE'
  `);

  const symbolCount = await c.query(`
    SELECT COUNT(*)::int AS count
    FROM "Symbol"
    WHERE market='STOCK' AND exchange='cn_a_share' AND "isActive"=true
  `);

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    stockActiveSymbols: symbolCount.rows[0].count,
    activeTrainingSessions: jobs.rows[0].active_sessions,
    byTimeframe: summary.rows
  }, null, 2));

  await c.end();
})();
