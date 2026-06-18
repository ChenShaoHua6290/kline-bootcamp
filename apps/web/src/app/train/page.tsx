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
import type { LessonPlayback } from '@/lib/courses/types';

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
    ['ThrottlerException: Too Many Requests', '操作过于频繁，请稍后继续'],
    ['Too Many Requests', '操作过于频繁，请稍后继续'],
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
  access?: {
    accessType: 'TRIAL' | 'PAID' | 'INTERNAL';
    accessStatus: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
    accessExpiresAt: string | null;
    dailyTrainingLimit: number | null;
    todayTrainingCount: number;
    todayRemainingTrainingCount: number | null;
    isTrainingUnlimited: boolean;
    currentPlan: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  };
};

type PendingAssignment = {
  assignmentSource: 'trial' | 'courseAssignment';
  assignmentId: string;
  assignmentTitle: string;
  assignmentVersion: number;
  lessonId: string;
  lessonTitle: string;
  trainingMode: string;
  attemptNo?: number;
  isAssignmentContinuation?: boolean;
};

function parsePendingAssignment(params: URLSearchParams): PendingAssignment | null {
  const assignmentId = params.get('assignmentId')?.trim();
  const assignmentSource = params.get('assignmentSource')?.trim();
  if (!assignmentId || (assignmentSource !== 'trial' && assignmentSource !== 'courseAssignment')) return null;
  const version = Number(params.get('assignmentVersion') ?? 1);
  const attemptNo = Number(params.get('attemptNo') ?? 1);
  return {
    assignmentSource,
    assignmentId,
    assignmentTitle: params.get('assignmentTitle')?.trim() || assignmentId,
    assignmentVersion: Number.isInteger(version) && version > 0 ? version : 1,
    lessonId: params.get('lessonId')?.trim() || '',
    lessonTitle: params.get('lessonTitle')?.trim() || '',
    trainingMode: params.get('trainingMode')?.trim() || 'mixed',
    attemptNo: Number.isInteger(attemptNo) && attemptNo > 0 ? attemptNo : 1,
    isAssignmentContinuation: params.get('isAssignmentContinuation') === 'true',
  };
}

function pendingAssignmentFromLesson(lesson: LessonPlayback): PendingAssignment | null {
  const assignment = lesson.trainingAssignment;
  if (!assignment) return null;
  return {
    assignmentSource: assignment.assignmentSource,
    assignmentId: assignment.assignmentId,
    assignmentTitle: assignment.assignmentTitle,
    assignmentVersion: assignment.assignmentVersion,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    trainingMode: assignment.trainingMode,
    attemptNo: 1,
    isAssignmentContinuation: false,
  };
}

