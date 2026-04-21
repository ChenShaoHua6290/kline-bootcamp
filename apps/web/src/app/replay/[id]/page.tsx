'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ReplayChart } from '@/components/ReplayChart';
import { TradeHistoryList } from '@/components/TradeHistoryList';
import { ReplayStatsPanel } from '@/components/ReplayStatsPanel';

export default function ReplayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useQuery({ queryKey: ['session', params.id], queryFn: async () => (await api.get(`/training/${params.id}`)).data });

  if (!data) return <div className="p-4">加载中...</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded bg-slate-800 p-3">市场: {data.market} | 推进周期: {data.drivingTimeframe} | 总K线: {data.totalBars}</div>
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 rounded border border-slate-700 p-2"><ReplayChart data={data.barsData} /></div>
        <div className="space-y-3"><ReplayStatsPanel session={data} /><TradeHistoryList session={data} /></div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => router.push('/')} className="rounded bg-blue-600 px-3 py-1">再来一局</button>
      </div>
    </div>
  );
}
