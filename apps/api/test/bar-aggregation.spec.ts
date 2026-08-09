import { describe, expect, it } from 'vitest';
import { aggregateRowsFrom15m } from '../src/market-data/bar-aggregation.service';

describe('bar aggregation', () => {
  it('aggregates 15m bars into 1H with OHLCV rules', () => {
    const source = [
      { timestamp: new Date('2026-01-01T00:00:00.000Z'), open: 100, high: 102, low: 99, close: 101, volume: 10 },
      { timestamp: new Date('2026-01-01T00:15:00.000Z'), open: 101, high: 103, low: 100, close: 102, volume: 20 },
      { timestamp: new Date('2026-01-01T00:30:00.000Z'), open: 102, high: 104, low: 101, close: 103, volume: 30 },
      { timestamp: new Date('2026-01-01T00:45:00.000Z'), open: 103, high: 106, low: 98, close: 105, volume: 40 },
    ];

    const rows = aggregateRowsFrom15m(source, '1H');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      timeframe: '1H',
      open: 100,
      high: 106,
      low: 98,
      close: 105,
      volume: 100,
    });
    expect(rows[0].timestamp.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('throws on unsupported timeframe', () => {
    const source = [{ timestamp: new Date('2026-01-01T00:00:00.000Z'), open: 1, high: 1, low: 1, close: 1, volume: 1 }];
    expect(() => aggregateRowsFrom15m(source, '3H')).toThrow('Unsupported target timeframe');
  });
});

