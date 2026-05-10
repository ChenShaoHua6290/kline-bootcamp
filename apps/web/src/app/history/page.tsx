'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { normalizeSession } from '@/lib/session';
import { formatMarketLabel, formatSymbolLabel } from '@/lib/market';
import type { Session } from '@/types/training';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageDescription, PageTitle } from '@/components/ui/PageHeader';

type HistoryItem = {
  id: string;
  symbol: string;
  market: string;
  totalBars: number;
  initialBalance: number;
  finalBalance?: number | null;
  isLiquidated: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'LIQUIDATED' | 'ENDED';
  createdAt: string;
  endedAt?: string | null;
  drivingTimeframe: string;
  hasReview?: boolean;
};

const LENGTH_FILTERS = [50, 100, 150, 200, 250, 300] as const;
type StatusFilter = 'CLOSED' | 'ALL' | 'ACTIVE' | 'LIQUIDATED' | 'COMPLETED' | 'TERMINATED';

function isCompletedLike(status: HistoryItem['status']) {
  return status === 'COMPLETED' || status === 'ENDED';
}

function formatTime(value?: string | null) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString('zh-CN', { hour12: false });
}

function pnlPercent(item: HistoryItem) {
  const finalBalance = item.finalBalance ?? item.initialBalance;
  if (!item.initialBalance) return 0;
  return ((finalBalance - item.initialBalance) / item.initialBalance) * 100;
}

function pnlAmount(item: HistoryItem) {
  const finalBalance = item.finalBalance ?? item.initialBalance;
  return finalBalance - item.initialBalance;
}

function ActionTag({ actionType }: { actionType: string }) {
  const map: Record<string, string> = {
    OPEN_LONG: '买涨',
    OPEN_SHORT: '买跌',
    CLOSE: '平仓',
    TP: '止盈',
    SL: '止损',
    HOLD: '观望',
    LIQUIDATED: '爆仓',
  };
  const text = map[actionType] ?? actionType;
  const cls =
    actionType === 'OPEN_LONG'
      ? 'bg-emerald-500/20 text-emerald-300'
      : actionType === 'OPEN_SHORT'
        ? 'bg-amber-500/20 text-amber-300'
        : actionType === 'CLOSE' || actionType === 'TP'
          ? 'bg-sky-500/20 text-sky-300'
          : actionType === 'SL' || actionType === 'LIQUIDATED'
            ? 'bg-rose-500/20 text-rose-300'
            : 'bg-slate-600/30 text-slate-300';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{text}</span>;
}

