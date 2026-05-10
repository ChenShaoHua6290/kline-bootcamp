'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ReplayChart } from '@/components/ReplayChart';
import { TradeHistoryList } from '@/components/TradeHistoryList';
import { ReplayStatsPanel } from '@/components/ReplayStatsPanel';
import { normalizeSession } from '@/lib/session';
import { formatMarketLabel } from '@/lib/market';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageDescription, PageHeader, PageTitle } from '@/components/ui/PageHeader';

const TIMEFRAME_TO_STEP: Record<string, number> = {
  '15m': 1,
  '30m': 2,
  '1H': 4,
  '2H': 8,
  '4H': 16,
  D: 96,
  W: 96 * 7,
};

function aggregateBars(
  bars: Array<{ open: number; high: number; low: number; close: number; time: string }>,
  step: number,
) {
  if (step <= 1) return bars;
  const out: Array<{ open: number; high: number; low: number; close: number; time: string }> = [];
  for (let i = 0; i < bars.length; i += step) {
    const chunk = bars.slice(i, i + step);
    if (chunk.length === 0) continue;
    out.push({
      open: chunk[0].open,
      high: Math.max(...chunk.map((x) => x.high)),
      low: Math.min(...chunk.map((x) => x.low)),
      close: chunk[chunk.length - 1].close,
      time: chunk[chunk.length - 1].time,
    });
  }
  return out;
}

export default function ReplayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [viewTimeframe, setViewTimeframe] = useState('1H');
  const { data } = useQuery({
    queryKey: ['session', params.id],
    queryFn: async () => normalizeSession((await api.get(`/training/${params.id}`)).data),
  });
  const step = TIMEFRAME_TO_STEP[viewTimeframe] ?? 1;
  const sourceBars = data?.barsData ?? [];
  const sourceActions = data?.actions ?? [];
  const visibleBars = useMemo(() => aggregateBars(sourceBars, step), [sourceBars, step]);
  const chartActions = useMemo(
    () =>
      sourceActions.map((a) => {
        const groupIndex = typeof a.timePointer === 'number' ? Math.floor(a.timePointer / step) : -1;
        const groupedBar = groupIndex >= 0 ? visibleBars[Math.min(groupIndex, visibleBars.length - 1)] : undefined;
        const parsed = groupedBar ? Date.parse(groupedBar.time) : NaN;
        return {
          id: a.id,
          actionType: a.actionType,
          timePointer: a.timePointer,
          price: a.price,
          timestamp: Number.isFinite(parsed) ? parsed : undefined,
        };
      }),
    [sourceActions, step, visibleBars],
  );

  if (!data) return <div className="p-5"><LoadingState message="复盘数据加载中..." /></div>;

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <PageHeader>
        <div>
          <PageTitle className="text-lg">训练复盘</PageTitle>
          <PageDescription>回看训练过程中的K线演变与交易决策。</PageDescription>
        </div>
      </PageHeader>
      <Card className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm text-slate-200">
        <span>
          市场: <span className="font-semibold text-slate-100">{formatMarketLabel(data.market)}</span>
        </span>
        <span>
          推进周期: <span className="font-semibold text-slate-100">{data.drivingTimeframe}</span>
        </span>
        <span>
          训练K线数量: <span className="font-semibold text-slate-100">{data.totalBars}</span>
        </span>
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="p-2 xl:col-span-3">
          <ReplayChart data={visibleBars} actions={chartActions} timeframe={viewTimeframe} onTimeframeChange={setViewTimeframe} />
        </Card>
        <div className="space-y-3">
          <ReplayStatsPanel session={data} />
          <TradeHistoryList session={data} />
          <Card className="space-y-2 p-3">
            <Button variant="primary" onClick={() => router.push('/')} className="w-full">
              返回训练页
            </Button>
            <Button variant="ghost" onClick={() => router.push('/')} className="w-full">
              再来一局
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
