import { Injectable } from '@nestjs/common';
import { Market } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export type Bar = { open: number; high: number; low: number; close: number; time: string };

@Injectable()
export class MarketDataService {
  constructor(private readonly prisma: PrismaService) {}

  async pickRandomSeries(market: Market, timeframe: string, totalBars: number): Promise<{ symbol: string; bars: Bar[] }> {
    const symbols = await this.prisma.symbol.findMany({ where: { market }, take: 20 });
    if (symbols.length > 0) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const allBars = await this.prisma.marketBar.findMany({
        where: { symbolId: symbol.id, timeframe },
        orderBy: { openTime: 'asc' },
      });
      if (allBars.length > totalBars + 10) {
        const start = Math.floor(Math.random() * (allBars.length - totalBars));
        const bars = allBars.slice(start, start + totalBars).map((b) => ({
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          time: b.openTime.toISOString(),
        }));
        return { symbol: symbol.code, bars };
      }
    }

    return { symbol: `${market}_SYNTH`, bars: this.generateSyntheticBars(totalBars) };
  }

  private generateSyntheticBars(totalBars: number): Bar[] {
    const bars: Bar[] = [];
    let price = 100 + Math.random() * 30;
    for (let i = 0; i < totalBars; i += 1) {
      const drift = (Math.random() - 0.5) * 2;
      const open = price;
      const close = Math.max(1, open + drift);
      const high = Math.max(open, close) + Math.random() * 1.2;
      const low = Math.max(0.1, Math.min(open, close) - Math.random() * 1.2);
      bars.push({ open, high, low, close, time: new Date(Date.now() + i * 60_000).toISOString() });
      price = close;
    }
    return bars;
  }
}
