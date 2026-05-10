const MARKET_LABELS: Record<string, string> = {
  STOCK: '股票',
  FOREX: '外汇',
  FUTURES: '期货',
  GOLD: '黄金',
  CRYPTO: '加密货币',
};

const SYMBOL_LABELS: Record<string, string> = {
  STOCK_SYNTH: '股票模拟',
  FOREX_SYNTH: '外汇模拟',
  FUTURES_SYNTH: '期货模拟',
  GOLD_SYNTH: '黄金模拟',
  CRYPTO_SYNTH: '加密货币模拟',
};

export function formatMarketLabel(market?: string | null) {
  if (!market) return '--';
  return MARKET_LABELS[market] ?? market;
}

export function formatSymbolLabel(symbol?: string | null) {
  if (!symbol) return '--';
  return SYMBOL_LABELS[symbol] ?? symbol;
}
