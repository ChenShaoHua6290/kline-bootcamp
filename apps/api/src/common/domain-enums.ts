export const Market = {
  STOCK: 'STOCK',
  FUTURES: 'FUTURES',
  GOLD: 'GOLD',
  CRYPTO: 'CRYPTO',
} as const;

export type Market = (typeof Market)[keyof typeof Market];

export const ActionType = {
  OPEN_LONG: 'OPEN_LONG',
  OPEN_SHORT: 'OPEN_SHORT',
  ADD_LONG: 'ADD_LONG',
  ADD_SHORT: 'ADD_SHORT',
  PARTIAL_CLOSE: 'PARTIAL_CLOSE',
  FULL_CLOSE: 'FULL_CLOSE',
  CLOSE: 'CLOSE',
  HOLD: 'HOLD',
  WAIT: 'WAIT',
  TP: 'TP',
  SL: 'SL',
  LIQUIDATED: 'LIQUIDATED',
  END: 'END',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export const PositionSide = {
  LONG: 'LONG',
  SHORT: 'SHORT',
} as const;

export type PositionSide = (typeof PositionSide)[keyof typeof PositionSide];

export const CloseReason = {
  USER: 'USER',
  TAKE_PROFIT: 'TAKE_PROFIT',
  STOP_LOSS: 'STOP_LOSS',
  LIQUIDATED: 'LIQUIDATED',
  END_OF_DATA: 'END_OF_DATA',
} as const;

export type CloseReason = (typeof CloseReason)[keyof typeof CloseReason];

export const MARKET_VALUES = Object.values(Market);