export default function HistoryPage() {
  const [lengthFilter, setLengthFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('CLOSED');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['training-history'],
    queryFn: async () => (await api.get<HistoryItem[]>('/training/history')).data,
  });

  const detailQuery = useQuery({
    queryKey: ['training-history-detail', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => normalizeSession((await api.get<Session>(`/training/${selectedId}`)).data),
  });

  const items = useMemo(() => {
    const raw = historyQuery.data ?? [];
    const filteredByLength = lengthFilter === 'ALL' ? raw : raw.filter((item) => item.totalBars === lengthFilter);
    const filtered = filteredByLength.filter((item) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'LIQUIDATED') return item.isLiquidated;
      if (statusFilter === 'ACTIVE') return item.status === 'ACTIVE';
      if (statusFilter === 'COMPLETED') return isCompletedLike(item.status) && !item.isLiquidated;
      if (statusFilter === 'TERMINATED') return item.status === 'TERMINATED';
      return item.status !== 'ACTIVE';
    });
    return filtered.slice().sort((a, b) => {
      const av = new Date(a.createdAt).getTime();
      const bv = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? bv - av : av - bv;
    });
  }, [historyQuery.data, lengthFilter, statusFilter, sortOrder]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_38%),#020617] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-700/80 bg-slate-900/80 backdrop-blur px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3">
          <div>
            <PageTitle className="text-base sm:text-lg">历史训练记录</PageTitle>
            <PageDescription className="text-[clamp(11px,1vw,13px)]">查看历史成绩并复盘操作细节</PageDescription>
          </div>
          <Link href="/">
            <Button variant="default" size="sm">返回训练</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,1fr)]">
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/70 px-4 py-3 sm:px-5">
            <span className="text-xs text-slate-400">训练长度:</span>
            {LENGTH_FILTERS.map((n) => (
              <Button
                key={n}
                size="sm"
                variant={lengthFilter === n ? 'primary' : 'default'}
                className={`${
                  lengthFilter === n
                    ? '!bg-cyan-500/25 !text-cyan-100'
                    : ''
                }`}
                onClick={() => setLengthFilter(n)}
              >
                {n}根
              </Button>
            ))}
            <Button
              size="sm"
              variant={lengthFilter === 'ALL' ? 'primary' : 'default'}
              className={`${
                lengthFilter === 'ALL'
                  ? '!bg-cyan-500/25 !text-cyan-100'
                  : ''
              }`}
              onClick={() => setLengthFilter('ALL')}
            >
              全部
            </Button>
            <span className="ml-2 text-xs text-slate-400">排序:</span>
            <Button size="sm" variant="default" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
              {sortOrder === 'desc' ? '按时间 ↓' : '按时间 ↑'}
            </Button>
            <span className="ml-2 text-xs text-slate-400">状态:</span>
            <Button size="sm" variant={statusFilter === 'CLOSED' ? 'primary' : 'default'} onClick={() => setStatusFilter('CLOSED')}>已结束</Button>
            <Button size="sm" variant={statusFilter === 'COMPLETED' ? 'primary' : 'default'} onClick={() => setStatusFilter('COMPLETED')}>已完成</Button>
            <Button size="sm" variant={statusFilter === 'TERMINATED' ? 'primary' : 'default'} onClick={() => setStatusFilter('TERMINATED')}>已终止</Button>
            <Button size="sm" variant={statusFilter === 'ACTIVE' ? 'primary' : 'default'} onClick={() => setStatusFilter('ACTIVE')}>进行中</Button>
            <Button size="sm" variant={statusFilter === 'LIQUIDATED' ? 'primary' : 'default'} onClick={() => setStatusFilter('LIQUIDATED')}>已爆仓</Button>
            <Button size="sm" variant={statusFilter === 'ALL' ? 'primary' : 'default'} onClick={() => setStatusFilter('ALL')}>全部</Button>
          </div>

          <div className="max-h-[72vh] overflow-y-auto p-3 sm:p-4">
            {historyQuery.isLoading ? <LoadingState message="正在加载历史记录..." className="min-h-[220px]" /> : null}
            {historyQuery.isError ? <ErrorState message="加载历史记录失败，请稍后重试。" className="min-h-[220px]" /> : null}
            {!historyQuery.isLoading && !historyQuery.isError && items.length === 0 ? (
              <EmptyState title="暂无历史训练记录" description="完成至少一场训练后会显示在这里。" className="min-h-[220px]" />
            ) : null}
            <div className="space-y-3">
              {items.map((item) => {
                const pnl = pnlAmount(item);
                const percent = pnlPercent(item);
                const active = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-cyan-300 bg-cyan-500/15'
                        : item.isLiquidated
                          ? 'border-rose-500/60 bg-[linear-gradient(115deg,rgba(30,41,59,0.72),rgba(190,24,93,0.18),rgba(30,41,59,0.72))] hover:border-rose-400/80'
                          : 'border-slate-700/90 bg-[linear-gradient(115deg,rgba(30,41,59,0.72),rgba(37,99,235,0.13),rgba(30,41,59,0.72))] hover:border-slate-500'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[clamp(1rem,1.2vw,1.2rem)] font-semibold text-slate-100">{formatSymbolLabel(item.symbol)}</span>
                        <Badge>{formatMarketLabel(item.market)}</Badge>
                        <Badge tone="info">{item.totalBars}根</Badge>
                        <Badge tone={item.hasReview ? 'success' : 'default'}>{item.hasReview ? '已复盘' : '未复盘'}</Badge>
                      </div>
                      <span className="text-xs text-slate-400">{formatTime(item.endedAt ?? item.createdAt)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-slate-400">盈亏比例</div>
                        <div className={`mt-1 font-semibold ${percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {percent >= 0 ? '+' : ''}
                          {percent.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">总盈亏</div>
                        <div className={`mt-1 font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnl >= 0 ? '+' : ''}
                          {pnl.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-end justify-end">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.isLiquidated
                                ? 'bg-rose-500/20 text-rose-200'
                                : item.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-200'
                                  : item.status === 'TERMINATED'
                                    ? 'bg-amber-500/20 text-amber-200'
                                  : 'bg-slate-700/60 text-slate-200'
                            }`}
                          >
                            {item.isLiquidated ? '已爆仓' : item.status === 'ACTIVE' ? '训练中' : item.status === 'TERMINATED' ? '已终止' : '已完成'}
                          </span>
                          <Link
                            href={`/history/${item.id}/review`}
                            className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                            onClick={(e) => e.stopPropagation()}
                          >
                            查看复盘
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div>推进周期：<span className="text-slate-200">{item.drivingTimeframe}</span></div>
                      <div className="text-right">
                        最终资金：<span className="text-slate-200">{(item.finalBalance ?? item.initialBalance).toFixed(2)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          {!selectedId ? <EmptyState title="请选择一条记录" description="从左侧选择训练记录后，这里会显示详情与操作轨迹。" className="min-h-[200px]" /> : null}
          {detailQuery.isLoading ? <LoadingState message="正在加载详情..." className="min-h-[200px]" /> : null}
          {detailQuery.isError ? <ErrorState message="加载详情失败，请重试。" className="min-h-[200px]" /> : null}
          {detailQuery.data ? (
            <div className="space-y-4">
              <section className="space-y-2">
                <h3 className="text-[clamp(1rem,1.2vw,1.2rem)] font-semibold text-cyan-300">基本信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
                    <span className="text-slate-400">标的</span>
                    <span className="font-semibold text-slate-100">{formatSymbolLabel(detailQuery.data.symbol)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
                    <span className="text-slate-400">市场</span>
                    <span className="font-semibold text-slate-100">{formatMarketLabel(detailQuery.data.market)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
                    <span className="text-slate-400">训练长度</span>
                    <span className="font-semibold text-slate-100">{detailQuery.data.totalBars}根</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
                    <span className="text-slate-400">状态</span>
                    <span className={`font-semibold ${detailQuery.data.isLiquidated ? 'text-rose-300' : detailQuery.data.status === 'ACTIVE' ? 'text-emerald-300' : 'text-slate-100'}`}>
                      {detailQuery.data.isLiquidated
                        ? '已爆仓'
                        : detailQuery.data.status === 'ACTIVE'
                          ? '训练中'
                          : detailQuery.data.status === 'TERMINATED'
                            ? '已终止'
                            : '已完成'}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[clamp(1rem,1.2vw,1.2rem)] font-semibold text-cyan-300">操作记录</h3>
                <div className="max-h-[36vh] space-y-2 overflow-y-auto pr-1">
                  {detailQuery.data.actions.length === 0 ? (
                    <EmptyState title="暂无操作记录" className="min-h-[96px]" />
                  ) : (
                    detailQuery.data.actions
                      .slice()
                      .reverse()
                      .map((action) => (
                        <div key={action.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <ActionTag actionType={action.actionType} />
                            <span className="text-xs text-slate-400">{formatTime(action.createdAt)}</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-100">¥{action.price.toFixed(2)}</div>
                        </div>
                      ))
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </Card>
      </section>
    </main>
  );
}
