import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { TrainingService } from '../src/training/training.service';

function createServiceForBarsWindow() {
  const prisma = {
    trainingSession: {
      findFirst: vi.fn(),
    },
    symbol: {
      findFirst: vi.fn(),
    },
  };

  const marketDataService = {
    getBarsByTimeRangeForTraining: vi.fn(),
  };

  const service = new TrainingService(prisma as never, marketDataService as never);
  return { service, prisma, marketDataService };
}

describe('TrainingService.getBarsWindow', () => {
  it('clamps query upper bound to currentTimePointer (safeTo)', async () => {
    const { service, prisma, marketDataService } = createServiceForBarsWindow();
    const barTimes = [
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:15:00.000Z',
      '2026-01-01T00:30:00.000Z',
      '2026-01-01T00:45:00.000Z',
    ];

    prisma.trainingSession.findFirst.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      market: 'CRYPTO',
      symbol: 'BTCUSDT',
      drivingTimeframe: '15m',
      totalBars: 100,
      pointer: 2, // currentTimePointer = 00:30
      barsData: JSON.stringify({
        version: 2,
        drivingTimeframe: '15m',
        bars: barTimes.map((t, i) => ({ open: 1 + i, high: 2 + i, low: 0.5 + i, close: 1.5 + i, time: t })),
        contextStartIndex: 0,
        trainStartIndex: 1,
        trainEndIndex: 99,
      }),
    });
    prisma.symbol.findFirst.mockResolvedValue({ id: 'sym1' });
    marketDataService.getBarsByTimeRangeForTraining.mockResolvedValue([
      { open: 2, high: 3, low: 1, close: 2.5, time: '2026-01-01T00:15:00.000Z' },
      { open: 3, high: 4, low: 2, close: 3.5, time: '2026-01-01T00:30:00.000Z' },
    ]);

    const result = await service.getBarsWindow(
      'u1',
      's1',
      '1H',
      '2026-01-01T00:10:00.000Z',
      '2026-01-01T02:00:00.000Z', // should be clamped
    );

    expect(marketDataService.getBarsByTimeRangeForTraining).toHaveBeenCalledTimes(1);
    const called = marketDataService.getBarsByTimeRangeForTraining.mock.calls[0][0];
    expect(new Date(called.toTs).toISOString()).toBe('2026-01-01T00:30:00.000Z');
    expect(result.to).toBe('2026-01-01T00:30:00.000Z');
    expect(result.currentTimePointer).toBe('2026-01-01T00:30:00.000Z');
  });

  it('throws NotFoundException when db returns no bars for timeframe/range', async () => {
    const { service, prisma, marketDataService } = createServiceForBarsWindow();

    prisma.trainingSession.findFirst.mockResolvedValue({
      id: 's2',
      userId: 'u1',
      market: 'CRYPTO',
      symbol: 'BTCUSDT',
      drivingTimeframe: '15m',
      totalBars: 100,
      pointer: 1,
      barsData: JSON.stringify({
        version: 2,
        drivingTimeframe: '15m',
        bars: [
          { open: 1, high: 2, low: 0.5, close: 1.2, time: '2026-01-01T00:00:00.000Z' },
          { open: 1.2, high: 2.2, low: 1.0, close: 1.8, time: '2026-01-01T00:15:00.000Z' },
        ],
        contextStartIndex: 0,
        trainStartIndex: 1,
        trainEndIndex: 99,
      }),
    });
    prisma.symbol.findFirst.mockResolvedValue({ id: 'sym1' });
    marketDataService.getBarsByTimeRangeForTraining.mockResolvedValue([]);

    await expect(
      service.getBarsWindow('u1', 's2', '4H', '2026-01-01T00:00:00.000Z', '2026-01-01T01:00:00.000Z'),
    ).rejects.toMatchObject({
      message: expect.stringContaining('No bars found for symbol=BTCUSDT, timeframe=4H'),
    });
  });

  it('returns partial candle from market data service without exposing future bars', async () => {
    const { service, prisma, marketDataService } = createServiceForBarsWindow();
    prisma.trainingSession.findFirst.mockResolvedValue({
      id: 's3',
      userId: 'u1',
      market: 'CRYPTO',
      symbol: 'BTCUSDT',
      drivingTimeframe: '1H',
      totalBars: 100,
      pointer: 1,
      barsData: JSON.stringify({
        version: 2,
        drivingTimeframe: '1H',
        bars: [
          { open: 100, high: 101, low: 99, close: 100.5, time: '2026-01-01T08:00:00.000Z' },
          { open: 100.5, high: 102, low: 100, close: 101.2, time: '2026-01-01T09:00:00.000Z' },
        ],
        contextStartIndex: 0,
        trainStartIndex: 1,
        trainEndIndex: 99,
      }),
    });
    prisma.symbol.findFirst.mockResolvedValue({ id: 'sym1' });
    marketDataService.getBarsByTimeRangeForTraining.mockResolvedValue([
      { open: 100, high: 102, low: 99, close: 101.2, volume: 20, time: '2026-01-01T08:00:00.000Z', isPartial: true },
    ]);

    const result = await service.getBarsWindow('u1', 's3', '4H', '2026-01-01T08:00:00.000Z', '2026-01-01T12:00:00.000Z');
    expect(result.bars).toHaveLength(1);
    expect(result.bars[0]).toMatchObject({ isPartial: true, close: 101.2, time: '2026-01-01T08:00:00.000Z' });
  });
});