function MobileTrainingSnapshot({
  session,
  viewTimeframe,
  showCurrentPnl,
}: {
  session: Session;
  viewTimeframe: string;
  showCurrentPnl: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trainPointer = typeof session.trainPointer === 'number' ? session.trainPointer : session.pointer;
  const progress = Math.max(0, Math.min(100, (trainPointer / Math.max(1, session.totalBars)) * 100));
  const lastClose = session.barsData?.[session.pointer]?.close ?? 0;
  const startBalance = session.initialBalance || 10000;
  const positionAmount = session.position?.positionAmount ?? (session.position ? session.finalBalance * session.position.positionPercent : 0);
  const floatingPnl = session.position
    ? ((session.position.side === 'LONG' ? lastClose - session.position.entryPrice : session.position.entryPrice - lastClose) /
        session.position.entryPrice) *
      positionAmount
    : 0;
  const equityBalance = session.finalBalance + floatingPnl;
  const totalPnl = equityBalance - startBalance;
  const positionText = session.position ? (session.position.side === 'LONG' ? '多仓' : '空仓') : '空仓';
  const pnlClass = totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-300';

  return (
    <section className="overflow-hidden rounded-xl border border-slate-700/65 bg-slate-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] xl:hidden">
      <button
        type="button"
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="grid min-w-0 grid-cols-3 gap-2">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500">进度</div>
            <div className="truncate text-[12px] font-semibold text-cyan-100">
              {trainPointer}/{session.totalBars}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500">账户</div>
            <div className="truncate text-[12px] font-semibold text-slate-100">
              {equityBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500">{positionText}</div>
            <div className={`truncate text-[12px] font-semibold ${pnlClass}`}>
              {totalPnl >= 0 ? '+' : ''}
              {totalPnl.toFixed(2)}
            </div>
          </div>
        </div>
        <span className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-700/75 bg-slate-900/70 px-2 text-[11px] font-semibold text-slate-300">
          {open ? '收起' : '详情'}
        </span>
      </button>
      <div className="h-1 bg-slate-800/80">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${progress}%` }} />
      </div>
      {open ? (
        <div className="max-h-[46dvh] space-y-1.5 overflow-y-auto border-t border-slate-800/80 p-1.5">
          <TrainingInfoPanel session={session} viewTimeframe={viewTimeframe} />
          <AccountPanel session={session} showCurrentPnl={showCurrentPnl} />
          {showCurrentPnl ? <TradeStatsPanel session={session} /> : null}
        </div>
      ) : null}
    </section>
  );
}

export default function TrainPage() {
  const [showConfig, setShowConfig] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);
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
  const [timeframeBarsTf, setTimeframeBarsTf] = useState<string | null>(null);
  const [timeframeBarsMap, setTimeframeBarsMap] = useState<
    Record<string, Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null; isPartial?: boolean }>>
  >({});
  const [stableVisibleBars, setStableVisibleBars] = useState<
    Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null; isPartial?: boolean }>
  >([]);
  const [barsFromTime, setBarsFromTime] = useState<string | null>(null);
  const [hasMoreOlderBars, setHasMoreOlderBars] = useState(false);
  const [loadingOlderBars, setLoadingOlderBars] = useState(false);
  const barsRequestKeyRef = useRef<string | null>(null);
  const timeframeBarsMapRef = useRef<
    Record<string, Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null; isPartial?: boolean }>>
  >({});
  const actionInFlightRef = useRef(false);
  const latestPointerRef = useRef(0);
  const holdBatchActiveRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const pendingLeaveActionRef = useRef<(() => void | Promise<void>) | null>(null);
  const { session, setSession, clearTrainingState, viewTimeframe, setViewTimeframe } = useTrainingStore();
  const router = useRouter();

  const clearAssignmentLaunchContext = () => {
    setPendingAssignment(null);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', '/train?start=1');
  };

  const openFreePracticeConfig = () => {
    clearAssignmentLaunchContext();
    setShowConfig(true);
  };

  const continueCurrentTraining = async () => {
    if (startConflictSessionId) {
      const res = await api.get(`/training/${startConflictSessionId}`);
      setSession(normalizeSession(res.data));
    }
    setPendingAssignment(null);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', '/train');
    setStartConflictOpen(false);
  };

  const profileStatsQuery = useQuery({
    queryKey: ['training-profile-stats', user?.id],
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
    const assignment = parsePendingAssignment(params);
    if (assignment) {
      setPendingAssignment(assignment);
      if (params.get('start') === '1') setShowConfig(true);
      return;
    }
    const lessonId = params.get('lessonId')?.trim();
    if (lessonId) {
      api
        .get<LessonPlayback>(`/lessons/${lessonId}`)
        .then((res) => {
          const nextAssignment = pendingAssignmentFromLesson(res.data);
          if (!nextAssignment) {
            setNotice({
              title: '无法开始课程训练',
              message: '当前课时没有配置训练作业，请从普通训练入口开始。',
              tone: 'warning',
            });
            return;
          }
          setPendingAssignment(nextAssignment);
          if (params.get('start') === '1') setShowConfig(true);
        })
        .catch((error: unknown) => {
          const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
          setNotice({
            title: '课程训练加载失败',
            message: normalizeErrorMessage(msg, '课时训练配置加载失败，请返回课程中心重试'),
            tone: 'warning',
          });
        });
      return;
    }
    setPendingAssignment(null);
    if (params.get('start') === '1') setShowConfig(true);
  }, []);

  useEffect(() => {
    latestPointerRef.current = typeof session?.pointer === 'number' ? session.pointer : 0;
    sessionRef.current = session ?? null;
  }, [session]);

  const startMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/training/start', payload)).data,
    onMutate: () => {
      setNotice(null);
      setShowConfig(false);
    },
    onSuccess: (data) => {
      const normalized = normalizeSession(data);
      setSession(normalized);
      setPendingAssignment(null);
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '/train');
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
    onMutate: () => {
      actionInFlightRef.current = true;
      setNotice(null);
    },
    onSuccess: (data) => {
      const normalized = normalizeSession(data);
      if (typeof normalized?.pointer === 'number' && normalized.pointer < latestPointerRef.current) {
        return;
      }
      if (normalized?.status && normalized.status !== 'ACTIVE') {
        setEndSummarySession(normalized);
        clearClientTrainingState();
        profileStatsQuery.refetch();
        return;
      }
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
    onSettled: () => {
      actionInFlightRef.current = false;
      holdBatchActiveRef.current = false;
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

  const clearClientTrainingState = () => {
    clearTrainingState();
    setTimeframeBars([]);
    setTimeframeBarsTf(null);
    setTimeframeBarsMap({});
    setStableVisibleBars([]);
    setBarsFromTime(null);
    setHasMoreOlderBars(false);
    setLoadingOlderBars(false);
    barsRequestKeyRef.current = null;
    timeframeBarsMapRef.current = {};
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
    clearStopLossPrice?: boolean;
    clearTakeProfitPrice?: boolean;
    updateRiskOnly?: boolean;
  }) => {
    if (!session) return;
    const isHold = payload.action === 'HOLD' || payload.actionType === 'HOLD';
    if (actionInFlightRef.current) {
      return;
    }
    if (holdBatchActiveRef.current) {
      return;
    }
    const normalizePositive = (value?: number) =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
    const safePayload = {
      ...payload,
      stopLossPrice: normalizePositive(payload.stopLossPrice),
      takeProfitPrice: normalizePositive(payload.takeProfitPrice),
      clearStopLossPrice: payload.clearStopLossPrice === true,
      clearTakeProfitPrice: payload.clearTakeProfitPrice === true,
      updateRiskOnly: payload.updateRiskOnly === true,
      expectedPointer: session.pointer,
    };
    if (safePayload.updateRiskOnly) {
      actionMutation.mutate(safePayload);
      return;
    }
    // 到达最后一根后，观望与“结束训练”行为保持一致。
    const trainPointer = typeof session.trainPointer === 'number' ? session.trainPointer : session.pointer;
    if (isHold && trainPointer >= session.totalBars) {
      endMutation.mutate();
      return;
    }
    holdBatchActiveRef.current = true;
    actionMutation.mutate(safePayload);
  };

  const assignmentFromSession = (sourceSession: Session): PendingAssignment | null => {
    if (!sourceSession.assignmentId || (sourceSession.assignmentSource !== 'trial' && sourceSession.assignmentSource !== 'courseAssignment')) return null;
    return {
      assignmentSource: sourceSession.assignmentSource,
      assignmentId: sourceSession.assignmentId,
      assignmentTitle: sourceSession.assignmentTitleSnapshot || sourceSession.assignmentId,
      assignmentVersion: sourceSession.assignmentVersion ?? 1,
      lessonId: sourceSession.lessonId ?? '',
      lessonTitle: sourceSession.lessonTitleSnapshot ?? '',
      trainingMode: sourceSession.trainingMode ?? 'mixed',
      attemptNo: (sourceSession.attemptNo ?? 1) + 1,
      isAssignmentContinuation: true,
    };
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
    timeframeBarsMapRef.current = timeframeBarsMap;
  }, [timeframeBarsMap]);

  useEffect(() => {
    if (!session) {
      setTimeframeBars([]);
      setTimeframeBarsTf(null);
      setTimeframeBarsMap({});
      setStableVisibleBars([]);
      setBarsFromTime(null);
      setHasMoreOlderBars(false);
      barsRequestKeyRef.current = null;
      timeframeBarsMapRef.current = {};
      return;
    }
    const from = barsFromTime ?? session.contextStartTime ?? session.barsData?.[0]?.time;
    const to = session.currentTimePointer ?? session.barsData?.[session.pointer]?.time;
    if (!from || !to) return;
    const requestKey = `${session.id}|${viewTimeframe}|${from}|${to}`;
    barsRequestKeyRef.current = requestKey;
    api
      .get(`/training/${session.id}/bars`, { params: { timeframe: viewTimeframe, from, to } })
      .then((res) => {
        if (barsRequestKeyRef.current !== requestKey) return;
        const rows = Array.isArray(res.data?.bars) ? res.data.bars : [];
        setTimeframeBars(rows);
        setTimeframeBarsTf(viewTimeframe);
        setTimeframeBarsMap((prev) => ({ ...prev, [viewTimeframe]: rows }));
        setHasMoreOlderBars(Boolean(res.data?.hasMoreOlder));
        setLoadingOlderBars(false);
      })
      .catch(() => {
        if (barsRequestKeyRef.current !== requestKey) return;
        setTimeframeBars([]);
        setTimeframeBarsTf(viewTimeframe);
        setHasMoreOlderBars(false);
        setLoadingOlderBars(false);
      });
  }, [session, viewTimeframe, barsFromTime]);

  useEffect(() => {
    setBarsFromTime(null);
  }, [session?.id, viewTimeframe]);

  // Keep local timeframeBars aligned with the currently selected timeframe only.
  // This prevents one-frame "old timeframe bars" flashes when switching periods.
  useEffect(() => {
    if (!session) {
      setTimeframeBars([]);
      setTimeframeBarsTf(null);
      return;
    }
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
    const to = session.currentTimePointer ?? session.barsData?.[session.pointer]?.time;
    const toTs = Date.parse(to ?? '');
    const isFresh = (bars: Array<{ time: string }>) => {
      if (!Number.isFinite(toTs)) return false;
      if (!Array.isArray(bars) || bars.length === 0) return false;
      const lastTs = Date.parse(bars[bars.length - 1]?.time ?? '');
      if (!Number.isFinite(lastTs)) return false;
      const tolerance = Math.max(60_000, Math.floor((TF_MS[viewTimeframe] ?? 60 * 60_000) * 0.55));
      return lastTs >= toTs - tolerance;
    };
    const cached = timeframeBarsMap[viewTimeframe];
    if (Array.isArray(cached) && isFresh(cached)) {
      setTimeframeBars(cached);
      setTimeframeBarsTf(viewTimeframe);
      return;
    }
    setTimeframeBars([]);
    setTimeframeBarsTf(viewTimeframe);
  }, [session?.id, viewTimeframe, timeframeBarsMap]);

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
    const to = session.currentTimePointer ?? session.barsData?.[session.pointer]?.time;
    const toTs = Date.parse(to ?? '');
    const isFresh = (bars: Array<{ time: string }>) => {
      if (!Number.isFinite(toTs)) return false;
      if (!Array.isArray(bars) || bars.length === 0) return false;
      const lastTs = Date.parse(bars[bars.length - 1]?.time ?? '');
      if (!Number.isFinite(lastTs)) return false;
      const tolerance = Math.max(60_000, Math.floor((TF_MS[viewTimeframe] ?? 60 * 60_000) * 0.55));
      return lastTs >= toTs - tolerance;
    };
    if (timeframeBarsTf === viewTimeframe && timeframeBars.length > 0) return timeframeBars;
    const cached = timeframeBarsMap[viewTimeframe];
    if (Array.isArray(cached) && cached.length > 0 && isFresh(cached)) return cached;
    const baseTf = String(session.drivingTimeframe || session.viewTimeframe || '1H').toUpperCase();
    if (viewTimeframe.toUpperCase() === baseTf) return session.barsData;
    return [];
  }, [session, timeframeBars, timeframeBarsMap, viewTimeframe]);
  useEffect(() => {
    if (visibleBars.length > 0) {
      setStableVisibleBars(visibleBars);
      return;
    }
    if (!session) setStableVisibleBars([]);
  }, [visibleBars, session]);
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
            openFreePracticeConfig();
            return;
          }
          clearAssignmentLaunchContext();
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
        accessInfo={profileStatsQuery.data?.access ?? null}
        needResetAfterLiquidation={profileStatsQuery.data?.needResetAfterLiquidation ?? false}
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
              assignmentSource: pendingAssignment ? pendingAssignment.assignmentSource : 'freePractice',
              ...(pendingAssignment
                ? {
                    assignmentId: pendingAssignment.assignmentId,
                    assignmentTitle: pendingAssignment.assignmentTitle,
                    assignmentVersion: pendingAssignment.assignmentVersion,
                    lessonId: pendingAssignment.lessonId,
                    lessonTitle: pendingAssignment.lessonTitle,
                    trainingMode: pendingAssignment.trainingMode,
                    attemptNo: pendingAssignment.attemptNo,
                    isAssignmentContinuation: pendingAssignment.isAssignmentContinuation,
                  }
                : {}),
            });
          }}
        />
      )}
      {endSummarySession ? (
        <SessionEndModal
          session={endSummarySession}
          onClose={() => setEndSummarySession(null)}
          onRestart={() => {
            setNotice(null);
            setEndSummarySession(null);
            openFreePracticeConfig();
          }}
          onContinueAssignment={() => {
            setNotice(null);
            setPendingAssignment(assignmentFromSession(endSummarySession));
            setEndSummarySession(null);
            setShowConfig(true);
          }}
          onStartFreePractice={() => {
            setNotice(null);
            setPendingAssignment(null);
            setEndSummarySession(null);
            openFreePracticeConfig();
          }}
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
            if (pendingAssignment) {
              setShowConfig(true);
            } else {
              openFreePracticeConfig();
            }
          }}
          maskClosable={false}
        />
      ) : null}
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-1 px-0.5 pb-0.5 pt-0 sm:gap-2 sm:px-1.5 sm:pb-1.5 xl:grid-cols-[minmax(0,1fr)_290px] xl:gap-0 xl:px-0.5 xl:pb-0.5 xl:pt-0 2xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="z-0 flex h-[calc(100dvh-310px)] min-h-[380px] overflow-hidden sm:h-[calc(100dvh-330px)] sm:min-h-[430px] xl:h-auto xl:min-h-0">
          {session ? (
            <div className="relative h-full w-full min-h-0">
              <KLineChart
                data={stableVisibleBars}
                actions={chartActions}
                timeframe={viewTimeframe}
                onTimeframeChange={setViewTimeframe}
                fitContainerHeight
                showTradeLegend={false}
                showActionSummary={false}
                hideTimeAxisLabels
                hideHeaderTime
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
        <div className="relative z-20 min-h-0 pr-0 xl:pr-1 xl:overflow-hidden">
          {session ? (
            <div className="flex min-h-0 flex-col gap-1 xl:h-full xl:gap-2">
              <MobileTrainingSnapshot session={session} viewTimeframe={viewTimeframe} showCurrentPnl={hasTrainingActions} />
              <div className="shrink-0 xl:hidden">
                <TradePanel
                  session={session}
                  busy={actionMutation.isPending || startMutation.isPending || endMutation.isPending || holdBatchActiveRef.current}
                  onAction={handleTradeAction}
                  onEnd={() => setConfirmEndOpen(true)}
                />
              </div>
              <div className="hidden min-h-0 flex-1 overflow-y-auto pr-1 xl:block">
                <div className="surface-panel p-2 sm:p-2.5">
                  <div className="space-y-1.5">
                    <TrainingInfoPanel session={session} viewTimeframe={viewTimeframe} />
                    <AccountPanel session={session} showCurrentPnl={hasTrainingActions} />
                    {hasTrainingActions ? <TradeStatsPanel session={session} /> : null}
                  </div>
                </div>
              </div>
              <div className="hidden shrink-0 xl:block xl:max-h-[58vh] xl:overflow-y-auto">
                <TradePanel
                  session={session}
                  busy={actionMutation.isPending || startMutation.isPending || endMutation.isPending || holdBatchActiveRef.current}
                  onAction={handleTradeAction}
                  onEnd={() => setConfirmEndOpen(true)}
                />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-0 p-2">
              <EmptyState title="等待训练启动" description="训练开始后将显示账户信息、交易记录与下单面板。" className="h-full min-h-[280px]" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
