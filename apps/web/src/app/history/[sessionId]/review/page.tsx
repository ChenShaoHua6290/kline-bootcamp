'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { normalizeSession } from '@/lib/session';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Toast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageHeader';
import { ReplayChart } from '@/components/ReplayChart';
import { ReviewSummary } from '@/components/review/ReviewSummary';
import { ReviewTradeList } from '@/components/review/ReviewTradeList';
import { ReviewStatsPanel } from '@/components/review/ReviewStatsPanel';
import { ReviewEditor } from '@/components/review/ReviewEditor';
import { Tabs, TabButton } from '@/components/ui/Tabs';

const TIMEFRAME_TO_STEP: Record<string, number> = {
  '15m': 1,
  '30m': 2,
  '1H': 4,
  '2H': 8,
  '4H': 16,
  D: 96,
  W: 96 * 7,
};

const TIMEFRAME_TO_MS: Record<string, number> = {
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1H': 60 * 60_000,
  '2H': 2 * 60 * 60_000,
  '4H': 4 * 60 * 60_000,
};

function getBucketStart(ts: number, timeframe: string): number {
  const ms = TIMEFRAME_TO_MS[timeframe];
  if (ms) return Math.floor(ts / ms) * ms;

  const d = new Date(ts);
  if (timeframe === 'D') {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
  }
  if (timeframe === 'W') {
    const day = d.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + mondayOffset, 0, 0, 0, 0);
  }
  return ts;
}

function aggregateBars(
  bars: Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null }>,
  timeframe: string,
) {
  if (timeframe === '15m') return bars;
  const sorted = bars
    .map((b) => ({ ...b, ts: Date.parse(b.time) }))
    .filter((b) => Number.isFinite(b.ts))
    .sort((a, b) => a.ts - b.ts);
  const groups = new Map<number, typeof sorted>();
  for (const row of sorted) {
    const key = getBucketStart(row.ts, timeframe);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const out: Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null }> = [];
  const keys = Array.from(groups.keys()).sort((a, b) => a - b);
  for (const k of keys) {
    const list = (groups.get(k) ?? []).sort((a, b) => a.ts - b.ts);
    if (list.length === 0) continue;
    out.push({
      open: list[0].open,
      high: Math.max(...list.map((x) => x.high)),
      low: Math.min(...list.map((x) => x.low)),
      close: list[list.length - 1].close,
      time: new Date(k).toISOString(),
      volume: list.reduce((sum, x) => sum + Number(x.volume ?? 0), 0),
    });
  }
  return out;
}

