'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAuthSession, type AuthUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export function TopNav({
  onStart,
  onHistory,
  onSettings,
  onAdmin,
  onLogout,
  user,
  liquidationCount = 0,
  totalResetCount = 0,
  onRequestReset,
  resetBalanceBusy = false,
  accessInfo,
  needResetAfterLiquidation = false,
}: {
  onStart: () => void;
  onHistory?: () => void;
  onSettings?: () => void;
  onAdmin?: () => void;
  onLogout?: () => void | Promise<void>;
  user: AuthUser | null;
  liquidationCount?: number;
  totalResetCount?: number;
  onRequestReset?: () => void;
  resetBalanceBusy?: boolean;
  needResetAfterLiquidation?: boolean;
  accessInfo?: {
    accessType: 'TRIAL' | 'PAID' | 'INTERNAL';
    accessExpiresAt: string | null;
    todayTrainingCount?: number;
    todayRemainingTrainingCount?: number | null;
    currentPlan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  } | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const logout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    clearAuthSession();
    router.push('/auth');
  };

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const displayName = user ? (user.nickname?.trim() || user.email.split('@')[0] || user.email) : '';
  const accessTypeLabel = accessInfo?.accessType === 'TRIAL' ? '试用用户' : accessInfo?.accessType === 'PAID' ? '付费用户' : '内部用户';
  const accessPlanLabel =
    accessInfo?.currentPlan === 'YEARLY' ? '年卡' : accessInfo?.currentPlan === 'QUARTERLY' ? '季卡' : accessInfo?.currentPlan === 'MONTHLY' ? '月卡' : '';
  const accessHint = accessInfo
    ? accessInfo.accessType === 'TRIAL'
      ? `为保障服务稳定与友好体验，今日已训练 ${accessInfo.todayTrainingCount ?? 0} 次，剩余 ${accessInfo.todayRemainingTrainingCount ?? 0} 次`
      : accessInfo.accessType === 'PAID'
        ? `${accessPlanLabel || '付费'}权限，训练次数不限`
        : '内部权限，训练次数不限'
    : '';

  return (
    <div className="app-nav flex flex-wrap items-center justify-between gap-2 sm:gap-2">
      <h1 className="app-title flex items-center gap-2">
        <span className="rounded-md border border-cyan-300/35 bg-cyan-500/10 px-1.5 py-0.5 text-xs font-bold tracking-[0.08em] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.28)] sm:text-[20px]">
          只做一种模式
        </span>
      </h1>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
        {user ? (
          <div ref={menuRef} className="relative hidden lg:block">
            <button
              className="surface-muted max-w-[210px] cursor-pointer px-2.5 py-1.5 text-left transition hover:border-slate-500 xl:max-w-[260px]"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="truncate text-[15px] font-medium text-slate-200">{displayName}</div>
              <div className="truncate text-[10px] text-slate-400">{user.email}</div>
            </button>
            {menuOpen ? (
              <Panel className="absolute right-0 z-[140] mt-2 w-[258px] border-cyan-500/22 bg-slate-950 p-2.5 shadow-[0_16px_40px_rgba(2,6,23,0.65)]">
                {accessInfo ? (
                  <div className="mb-2 rounded-lg border border-cyan-400/30 bg-[linear-gradient(135deg,rgba(8,47,105,0.62),rgba(14,116,144,0.28))] px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
                        {accessTypeLabel}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {accessInfo.accessExpiresAt ? `到期 ${new Date(accessInfo.accessExpiresAt).toLocaleDateString('zh-CN')}` : '长期有效'}
                      </span>
                    </div>
                    <div className="mt-1 text-[12px] leading-5 text-cyan-100/90">{accessHint}</div>
                  </div>
                ) : null}
                <div
                  className={
                    needResetAfterLiquidation
                      ? 'rounded-lg border border-transparent bg-[linear-gradient(140deg,rgba(180,83,9,0.34),rgba(15,23,42,0.82))] px-2.5 py-1.5 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]'
                      : 'rounded-lg border border-transparent bg-[linear-gradient(140deg,rgba(30,64,175,0.3),rgba(15,23,42,0.8))] px-2.5 py-1.5'
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={needResetAfterLiquidation ? 'text-[11px] tracking-[0.08em] text-amber-200' : 'text-[11px] tracking-[0.08em] text-slate-400'}>资金重置</span>
                    <span
                      className={
                        needResetAfterLiquidation
                          ? 'inline-flex items-center rounded-full border border-amber-300/50 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-100'
                          : 'inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200'
                      }
                    >
                      累计 {totalResetCount} 次
                    </span>
                  </div>
                  <div className={needResetAfterLiquidation ? 'mt-1 text-[12px] leading-5 text-amber-100/90' : 'mt-1 text-[12px] leading-5 text-slate-300/90'}>
                    {needResetAfterLiquidation ? '检测到账户已触发爆仓，请先重置资金后继续训练。' : '用于爆仓后恢复初始资金，便于继续训练。'}
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      variant="primary"
                      className="h-7 whitespace-nowrap rounded-lg px-3 !text-[12px] !font-medium"
                      onClick={() => {
                        onRequestReset?.();
                        setMenuOpen(false);
                      }}
                      disabled={resetBalanceBusy}
                    >
                      {resetBalanceBusy ? '重置中...' : '重置金额'}
                    </Button>
                  </div>
                </div>
              </Panel>
            ) : null}
          </div>
        ) : null}
        {user ? (
          <>
            {user.role === 'ADMIN' ? (
              <Button variant="ghost" size="sm" className="h-8 sm:px-3 sm:text-[15px]" onClick={onAdmin}>
                管理后台
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" className="h-8 sm:px-3 sm:text-[15px]" onClick={onHistory}>
              历史记录
            </Button>
            <Button variant="ghost" size="sm" className="h-8 sm:px-3 sm:text-[15px]" onClick={onSettings}>
              修改密码
            </Button>
            <Button variant="primary" size="sm" className="h-8 sm:px-3 sm:text-[15px ]" onClick={onStart}>
              开始训练
            </Button>
            <Button variant="ghost" size="sm" className="h-8 sm:px-3 sm:text-[15px]" onClick={logout}>
              退出
            </Button>
          </>
        ) : (
          <Link className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]" href="/auth">
            登录 / 注册
          </Link>
        )}
      </div>
    </div>
  );
}
