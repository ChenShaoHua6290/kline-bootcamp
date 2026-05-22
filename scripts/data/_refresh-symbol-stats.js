const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: 'postgresql://kline_user:123456@localhost:5432/kline' });
  await client.connect();
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
        "updatedAt"=NOW();
  `);
  const rs = await client.query(`select market,timeframe,count(*)::int as symbols,sum(case when "isTrainable" then 1 else 0 end)::int as trainable from "SymbolDataStats" where market='STOCK' group by market,timeframe order by timeframe`);
  console.log(JSON.stringify(rs.rows, null, 2));
  await client.end();
})();
