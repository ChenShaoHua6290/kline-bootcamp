'use client';

import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export function KLineChart({ data }: { data: Array<{ open: number; high: number; low: number; close: number; time: string }> }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, { height: 500, layout: { background: { color: '#020617' }, textColor: '#e2e8f0' } });
    const series = chart.addCandlestickSeries();
    series.setData(data.map((d) => ({ ...d, time: Math.floor(new Date(d.time).getTime() / 1000) as never })) as never);
    return () => chart.remove();
  }, [data]);

  return <div ref={ref} className="h-[500px] w-full" />;
}
