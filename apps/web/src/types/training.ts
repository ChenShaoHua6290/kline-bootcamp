export type Session = {
  id: string;
  market: string;
  symbol: string;
  drivingTimeframe: string;
  totalBars: number;
  initialVisibleBars: number;
  pointer: number;
  finalBalance: number;
  isLiquidated: boolean;
  resetCount: number;
  barsData: Array<{ open: number; high: number; low: number; close: number; time: string }>;
  position: {
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    positionPercent: number;
    stopLossRatio?: number;
    takeProfitRatio?: number;
  } | null;
  actions: Array<{ id: string; actionType: string; price: number; pnl?: number; createdAt: string }>;
  status: string;
};
