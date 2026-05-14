'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTrainingStore } from '@/stores/training.store';
import { TopNav } from '@/components/TopNav';
import { TrainingConfigModal } from '@/components/TrainingConfigModal';
import { KLineChart } from '@/components/KLineChart';
import { TrainingInfoPanel } from '@/components/TrainingInfoPanel';
import { AccountPanel } from '@/components/AccountPanel';
import { TradeStatsPanel } from '@/components/TradeStatsPanel';
import { TradePanel } from '@/components/TradePanel';
import { SessionEndModal } from '@/components/SessionEndModal';
import { NoticeModal } from '@/components/NoticeModal';
import { normalizeSession } from '@/lib/session';
import { clearAuthSession, getAuthUser, getToken, type AuthUser } from '@/lib/auth';
import type { Session } from '@/types/training';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

function translateErrorMessage(raw: string) {
  const text = raw.trim();
  const dict: Array<[string, string]> = [
    ['Long position take profit must be higher than entry price', '多单止盈价必须高于开仓价'],
    ['Long position stop loss must be lower than entry price', '多单止损价必须低于开仓价'],
    ['Short position take profit must be lower than entry price', '空单止盈价必须低于开仓价'],
    ['Short position stop loss must be higher than entry price', '空单止损价必须高于开仓价'],
    ['Position already exists', '当前已有持仓，请先平仓后再开仓'],
    ['No position', '当前没有持仓，无法执行平仓'],
    ['positionPercent required', '请先设置仓位比例'],
    ['positionPercent must be in (0, 1]', '仓位比例必须在 0 到 1 之间'],
    ['Session ended', '本轮训练已结束，请重新开始'],
    ['Session has ended', '本轮训练已结束，请重新开始'],
    ['Invalid position side', '持仓方向无效，请重试'],
    ['Invalid barsData', '行情数据异常，请重试'],
    ['Session not found', '未找到该训练记录'],
    ['takeProfitPrice must not be less than 0.000001', '止盈价必须大于 0'],
    ['stopLossPrice must not be less than 0.000001', '止损价必须大于 0'],
    ['Account liquidated, please reset balance first', '账户已爆仓，请先点击“重置金额”后再开始训练'],
    ['Insufficient available balance for add position', '可用资金不足，无法继续加仓'],
    ['Insufficient balance', '可用资金不足'],
    ['No real market bars available', '当前市场暂无可用真实K线，请先导入历史数据'],
    ['No bars found for symbol=', '所选周期暂无数据，请先执行聚合或切换周期'],
    ['Unsupported timeframe:', '不支持的周期，请重新选择'],
    ['Active training session already exists', '当前已有进行中的训练，请先继续或结束当前训练'],
  ];
  const hit = dict.find(([en]) => text.includes(en));
  if (hit) return hit[1];
  return text;
}

function normalizeErrorMessage(msg: string | string[] | undefined, fallback: string) {
  if (Array.isArray(msg)) return msg.map((m) => translateErrorMessage(m)).join('，');
  if (typeof msg === 'string' && msg.trim()) return translateErrorMessage(msg);
  return fallback;
}

type ProfileStats = {
  liquidationCount: number;
  totalResetCount: number;
  accountBalance: number;
  needResetAfterLiquidation: boolean;
};

