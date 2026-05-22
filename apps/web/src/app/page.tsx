'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TopNav } from '@/components/TopNav';
import { DashboardPanel } from '@/components/DashboardPanel';
import { NoticeModal } from '@/components/NoticeModal';
import { clearAuthSession, getAuthUser, getToken, type AuthUser } from '@/lib/auth';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

type ProfileStats = {
  liquidationCount: number;
  totalResetCount: number;
  accountBalance: number;
  needResetAfterLiquidation: boolean;
};

type DashboardData = {
  summary: {
    trainingCount: number;
    winRate: number;
    accountScore: number;
    liquidationCount: number;
  };
  equityCurve: Array<{ time: string; equity: number }>;
  leaderboard: {
    top10: Array<{
      rank: number;
      userId: string;
      displayName: string;
      accountScore: number;
      trainingCount: number;
      winRate: number;
      liquidationCount: number;
      isMe: boolean;
    }>;
    me: {
      rank: number;
      userId: string;
      displayName: string;
      accountScore: number;
      trainingCount: number;
      winRate: number;
      liquidationCount: number;
      isMe: boolean;
    } | null;
  };
};

function normalizeErrorMessage(msg: string | string[] | undefined, fallback: string) {
  if (Array.isArray(msg)) return msg.join('，');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone?: 'error' | 'warning' | 'info' } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const router = useRouter();

  const profileStatsQuery = useQuery({
    queryKey: ['training-profile-stats'],
    enabled: ready && Boolean(user),
    queryFn: async () => (await api.get<ProfileStats>('/training/profile')).data,
  });

  const dashboardQuery = useQuery({
    queryKey: ['training-dashboard'],
    enabled: ready && Boolean(user),
    queryFn: async () => (await api.get<DashboardData>('/training/dashboard')).data,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const token = getToken();
    const currentUser = getAuthUser();
    if (token && currentUser) {
      setUser(currentUser);
    } else {
      if (token && !currentUser) clearAuthSession();
      setUser(null);
    }
    setReady(true);
  }, []);

  const resetAccountMutation = useMutation({
    mutationFn: async () => (await api.post('/training/reset-account')).data,
    onMutate: () => setNotice(null),
    onSuccess: () => {
      profileStatsQuery.refetch();
      dashboardQuery.refetch();
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

  if (!ready) return <main className="app-shell p-6"><LoadingState message="正在检查登录状态..." /></main>;

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden overflow-y-auto">
      <TopNav
        onStart={() => router.push('/train?start=1')}
        onHistory={() => router.push('/history')}
        onSettings={() => router.push('/settings')}
        onAdmin={() => router.push('/admin')}
        user={user}
        liquidationCount={profileStatsQuery.data?.liquidationCount ?? 0}
        totalResetCount={profileStatsQuery.data?.totalResetCount ?? 0}
        onRequestReset={() => setConfirmResetOpen(true)}
        resetBalanceBusy={resetAccountMutation.isPending}
      />

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
          onConfirm={() => {
            setConfirmResetOpen(false);
            resetAccountMutation.mutate();
          }}
        />
      ) : null}

      {user ? (
        <DashboardPanel
          data={dashboardQuery.data}
          loading={dashboardQuery.isLoading}
          error={dashboardQuery.isError}
          currentUserId={user.id}
        />
      ) : (
        <div className="p-4"><EmptyState title="请先登录" description="登录后即可查看首页统计与资金曲线。" /></div>
      )}
    </main>
  );
}