export default function HistoryReviewPage() {
  const params = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    tone: 'info',
  });
  const [viewTimeframe, setViewTimeframe] = useState('1H');
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'stats' | 'summary'>('overview');
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);
  const [focusedTimestamp, setFocusedTimestamp] = useState<number | undefined>(undefined);

  const reviewQuery = useQuery({
    queryKey: ['training-review-detail', params.sessionId],
    queryFn: async () => {
      const data = (await api.get(`/training/${params.sessionId}/review`)).data;
      return { ...data, session: normalizeSession(data.session) };
    },
  });

  const sessionForBars = reviewQuery.data?.session;
  const barsWindowQuery = useQuery({
    queryKey: ['training-review-bars', params.sessionId, viewTimeframe, sessionForBars?.contextStartTime, sessionForBars?.currentTimePointer],
    enabled: Boolean(sessionForBars),
    queryFn: async () => {
      if (!sessionForBars) return { bars: [] as Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null }> };
      const from = sessionForBars.contextStartTime ?? sessionForBars.barsData?.[0]?.time;
      const to = sessionForBars.currentTimePointer ?? sessionForBars.barsData?.[sessionForBars.pointer]?.time;
      if (!from || !to) return { bars: [] as Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null }> };
      return (
        await api.get(`/training/${params.sessionId}/bars`, {
          params: { timeframe: viewTimeframe, from, to },
        })
      ).data as { bars: Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null }> };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { content: string; problemTags: string[] }) =>
      (await api.post(`/training/${params.sessionId}/review`, payload)).data,
    onSuccess: () => {
      setToast({ open: true, message: '复盘已保存', tone: 'success' });
      void queryClient.invalidateQueries({ queryKey: ['training-history'] });
      void queryClient.invalidateQueries({ queryKey: ['training-review-detail', params.sessionId] });
    },
    onError: () => {
      setToast({ open: true, message: '保存失败，请重试', tone: 'error' });
    },
  });

  if (reviewQuery.isLoading) return <main className="p-5"><LoadingState message="正在加载复盘详情..." /></main>;
  if (reviewQuery.isError || !reviewQuery.data) return <main className="p-5"><ErrorState message="复盘详情加载失败，请重试。" /></main>;

  const { session, trades, stats, review } = reviewQuery.data;
  const step = TIMEFRAME_TO_STEP[viewTimeframe] ?? 1;
  const sourceBars = session?.barsData ?? [];
  const sourceActions = session?.actions ?? [];
  const fetchedBars = Array.isArray(barsWindowQuery.data?.bars) ? barsWindowQuery.data?.bars : [];
  const visibleBars = fetchedBars.length > 0 ? fetchedBars : aggregateBars(sourceBars, viewTimeframe);
  const chartActions = sourceActions.map((a: any) => {
    const rawBar =
      typeof a.timePointer === 'number' && a.timePointer >= 0 && a.timePointer < sourceBars.length
        ? sourceBars[a.timePointer]
        : undefined;
    const rawTs = rawBar ? Date.parse(rawBar.time) : NaN;
    let nearestTs = NaN;
    if (Number.isFinite(rawTs) && visibleBars.length > 0) {
      nearestTs = Date.parse(visibleBars[0].time);
      for (let i = 1; i < visibleBars.length; i += 1) {
        const ts = Date.parse(visibleBars[i].time);
        if (Math.abs(ts - rawTs) <= Math.abs(nearestTs - rawTs)) nearestTs = ts;
      }
    }
    return {
      id: a.id,
      actionType: a.actionType,
      timePointer: a.timePointer,
      price: a.price,
      timestamp: Number.isFinite(nearestTs) ? nearestTs : undefined,
      positionPercent: a.positionPercent ?? null,
      pnl: a.pnl ?? null,
      closeReason: a.reason ?? null,
      displayTime: a.createdAt ? new Date(a.createdAt).toLocaleString('zh-CN', { hour12: false }) : '--',
    };
  });
  const tradeActionMap = new Map<string, { openId?: string; closeId?: string; openTs?: number; closeTs?: number }>();
  sourceActions.forEach((a: any, index: number) => {
    if (a.actionType === 'OPEN_LONG' || a.actionType === 'OPEN_SHORT') {
      const trade = trades.find((t: any) => t.openPointer === a.timePointer && t.direction === (a.actionType === 'OPEN_LONG' ? 'LONG' : 'SHORT') && !tradeActionMap.has(t.id));
      if (trade) tradeActionMap.set(trade.id, { openId: a.id, openTs: chartActions[index]?.timestamp });
    }
    if (a.actionType === 'CLOSE' || a.actionType === 'TP' || a.actionType === 'SL' || a.actionType === 'LIQUIDATED') {
      const trade = trades.find((t: any) => t.closePointer === a.timePointer && !tradeActionMap.get(t.id)?.closeId);
      if (trade) tradeActionMap.set(trade.id, { ...(tradeActionMap.get(trade.id) ?? {}), closeId: a.id, closeTs: chartActions[index]?.timestamp });
    }
  });
  const highlightedActionId = activeTradeId ? tradeActionMap.get(activeTradeId)?.closeId ?? tradeActionMap.get(activeTradeId)?.openId : null;

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_38%),#020617] p-3 text-slate-100 sm:p-3">
      <div className="mx-auto flex h-full max-w-[1400px] min-h-0 flex-col gap-3">
        <div className="flex h-8 shrink-0 items-center justify-between">
          <PageTitle className="text-sm sm:text-base">训练复盘详情</PageTitle>
          <Link href="/history">
            <Button variant="default" size="sm">返回历史记录</Button>
          </Link>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
          <Card className="h-full min-h-0 p-2">
            <ReplayChart
              data={visibleBars}
              actions={chartActions}
              timeframe={viewTimeframe}
              onTimeframeChange={setViewTimeframe}
              fitContainerHeight
              highlightedActionId={highlightedActionId}
              focusedTimestamp={focusedTimestamp}
            />
          </Card>
          <div className="min-h-0 overflow-y-auto space-y-3 pr-1">
            <Card className="space-y-3 border-slate-700/80 bg-slate-900/62 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] tracking-[0.08em] text-slate-400">复盘面板</div>
                <div className="text-[11px] text-slate-500">按模块查看与记录</div>
              </div>
              <Tabs>
                <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>训练摘要</TabButton>
                <TabButton active={activeTab === 'trades'} onClick={() => setActiveTab('trades')}>交易记录</TabButton>
                <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>行为统计</TabButton>
                <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>复盘总结</TabButton>
              </Tabs>
              {activeTab === 'overview' ? <ReviewSummary session={session} /> : null}
              {activeTab === 'trades' ? (
                <ReviewTradeList
                  trades={trades}
                  activeTradeId={activeTradeId}
                  onTradeClick={(trade) => {
                    setActiveTradeId(trade.id);
                    const targetTs = tradeActionMap.get(trade.id)?.closeTs ?? tradeActionMap.get(trade.id)?.openTs;
                    setFocusedTimestamp(targetTs);
                  }}
                />
              ) : null}
              {activeTab === 'stats' ? <ReviewStatsPanel stats={stats} /> : null}
              {activeTab === 'summary' ? (
                <ReviewEditor
                  initial={review ? { content: review.content, problemTags: review.problemTags ?? [] } : null}
                  loading={saveMutation.isPending}
                  onSave={(payload) => saveMutation.mutate(payload)}
                />
              ) : null}
            </Card>
          </div>
        </div>
      </div>
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </main>
  );
}