export default function TrainPage() {
  const [showConfig, setShowConfig] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone?: 'error' | 'warning' | 'info' } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [leaveGuardOpen, setLeaveGuardOpen] = useState(false);
  const [startConflictOpen, setStartConflictOpen] = useState(false);
  const [startConflictSessionId, setStartConflictSessionId] = useState<string | null>(null);
  const [endSummarySession, setEndSummarySession] = useState<Session | null>(null);
  const [timeframeBars, setTimeframeBars] = useState<Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null; isPartial?: boolean }>>([]);
  const [barsFromTime, setBarsFromTime] = useState<string | null>(null);
  const [hasMoreOlderBars, setHasMoreOlderBars] = useState(false);
  const [loadingOlderBars, setLoadingOlderBars] = useState(false);
  const barsCacheRef = useRef<Record<string, Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null; isPartial?: boolean }>>>({});
  const barsRequestKeyRef = useRef<string | null>(null);
  const pendingLeaveActionRef = useRef<(() => void | Promise<void>) | null>(null);
  const { session, setSession, clearTrainingState, viewTimeframe, setViewTimeframe } = useTrainingStore();
  const router = useRouter();
  const continueCurrentTraining = async () => {
    if (startConflictSessionId) {
      const res = await api.get(`/training/${startConflictSessionId}`);
      setSession(normalizeSession(res.data));
    }
    setStartConflictOpen(false);
  };

  const profileStatsQuery = useQuery({
    queryKey: ['training-profile-stats'],
    enabled: ready && Boolean(user),
    queryFn: async () => (await api.get<ProfileStats>('/training/profile')).data,
  });

  useEffect(() => {
    const token = getToken();
    const currentUser = getAuthUser();
    if (token && currentUser) {
      setUser(currentUser);
    } else {
      if (token && !currentUser) clearAuthSession();
      setUser(null);
      clearTrainingState();
    }
    setReady(true);
  }, [setSession, clearTrainingState]);

  useEffect(() => {
    if (!ready || !user || session?.status === 'ACTIVE') return;
    api
      .get('/training/active')
      .then((res) => {
        if (res.data?.hasActive && res.data?.sessionId) {
          setStartConflictSessionId(res.data.sessionId as string);
          setStartConflictOpen(true);
        }
      })
      .catch(() => undefined);
  }, [ready, user, session?.status]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('start') === '1') setShowConfig(true);
  }, []);

  const startMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/training/start', payload)).data,
    onMutate: () => {
      setNotice(null);
      setShowConfig(false);
    },
    onSuccess: (data) => {
      const normalized = normalizeSession(data);
      setSession(normalized);
      profileStatsQuery.refetch();
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setNotice({
        title: '创建训练失败',
        message: normalizeErrorMessage(msg, '创建训练失败，请重试'),
        tone: 'error',
      });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post(`/training/${session?.id}/action`, payload)).data,
    onMutate: () => setNotice(null),
    onSuccess: (data) => {
      const normalized = normalizeSession(data);
      setSession(normalized);
      profileStatsQuery.refetch();
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setNotice({
        title: '操作失败',
        message: normalizeErrorMessage(msg, '操作失败，请重试'),
        tone: 'warning',
      });
    },
  });

  const endMutation = useMutation({
    mutationFn: async () => (await api.post(`/training/${session?.id}/finish`, { reason: 'terminated' })).data,
    onMutate: () => setNotice(null),
    onSuccess: (data) => {
      const normalized = normalizeSession(data);
      if (normalized) setEndSummarySession(normalized);
      clearClientTrainingState();
      profileStatsQuery.refetch();
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setNotice({
        title: '结束训练失败',
        message: normalizeErrorMessage(msg, '结束训练失败，请重试'),
        tone: 'warning',
      });
    },
  });

  const resetAccountMutation = useMutation({
    mutationFn: async () => (await api.post('/training/reset-account')).data,
    onMutate: () => setNotice(null),
    onSuccess: (data) => {
      if (data?.session) {
        setSession(normalizeSession(data.session));
        setEndSummarySession(null);
      }
      profileStatsQuery.refetch();
      setNotice({
        title: '重置成功',
        message: '账户金额已重置为初始值，可重新开始训练。',
        tone: 'info',
      });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setNotice({
        title: '重置失败',
        message: normalizeErrorMessage(msg, '重置金额失败，请重试'),
        tone: 'warning',
      });
    },
  });

  const startNewWithCurrentBalance = (baseSession?: Session | null) => {
    const source = baseSession ?? session;
    if (!source) return;
    setNotice(null);
    setEndSummarySession(null);
    startMutation.mutate({
      market: source.market,
      drivingTimeframe: source.drivingTimeframe,
      trainingBars: source.totalBars,
      totalBars: 500 + source.totalBars,
      initialVisibleBars: 500,
      initialBalance: source.finalBalance,
    });
  };

  const clearClientTrainingState = () => {
    clearTrainingState();
    setTimeframeBars([]);
    setBarsFromTime(null);
    setHasMoreOlderBars(false);
    barsCacheRef.current = {};
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('activeSessionId');
      window.sessionStorage.removeItem('activeSessionId');
    }
  };

  const requestLeave = (action: () => void | Promise<void>) => {
    if (session?.status === 'ACTIVE') {
      pendingLeaveActionRef.current = action;
      setLeaveGuardOpen(true);
      return;
    }
    void action();
  };

  const resetBalanceFromMenu = () => {
    setConfirmResetOpen(true);
  };

  const executeResetFromMenu = () => {
    setConfirmResetOpen(false);
    resetAccountMutation.mutate();
  };

  const handleTradeAction = (payload: {
    action?: 'BUY_LONG' | 'BUY_SHORT' | 'CLOSE' | 'HOLD';
    actionType?: 'OPEN_LONG' | 'OPEN_SHORT' | 'ADD_LONG' | 'ADD_SHORT' | 'PARTIAL_CLOSE' | 'FULL_CLOSE' | 'HOLD';
    positionPercent?: number;
    closePercent?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
  }) => {
    if (!session) return;
    const normalizePositive = (value?: number) =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
    const safePayload = {
      ...payload,
      stopLossPrice: normalizePositive(payload.stopLossPrice),
      takeProfitPrice: normalizePositive(payload.takeProfitPrice),
    };
    // 到达最后一根后，观望与“结束训练”行为保持一致。
    const trainPointer = typeof session.trainPointer === 'number' ? session.trainPointer : session.pointer;
    if ((safePayload.action === 'HOLD' || safePayload.actionType === 'HOLD') && trainPointer >= session.totalBars) {
      endMutation.mutate();
      return;
    }
    actionMutation.mutate(safePayload);
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (session?.status !== 'ACTIVE') return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session?.status]);

  useEffect(() => {
    const onPopState = () => {
      if (session?.status !== 'ACTIVE') return;
      setLeaveGuardOpen(true);
      history.pushState(null, '', location.href);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [session?.status]);

  useEffect(() => {
    if (!session) {
      setTimeframeBars([]);
      setBarsFromTime(null);
      setHasMoreOlderBars(false);
      barsCacheRef.current = {};
      barsRequestKeyRef.current = null;
      return;
    }
    const from = barsFromTime ?? session.contextStartTime ?? session.barsData?.[0]?.time;
    const to = session.currentTimePointer ?? session.barsData?.[session.pointer]?.time;
    if (!from || !to) return;
    const requestKey = `${session.id}|${viewTimeframe}|${from}|${to}`;
    barsRequestKeyRef.current = requestKey;
    const cacheKey = requestKey;
    const cached = barsCacheRef.current[cacheKey];
    if (cached) {
      if (barsRequestKeyRef.current === requestKey) {
        setTimeframeBars(cached);
        setLoadingOlderBars(false);
      }
      return;
    }
    api
      .get(`/training/${session.id}/bars`, { params: { timeframe: viewTimeframe, from, to } })
      .then((res) => {
        if (barsRequestKeyRef.current !== requestKey) return;
        const rows = Array.isArray(res.data?.bars) ? res.data.bars : [];
        barsCacheRef.current[cacheKey] = rows;
        setTimeframeBars(rows);
        setHasMoreOlderBars(Boolean(res.data?.hasMoreOlder));
        setLoadingOlderBars(false);
      })
      .catch(() => {
        if (barsRequestKeyRef.current !== requestKey) return;
        setTimeframeBars([]);
        setHasMoreOlderBars(false);
        setLoadingOlderBars(false);
      });
  }, [session, viewTimeframe, barsFromTime]);

  useEffect(() => {
    setBarsFromTime(null);
  }, [session?.id, viewTimeframe]);

  const loadOlderBars = () => {
    if (!session || loadingOlderBars) return;
    const currentFirst = timeframeBars[0]?.time;
    if (!currentFirst) return;
    const firstTs = Date.parse(currentFirst);
    if (!Number.isFinite(firstTs)) return;
    const TF_MS: Record<string, number> = {
      '15m': 15 * 60_000,
      '30m': 30 * 60_000,
      '1H': 60 * 60_000,
      '2H': 2 * 60 * 60_000,
      '4H': 4 * 60 * 60_000,
      D: 24 * 60 * 60_000,
      W: 7 * 24 * 60 * 60_000,
      M: 30 * 24 * 60 * 60_000,
    };
    const tfMs = TF_MS[viewTimeframe] ?? 60 * 60_000;
    const spanMs = Math.max(1, timeframeBars.length) * tfMs;
    const nextFrom = new Date(Math.max(0, firstTs - spanMs)).toISOString();
    setLoadingOlderBars(true);
    setBarsFromTime(nextFrom);
  };

  const chartActions = useMemo(() => {
    if (!session) return [];
    const targetBars = timeframeBars.length > 0 ? timeframeBars : session.barsData;
    return session.actions.map((a) => {
      const sourceBar = typeof a.timePointer === 'number' ? session.barsData[a.timePointer] : undefined;
      const actionTs = sourceBar ? Date.parse(sourceBar.time) : NaN;
      let parsed = NaN;
      if (Number.isFinite(actionTs) && targetBars.length > 0) {
        let nearest = Date.parse(targetBars[0].time);
        for (let i = 1; i < targetBars.length; i += 1) {
          const ts = Date.parse(targetBars[i].time);
          if (Math.abs(ts - actionTs) <= Math.abs(nearest - actionTs)) nearest = ts;
        }
        parsed = nearest;
      }
      return {
        id: a.id,
        actionType: a.actionType,
        timePointer: a.timePointer,
        price: a.price,
        timestamp: Number.isFinite(parsed) ? parsed : undefined,
      };
    });
  }, [session, timeframeBars]);

  const visibleBars = useMemo(() => {
    if (!session) return [];
    return timeframeBars.length > 0 ? timeframeBars : session.barsData;
  }, [session, timeframeBars]);
  const hasTrainingActions = useMemo(() => {
    if (!session) return false;
    return session.actions.length > 0;
  }, [session]);

  if (!ready) {
    return <main className="app-shell p-6"><LoadingState message="正在检查登录状态..." /></main>;
  }

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden overflow-y-auto xl:h-screen xl:overflow-hidden">
      <TopNav
        onStart={async () => {
          const active = (await api.get('/training/active')).data as { hasActive: boolean; sessionId: string | null };
          if (!active?.hasActive || !active.sessionId) {
            setShowConfig(true);
            return;
          }
          setStartConflictSessionId(active.sessionId);
          setStartConflictOpen(true);
        }}
        onAdmin={() => {
          requestLeave(() => router.push('/admin'));
        }}
        onHistory={() => {
          requestLeave(() => router.push('/history'));
        }}
        onLogout={() => {
          requestLeave(() => {
            clearClientTrainingState();
            clearAuthSession();
            router.push('/auth');
          });
        }}
        user={user}
        liquidationCount={profileStatsQuery.data?.liquidationCount ?? 0}
        totalResetCount={profileStatsQuery.data?.totalResetCount ?? 0}
        onRequestReset={resetBalanceFromMenu}
        resetBalanceBusy={resetAccountMutation.isPending}
      />
      {showConfig && (
        <TrainingConfigModal
          submitting={startMutation.isPending}
          onClose={() => setShowConfig(false)}
          onSubmit={(v) => {
            const trainingBars = Number(v?.trainingBars ?? 100);
            startMutation.mutate({
              market: v.market,
              drivingTimeframe: v.drivingTimeframe,
              trainingBars,
              totalBars: 500 + trainingBars,
              initialVisibleBars: 500,
            });
          }}
        />
      )}
      {endSummarySession ? (
        <SessionEndModal
          session={endSummarySession}
          onClose={() => setEndSummarySession(null)}
          onRestart={() => startNewWithCurrentBalance(endSummarySession)}
          restarting={startMutation.isPending}
          onBackHome={() => {
            setEndSummarySession(null);
            clearClientTrainingState();
            router.push('/');
          }}
        />
      ) : null}
      {notice ? <NoticeModal open title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice(null)} /> : null}
      {confirmResetOpen ? (
        <NoticeModal
          open
          title="确认重置金额"
          message="重置后当前训练资金将恢复为初始金额，并会计入重置次数。是否继续？"
          tone="warning"
          confirmText="确认重置"
          cancelText="取消"
          onClose={() => setConfirmResetOpen(false)}
          onConfirm={executeResetFromMenu}
          maskClosable={false}
        />
      ) : null}
      {confirmEndOpen ? (
        <NoticeModal
          open
          title="确认结束训练"
          message="结束后将结算本轮结果并停止继续下单，是否确认结束？"
          tone="warning"
          confirmText="确认结束"
          cancelText="继续训练"
          onClose={() => setConfirmEndOpen(false)}
          onConfirm={() => {
            setConfirmEndOpen(false);
            endMutation.mutate();
          }}
          maskClosable={false}
        />
      ) : null}
      {leaveGuardOpen ? (
        <NoticeModal
          open
          title="当前训练尚未结束"
          message="你当前有一场正在进行中的训练。离开前需要先结束本次训练，否则请继续训练。"
          tone="warning"
          confirmText="结束训练"
          cancelText="继续训练"
          onClose={() => setLeaveGuardOpen(false)}
          onConfirm={async () => {
            if (session?.id) {
              try {
                await api.post(`/training/${session.id}/finish`, { reason: 'terminated' });
              } finally {
                clearClientTrainingState();
              }
            }
            setLeaveGuardOpen(false);
            const next = pendingLeaveActionRef.current;
            pendingLeaveActionRef.current = null;
            if (next) await next();
          }}
          maskClosable={false}
        />
      ) : null}
      {startConflictOpen ? (
        <NoticeModal
          open
          title="当前已有进行中的训练"
          message="你当前已有一场正在进行中的训练，请先处理后再开始新的训练。"
          tone="warning"
          confirmText="结束当前训练并重新开始"
          cancelText="继续当前训练"
          onClose={() => {
            void continueCurrentTraining();
          }}
          onConfirm={async () => {
            if (startConflictSessionId) await api.post(`/training/${startConflictSessionId}/finish`, { reason: 'terminated' });
            clearClientTrainingState();
            setStartConflictOpen(false);
            setShowConfig(true);
          }}
          maskClosable={false}
        />
      ) : null}
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-2 px-2 pb-2 pt-1 sm:gap-3 sm:px-3 sm:pb-3 sm:pt-1.5 xl:grid-cols-[minmax(0,1fr)_290px] 2xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="z-0 flex min-h-[540px] overflow-hidden xl:min-h-0">
          {session ? (
            <div className="relative h-full w-full min-h-0">
              <KLineChart
                data={visibleBars}
                actions={chartActions}
                timeframe={viewTimeframe}
                onTimeframeChange={setViewTimeframe}
                fitContainerHeight
                showTradeLegend={false}
                showActionSummary={false}
                stopLossPrice={session.position?.stopLossPrice}
                takeProfitPrice={session.position?.takeProfitPrice}
                hasMoreOlder={hasMoreOlderBars}
                loadingOlder={loadingOlderBars}
                onReachLeftEdge={loadOlderBars}
              />
            </div>
          ) : (
            <div className="h-full min-h-0 w-full p-2">
              <EmptyState title="尚未开始训练" description="点击右上角“开始训练”配置参数后进入图表训练模式。" className="h-full min-h-[420px]" />
            </div>
          )}
        </div>
        <div className="relative z-20 min-h-0 pr-1 xl:overflow-hidden">
          {session ? (
            <div className="flex min-h-0 flex-col gap-2 xl:h-full">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="surface-panel p-2.5">
                <div className="space-y-1.5">
                  <TrainingInfoPanel session={session} viewTimeframe={viewTimeframe} />
                  <AccountPanel session={session} showCurrentPnl={hasTrainingActions} />
                  {hasTrainingActions ? <TradeStatsPanel session={session} /> : null}
                </div>
              </div>
              </div>
              <div className="shrink-0 xl:max-h-[58vh] xl:overflow-y-auto">
                <TradePanel
                  session={session}
                  busy={actionMutation.isPending || startMutation.isPending || endMutation.isPending}
                  onAction={handleTradeAction}
                  onEnd={() => setConfirmEndOpen(true)}
                />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-0 p-2">
              <EmptyState title="等待训练启动" description="训练开始后将显示账户信息、交易记录与下单面板。" className="h-full min-h-[320px]" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
