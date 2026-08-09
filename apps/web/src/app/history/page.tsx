'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { Toast } from '@/components/ui/Toast';

type HistoryItem = {
  id: string;
  assignmentSource?: 'trial' | 'courseAssignment' | 'freePractice';
  assignmentId?: string | null;
  assignmentTitleSnapshot?: string | null;
  assignmentVersion?: number | null;
  lessonId?: string | null;
  lessonTitleSnapshot?: string | null;
  trainingMode?: string | null;
  symbol: string;
  symbolDisplayName?: string | null;
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

type StatusFilter = 'CLOSED' | 'ALL' | 'ACTIVE';
type AssignmentFilter = 'ALL' | 'trial' | 'courseAssignment';
type HistoryResponse = {
  items: HistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

const STATUS_FILTER_VALUES = new Set<StatusFilter>(['CLOSED', 'ALL', 'ACTIVE']);
const ASSIGNMENT_FILTER_VALUES = new Set<AssignmentFilter>(['ALL', 'trial', 'courseAssignment']);

function parseStatusFilter(value: string | null): StatusFilter {
  return STATUS_FILTER_VALUES.has(value as StatusFilter) ? (value as StatusFilter) : 'CLOSED';
}

function parseAssignmentFilter(value: string | null): AssignmentFilter {
  return ASSIGNMENT_FILTER_VALUES.has(value as AssignmentFilter) ? (value as AssignmentFilter) : 'ALL';
}

function parsePageNumber(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(max, parsed) : parsed;
}

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

function assignmentSourceLabel(source?: HistoryItem['assignmentSource']) {
  if (source === 'trial') return '试用训练';
  if (source === 'courseAssignment') return '课程作业';
  return '自由练习';
}

function trainingContextTitle(item: HistoryItem) {
  if (item.assignmentSource === 'freePractice' || !item.assignmentSource) return '';
  if (item.assignmentSource === 'courseAssignment') {
    return item.lessonTitleSnapshot?.trim() || item.assignmentTitleSnapshot?.trim() || item.lessonId?.trim() || item.assignmentId?.trim() || '';
  }
  return item.assignmentTitleSnapshot?.trim() || item.lessonTitleSnapshot?.trim() || item.assignmentId?.trim() || item.lessonId?.trim() || '';
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="13" height="13" x="9" y="9" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) throw new Error('copy failed');
}

function ActionTag({ actionType }: { actionType: string }) {
  const map: Record<string, string> = {
    OPEN_LONG: '开多',
    ADD_LONG: '加多',
    OPEN_SHORT: '开空',
    ADD_SHORT: '加空',
    CLOSE: '平仓',
    PARTIAL_CLOSE: '部分平仓',
    FULL_CLOSE: '全部平仓',
    TP: '止盈',
    SL: '止损',
    HOLD: '观望',
    LIQUIDATED: '爆仓',
  };
  const text = map[actionType] ?? actionType;
  const cls =
    actionType === 'OPEN_LONG' || actionType === 'ADD_LONG'
      ? 'bg-emerald-500/20 text-emerald-300'
      : actionType === 'OPEN_SHORT' || actionType === 'ADD_SHORT'
        ? 'bg-amber-500/20 text-amber-300'
        : actionType === 'CLOSE' || actionType === 'PARTIAL_CLOSE' || actionType === 'FULL_CLOSE' || actionType === 'TP'
          ? 'bg-sky-500/20 text-sky-300'
          : actionType === 'SL' || actionType === 'LIQUIDATED'
            ? 'bg-rose-500/20 text-rose-300'
            : 'bg-slate-600/30 text-slate-300';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{text}</span>;
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_38%),#020617] p-4 text-slate-100"><LoadingState message="正在加载历史记录..." /></main>}>
      <HistoryPageInner />
    </Suspense>
  );
}

function HistoryPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const adminUserId = searchParams.get('adminUserId')?.trim() ?? '';
  const from = searchParams.get('from')?.trim() ?? '';
  const targetLabel = searchParams.get('label')?.trim() ?? '';
  const isAdminView = Boolean(adminUserId);
  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const assignmentFilter = parseAssignmentFilter(searchParams.get('assignmentSource'));
  const searchText = searchParams.get('q') ?? '';
  const page = parsePageNumber(searchParams.get('page'), 1);
  const pageSize = parsePageNumber(searchParams.get('pageSize'), 10, 50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    tone: 'info',
  });
  const searchTerm = searchText.trim();

  const updateHistoryParams = (updates: {
    page?: number;
    pageSize?: number;
    statusFilter?: StatusFilter;
    assignmentFilter?: AssignmentFilter;
    q?: string;
  }) => {
    const next = new URLSearchParams(searchParams.toString());
    if (updates.page !== undefined) {
      if (updates.page <= 1) next.delete('page');
      else next.set('page', String(updates.page));
    }
    if (updates.pageSize !== undefined) {
      if (updates.pageSize === 10) next.delete('pageSize');
      else next.set('pageSize', String(updates.pageSize));
    }
    if (updates.statusFilter !== undefined) {
      if (updates.statusFilter === 'CLOSED') next.delete('status');
      else next.set('status', updates.statusFilter);
    }
    if (updates.assignmentFilter !== undefined) {
      if (updates.assignmentFilter === 'ALL') next.delete('assignmentSource');
      else next.set('assignmentSource', updates.assignmentFilter);
    }
    if (updates.q !== undefined) {
      const q = updates.q.trim();
      if (q) next.set('q', q);
      else next.delete('q');
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const reviewQueryString = useMemo(() => searchParams.toString(), [searchParams]);

  const historyQuery = useQuery({
    queryKey: ['training-history', isAdminView ? adminUserId : 'self', page, pageSize, statusFilter, assignmentFilter, searchTerm],
    queryFn: async () =>
      (
        await api.get<HistoryResponse>(isAdminView ? `/admin/users/${adminUserId}/history` : '/training/history', {
          params: {
            page,
            pageSize,
            status: statusFilter === 'CLOSED' || statusFilter === 'ALL' ? undefined : statusFilter,
            assignmentSource: assignmentFilter === 'ALL' ? undefined : assignmentFilter,
            q: searchTerm || undefined,
          },
        })
      ).data,
  });

  const detailQuery = useQuery({
    queryKey: ['training-history-detail', isAdminView ? adminUserId : 'self', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () =>
      normalizeSession((await api.get<Session>(isAdminView ? `/admin/users/${adminUserId}/training/${selectedId}` : `/training/${selectedId}`)).data),
  });
  const reviewDetailQuery = useQuery({
    queryKey: ['training-history-review-detail', isAdminView ? adminUserId : 'self', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () =>
      (
        await api.get<{ review: { content: string; problemTags?: string[] } | null }>(
          isAdminView ? `/admin/users/${adminUserId}/training/${selectedId}/review` : `/training/${selectedId}/review`,
        )
      ).data,
  });

  const items = useMemo(() => {
    const raw = historyQuery.data?.items ?? [];
    const filtered = raw.filter((item) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'ACTIVE') return item.status === 'ACTIVE';
      return item.status !== 'ACTIVE';
    });
    return filtered;
  }, [historyQuery.data?.items, statusFilter]);

  const setStatusFilter = (next: StatusFilter) => updateHistoryParams({ statusFilter: next, page: 1 });
  const setAssignmentFilter = (next: AssignmentFilter) => updateHistoryParams({ assignmentFilter: next, page: 1 });
  const setSearchText = (next: string) => updateHistoryParams({ q: next, page: 1 });
  const setPage = (next: number) => updateHistoryParams({ page: next });
  const setPageSize = (next: number) => updateHistoryParams({ pageSize: next, page: 1 });

  const copySessionId = async (id: string) => {
    try {
      await copyText(id);
      setToast({ open: true, message: '训练ID已复制', tone: 'success' });
    } catch {
      setToast({ open: true, message: '复制失败，请手动复制', tone: 'error' });
    }
  };

  const session = detailQuery.data;
  const initialBalance = session?.initialBalance ?? 0;
  const finalBalance = session?.finalBalance ?? initialBalance;
  const totalPnl = finalBalance - initialBalance;
  const totalPnlPct = initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0;

  return (
    <main className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_38%),#020617] text-slate-100 xl:h-screen xl:overflow-hidden">
      <header className="app-nav shrink-0">
        <div className="app-nav-row">
          <div className="app-nav-heading">
            <PageTitle className="!text-lg sm:!text-xl">{isAdminView ? `用户历史训练记录（${targetLabel || '未命名用户'}）` : '历史训练记录'}</PageTitle>
            <PageDescription className="app-nav-description">{isAdminView ? `查看 ${targetLabel || '该用户'} 的历史成绩与复盘细节` : '查看历史成绩并复盘操作细节'}</PageDescription>
          </div>
          <Link className="shrink-0" href={isAdminView && from === 'admin-users' ? '/admin/users' : '/'}>
            <Button variant="ghost" size="sm">{isAdminView && from === 'admin-users' ? '返回用户列表' : '返回训练'}</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-0 w-full grid-cols-1 gap-4 p-3 sm:p-4 xl:h-[calc(100vh-96px)] xl:grid-cols-[minmax(0,1fr)_minmax(420px,34vw)] 2xl:grid-cols-[minmax(0,1fr)_minmax(460px,32vw)]">
        <Card className="min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-slate-700/70 px-3 py-3 sm:px-5">
              <div className="mb-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <label className="ml-1 text-xs text-slate-400 sm:ml-0" htmlFor="history-search">搜索:</label>
                <input
                  id="history-search"
                  className="h-9 w-full min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/15"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                  }}
                  placeholder="训练ID、作业、课程、标的"
                />
                {searchText ? (
                  <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={() => { setSearchText(''); }}>
                    清空
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2 xl:grid-cols-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-xs text-slate-400 sm:w-auto">状态:</span>
                  <Button size="sm" variant={statusFilter === 'CLOSED' ? 'primary' : 'ghost'} onClick={() => { setStatusFilter('CLOSED'); }}>已结束</Button>
                  <Button size="sm" variant={statusFilter === 'ACTIVE' ? 'primary' : 'ghost'} onClick={() => { setStatusFilter('ACTIVE'); }}>进行中</Button>
                  <Button size="sm" variant={statusFilter === 'ALL' ? 'primary' : 'ghost'} onClick={() => { setStatusFilter('ALL'); }}>全部</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-xs text-slate-400 sm:w-auto">来源:</span>
                  <Button size="sm" variant={assignmentFilter === 'ALL' ? 'primary' : 'ghost'} onClick={() => { setAssignmentFilter('ALL'); }}>全部</Button>
                  <Button size="sm" variant={assignmentFilter === 'trial' ? 'primary' : 'ghost'} onClick={() => { setAssignmentFilter('trial'); }}>试用训练</Button>
                  <Button size="sm" variant={assignmentFilter === 'courseAssignment' ? 'primary' : 'ghost'} onClick={() => { setAssignmentFilter('courseAssignment'); }}>课程作业</Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-4">
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
                  const contextTitle = trainingContextTitle(item);
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedId(item.id);
                        }
                      }}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition sm:px-4 ${
                        active
                          ? 'border-cyan-300 bg-cyan-500/15'
                          : item.isLiquidated
                            ? 'border-rose-500/60 bg-[linear-gradient(115deg,rgba(30,41,59,0.72),rgba(190,24,93,0.18),rgba(30,41,59,0.72))] hover:border-rose-400/80'
                            : 'border-slate-700/90 bg-[linear-gradient(115deg,rgba(30,41,59,0.72),rgba(37,99,235,0.13),rgba(30,41,59,0.72))] hover:border-slate-500'
                      }`}
                    >
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-2">
                            <span className="min-w-0 max-w-full truncate text-base font-semibold text-slate-100">
                              {item.symbolDisplayName?.trim() || formatSymbolLabel(item.symbol)}
                            </span>
                            {item.symbolDisplayName?.trim() ? <span className="text-xs text-slate-400">{item.symbol}</span> : null}
                            <Badge>{formatMarketLabel(item.market)}</Badge>
                            <Badge tone={item.assignmentSource === 'trial' ? 'success' : item.assignmentSource === 'courseAssignment' ? 'info' : 'default'}>
                              {assignmentSourceLabel(item.assignmentSource)}
                            </Badge>
                            <Badge tone="info">{item.totalBars}根</Badge>
                            <Badge tone={item.hasReview ? 'success' : 'default'}>{item.hasReview ? '已复盘' : '未复盘'}</Badge>
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-slate-600/80 bg-slate-950/40 px-2 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-400/60 hover:bg-cyan-500/15 hover:text-cyan-100"
                            title="复制完整训练ID"
                            aria-label="复制完整训练ID"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copySessionId(item.id);
                            }}
                          >
                            <CopyIcon />
                            复制ID
                          </button>
                        </div>
                        <span className="shrink-0 text-xs text-slate-400 sm:pt-1">{formatTime(item.endedAt ?? item.createdAt)}</span>
                      </div>
                      {contextTitle ? (
                        <div className="mb-2 truncate text-xs text-slate-300">
                          {contextTitle}
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-3 text-sm xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                        <div>
                          <div className="text-xs text-slate-400">盈亏比例</div>
                          <div className={`mt-1 text-sm font-semibold ${percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {percent >= 0 ? '+' : ''}
                            {percent.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">总盈亏</div>
                          <div className={`mt-1 text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pnl >= 0 ? '+' : ''}
                            {pnl.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">推进周期</div>
                          <div className="mt-1 truncate text-sm font-semibold text-slate-100">{item.drivingTimeframe}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">最终资金</div>
                          <div className="mt-1 text-sm font-semibold text-slate-100">{(item.finalBalance ?? item.initialBalance).toFixed(2)}</div>
                        </div>
                        <div className="col-span-2 flex items-end justify-start xl:col-span-1 xl:justify-end">
                          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
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
                              href={reviewQueryString ? `/history/${item.id}/review?${reviewQueryString}` : `/history/${item.id}/review`}
                              className="inline-flex items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                              onClick={(e) => e.stopPropagation()}
                            >
                              查看复盘
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 shrink-0 border-t border-slate-700/70 bg-slate-950/95 px-3 py-3 backdrop-blur sm:px-4">
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                <div className="text-xs text-slate-400">
                  第 {historyQuery.data?.pagination.page ?? page} / {historyQuery.data?.pagination.totalPages ?? 1} 页
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex">
                  <select
                    className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                    }}
                  >
                    <option value={10}>10 / 页</option>
                    <option value={20}>20 / 页</option>
                    <option value={50}>50 / 页</option>
                  </select>
                  <Button size="sm" variant="ghost" className="px-2" disabled={!historyQuery.data?.pagination.hasPrev} onClick={() => setPage(Math.max(1, page - 1))}>
                    上一页
                  </Button>
                  <Button size="sm" variant="ghost" className="px-2" disabled={!historyQuery.data?.pagination.hasNext} onClick={() => setPage(page + 1)}>
                    下一页
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="min-h-0 scroll-mt-3 overflow-hidden p-3 sm:p-5">
          {!selectedId ? <EmptyState title="请选择一条记录" description="从左侧选择训练记录后，这里会显示详情与操作轨迹。" className="min-h-[200px]" /> : null}
          {detailQuery.isLoading ? <LoadingState message="正在加载详情..." className="min-h-[200px]" /> : null}
          {detailQuery.isError ? <ErrorState message="加载详情失败，请重试。" className="min-h-[200px]" /> : null}
          {detailQuery.data ? (
            <div className="h-full min-h-0 space-y-4 overflow-y-auto pr-1">
              <section className="rounded-xl border border-slate-700/70 bg-slate-900/45 p-3 sm:p-4">
                <h4 className="text-base font-semibold text-slate-100">买卖行为统计</h4>
                <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1 xl:max-h-[34vh]">
                  {session?.actions.length === 0 ? (
                    <EmptyState title="暂无操作记录" className="min-h-[96px]" />
                  ) : (
                    (session?.actions ?? []).slice().reverse().map((action) => (
                      <div key={action.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
                        <div className="flex items-center gap-2"><ActionTag actionType={action.actionType} /><span className="text-xs text-slate-400">{formatTime(action.createdAt)}</span></div>
                        <div className="text-xs font-semibold text-slate-100">¥{action.price.toFixed(2)}</div>
                      </div>
                    ))
                  )}
                </div>
              </section>
              <section className="rounded-xl border border-slate-700/70 bg-slate-900/45 p-4">
                <h4 className="text-base font-semibold text-slate-100">复盘总结</h4>
                <div className="mt-2 rounded-xl border border-slate-700 bg-slate-950/55 p-3 text-xs text-slate-300">
                  {reviewDetailQuery.isLoading
                    ? '正在加载复盘总结...'
                    : reviewDetailQuery.data?.review?.content?.trim() || '暂无结构化总结内容，请前往“查看复盘”页面补充你的复盘结论。'}
                </div>
              </section>
            </div>
          ) : null}
        </Card>
      </section>
      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </main>
  );
}
