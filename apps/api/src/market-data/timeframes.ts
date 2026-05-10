export const REAL_MARKET_TIMEFRAMES = ['15m', '30m', '1H', '2H', '4H', 'D', 'W', 'M'] as const;
export type RealMarketTimeframe = (typeof REAL_MARKET_TIMEFRAMES)[number];

export const REAL_MARKET_TIMEFRAME_SET = new Set<string>(REAL_MARKET_TIMEFRAMES);
