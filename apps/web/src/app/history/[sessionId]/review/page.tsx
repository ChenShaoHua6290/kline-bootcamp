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
import { PageDescription, PageTitle } from '@/components/ui/PageHeader';
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
  const visibleBars = aggregateBars(sourceBars, step);
  const chartActions = sourceActions.map((a: any) => {
    const groupIndex = typeof a.timePointer === 'number' ? Math.floor(a.timePointer / step) : -1;
    const groupedBar = groupIndex >= 0 ? visibleBars[Math.min(groupIndex, visibleBars.length - 1)] : undefined;
    const parsed = groupedBar ? Date.parse(groupedBar.time) : NaN;
    return {
      id: a.id,
      actionType: a.actionType,
      timePointer: a.timePointer,
      price: a.price,
      timestamp: Number.isFinite(parsed) ? parsed : undefined,
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_38%),#020617] p-4 text-slate-100 sm:p-5">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <PageTitle className="text-base sm:text-lg">训练复盘详情</PageTitle>
            <PageDescription>查看K线回放、交易记录并填写你的复盘总结。</PageDescription>
          </div>
          <Link href="/history">
            <Button variant="default">返回历史记录</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
          <Card className="p-2">
            <ReplayChart
              data={visibleBars}
              actions={chartActions}
              timeframe={viewTimeframe}
              onTimeframeChange={setViewTimeframe}
              showTradeLegend={false}
              showActionSummary={false}
              highlightedActionId={highlightedActionId}
              focusedTimestamp={focusedTimestamp}
            />
          </Card>
          <div className="space-y-3">
            <Card className="space-y-3 p-3">
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
