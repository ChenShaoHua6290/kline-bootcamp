import { describe, expect, it } from 'vitest';
import { buildStopPrices, calcFloatingPnl } from '../src/training/training.engine';

describe('training engine', () => {
  it('calculates long pnl', () => {
    expect(calcFloatingPnl('LONG', 100, 110, 1000)).toBeCloseTo(100);
  });

  it('calculates short pnl', () => {
    expect(calcFloatingPnl('SHORT', 100, 90, 1000)).toBeCloseTo(100);
  });

  it('builds stop prices for long', () => {
    const result = buildStopPrices('LONG', 100, 0.1, 0.2);
    expect(result.stopLossPrice).toBe(90);
    expect(result.takeProfitPrice).toBe(120);
  });
});
