const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://kline_user:123456@localhost:5432/kline' });
  await c.connect();
  const r1 = await c.query('select timeframe, count(*)::bigint as bars from bars_stock group by timeframe order by timeframe');
  console.log('bars_stock by timeframe:', JSON.stringify(r1.rows, null, 2));
  const r2 = await c.query('select timeframe, count(*)::int as symbols, sum(case when "isTrainable" then 1 else 0 end)::int as trainable from "SymbolDataStats" where market=\'STOCK\' group by timeframe order by timeframe');
  console.log('SymbolDataStats STOCK:', JSON.stringify(r2.rows, null, 2));
  await c.end();
})();
