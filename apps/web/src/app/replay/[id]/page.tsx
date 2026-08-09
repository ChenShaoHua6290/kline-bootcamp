'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [viewTimeframe, setViewTimeframe] = useState('15m');
  const { data } = useQuery({
    queryKey: ['session', params.id],
    queryFn: async () => normalizeSession((await api.get(`/training/${params.id}`)).data),
  });
  useEffect(() => {
    if (!data?.drivingTimeframe) return;
    if (!(data.drivingTimeframe in TIMEFRAME_TO_STEP)) return;
    setViewTimeframe(data.drivingTimeframe);
  }, [data?.drivingTimeframe]);
  const step = TIMEFRAME_TO_STEP[viewTimeframe] ?? 1;
  const sourceBars = data?.barsData ?? [];
  const sourceActions = data?.actions ?? [];
  const visibleBars = useMemo(() => aggregateBars(sourceBars, step), [sourceBars, step]);
  const chartActions = useMemo(
    () =>
      sourceActions.map((a) => {
        const rawBar =
          typeof a.timePointer === 'number' && a.timePointer >= 0 && a.timePointer < sourceBars.length
            ? sourceBars[a.timePointer]
            : undefined;
        const rawTs = rawBar ? Date.parse(rawBar.time) : NaN;
        const groupIndex = typeof a.timePointer === 'number' ? Math.floor(a.timePointer / step) : -1;
        const groupedBar = groupIndex >= 0 ? visibleBars[Math.min(groupIndex, visibleBars.length - 1)] : undefined;
        const parsed = groupedBar ? Date.parse(groupedBar.time) : NaN;
        return {
          id: a.id,
          actionType: a.actionType,
          timePointer: a.timePointer,
          price: a.price,
          timestamp: Number.isFinite(rawTs) ? rawTs : Number.isFinite(parsed) ? parsed : undefined,
        };
      }),
    [sourceActions, sourceBars, step, visibleBars],
  );

  if (!data) return <div className="p-5"><LoadingState message="复盘数据加载中..." /></div>;

  return (
    <div className="space-y-3 overflow-x-hidden p-3 sm:space-y-4 sm:p-5">
      <PageHeader>
        <div>
          <PageTitle className="text-lg">训练复盘</PageTitle>
          <PageDescription>回看训练过程中的K线演变与交易决策。</PageDescription>
        </div>
      </PageHeader>
      <Card className="grid grid-cols-2 gap-2 px-3 py-3 text-xs text-slate-300 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 sm:px-4 sm:text-sm">
        <span className="min-w-0">
          <span className="text-slate-500">标的: </span><span className="font-semibold text-slate-100">{data.symbolDisplayName?.trim() || data.symbol}</span>
          {data.symbolDisplayName?.trim() ? <span className="ml-1 text-xs text-slate-400">({data.symbol})</span> : null}
        </span>
        <span>
          <span className="text-slate-500">市场: </span><span className="font-semibold text-slate-100">{formatMarketLabel(data.market)}</span>
        </span>
        <span>
          <span className="text-slate-500">周期: </span><span className="font-semibold text-slate-100">{data.drivingTimeframe}</span>
        </span>
        <span>
          <span className="text-slate-500">K线: </span><span className="font-semibold text-slate-100">{data.totalBars}</span>
        </span>
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="h-[calc(100dvh-310px)] min-h-[380px] min-w-0 overflow-hidden p-0 sm:h-[calc(100dvh-330px)] sm:min-h-[430px] sm:p-0 xl:col-span-3 xl:h-[calc(100dvh-176px)]">
          <ReplayChart
            data={visibleBars}
            actions={chartActions}
            timeframe={viewTimeframe}
            onTimeframeChange={setViewTimeframe}
            fitContainerHeight
            showTradeLegend={false}
            showActionSummary={false}
            hideXAxisLabels
            hideHeaderTime
          />
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
