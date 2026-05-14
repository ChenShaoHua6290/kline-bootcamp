const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: 'postgresql://kline_user:123456@localhost:5432/kline' });
  await c.connect();

  const r = await c.query(
    `select market,timeframe,count(*)::int as symbols,
            sum(case when "isTrainable" then 1 else 0 end)::int as trainable,
            min("barCount")::int as min_bars,
            max("barCount")::int as max_bars
     from "SymbolDataStats"
     where market='STOCK'
     group by market,timeframe
     order by timeframe`
  );
  console.log(JSON.stringify(r.rows, null, 2));

  const r2 = await c.query(`select count(*)::int as symbols from "Symbol" where market='STOCK' and exchange='cn_a_share' and "isActive"=true`);
  console.log(JSON.stringify({ active_stock_symbols: r2.rows[0].symbols }, null, 2));

  await c.end();
})();
