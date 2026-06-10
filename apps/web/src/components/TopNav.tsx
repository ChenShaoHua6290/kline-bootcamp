'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuthSession, type AuthUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { cn } from '@/lib/cn';

type NavTone = 'admin' | 'courses' | 'history' | 'settings';

const navToneClass: Record<NavTone, { active: string; idle: string; glow: string }> = {
  admin: {
    active: 'border-rose-300/50 bg-rose-500/15 text-rose-50 shadow-[0_0_0_1px_rgba(251,113,133,0.14),0_12px_28px_rgba(225,29,72,0.22)]',
    idle: 'border-rose-400/20 text-slate-300 hover:border-rose-300/40 hover:bg-rose-500/10 hover:text-rose-50 hover:shadow-[0_10px_24px_rgba(225,29,72,0.14)]',
    glow: 'from-rose-300/0 via-rose-200/25 to-rose-300/0',
  },
  courses: {
    active: 'border-cyan-300/50 bg-cyan-500/15 text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_12px_28px_rgba(8,145,178,0.22)]',
    idle: 'border-cyan-400/20 text-slate-300 hover:border-cyan-300/40 hover:bg-cyan-500/10 hover:text-cyan-50 hover:shadow-[0_10px_24px_rgba(8,145,178,0.14)]',
    glow: 'from-cyan-300/0 via-cyan-200/25 to-cyan-300/0',
  },
  history: {
    active: 'border-amber-300/50 bg-amber-500/15 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.14),0_12px_28px_rgba(217,119,6,0.2)]',
    idle: 'border-amber-400/20 text-slate-300 hover:border-amber-300/40 hover:bg-amber-500/10 hover:text-amber-50 hover:shadow-[0_10px_24px_rgba(217,119,6,0.13)]',
    glow: 'from-amber-300/0 via-amber-200/25 to-amber-300/0',
  },
  settings: {
    active: 'border-violet-300/50 bg-violet-500/15 text-violet-50 shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_12px_28px_rgba(124,58,237,0.2)]',
    idle: 'border-violet-400/20 text-slate-300 hover:border-violet-300/40 hover:bg-violet-500/10 hover:text-violet-50 hover:shadow-[0_10px_24px_rgba(124,58,237,0.13)]',
    glow: 'from-violet-300/0 via-violet-200/25 to-violet-300/0',
  },
};

function NavChrome({ active, tone, children }: { active?: boolean; tone: NavTone; children: ReactNode }) {
  const toneClass = navToneClass[tone];
  return (
    <>
      <span className={cn('pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r opacity-0 transition-opacity duration-200 group-hover:opacity-100', toneClass.glow)} />
      <span className={cn('pointer-events-none absolute -left-10 top-0 h-full w-10 -skew-x-12 bg-gradient-to-r opacity-0 blur-sm transition-all duration-500 group-hover:left-[calc(100%+2.5rem)] group-hover:opacity-100', toneClass.glow)} />
      <span className="relative z-10">{children}</span>
      <span className={cn('pointer-events-none absolute inset-x-3 bottom-1 h-px origin-center rounded-full bg-gradient-to-r transition-transform duration-200', toneClass.glow, active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100')} />
    </>
  );
}

function navBaseClass(active: boolean | undefined, tone: NavTone) {
  const toneClass = navToneClass[tone];
  return cn(
    'group relative inline-flex h-9 items-center justify-center overflow-hidden whitespace-nowrap rounded-xl border px-3.5 text-[13px] font-semibold transition-all duration-200 sm:text-[15px]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35',
    active ? toneClass.active : toneClass.idle,
  );
}

function NavButton({
  active,
  tone,
  children,
  onClick,
}: {
  active?: boolean;
  tone: NavTone;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" aria-current={active ? 'page' : undefined} onClick={onClick} className={navBaseClass(active, tone)}>
      <NavChrome active={active} tone={tone}>{children}</NavChrome>
    </button>
  );
}

function NavLink({ active, tone, href, children }: { active?: boolean; tone: NavTone; href: string; children: ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={navBaseClass(active, tone)}>
      <NavChrome active={active} tone={tone}>{children}</NavChrome>
    </Link>
  );
}

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
  const pathname = usePathname();
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
  const userInitial = displayName.slice(0, 1).toUpperCase() || 'U';

  return (
    <div className="app-nav flex flex-wrap items-center justify-between gap-3 sm:gap-2">
      <Link href="/" className="group flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(37,99,235,0.14))] text-sm font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.22)]">
          1
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold tracking-[0.01em] text-slate-50 sm:text-[20px]">只做一种模式</span>
          <span className="hidden text-[11px] font-medium text-slate-400 sm:block">训练 · 答疑 · 复盘</span>
        </span>
      </Link>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
        {user ? (
          <div ref={menuRef} className="relative hidden lg:block">
            <button
              className="group flex max-w-[230px] cursor-pointer items-center gap-2.5 rounded-xl border border-cyan-400/18 bg-slate-950/36 px-2.5 py-1.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-cyan-300/42 hover:bg-slate-900/60 xl:max-w-[280px]"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 text-xs font-bold text-cyan-100">
                {userInitial}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-slate-100">{displayName}</span>
                <span className="block truncate text-[10px] text-slate-500">{accessTypeLabel}</span>
              </span>
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
            <nav className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-600/45 bg-[linear-gradient(135deg,rgba(15,23,42,0.62),rgba(30,41,59,0.5),rgba(15,23,42,0.62))] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_rgba(2,6,23,0.24)]">
              {user.role === 'ADMIN' ? (
                <NavButton active={pathname.startsWith('/admin')} tone="admin" onClick={onAdmin}>
                  管理后台
                </NavButton>
              ) : null}
              <NavLink active={pathname.startsWith('/courses') || pathname.startsWith('/lessons')} tone="courses" href="/courses">
                课程中心
              </NavLink>
              <NavButton active={pathname.startsWith('/history')} tone="history" onClick={onHistory}>
                历史记录
              </NavButton>
              <NavButton active={pathname.startsWith('/settings')} tone="settings" onClick={onSettings}>
                修改密码
              </NavButton>
            </nav>
            <Button
              variant="primary"
              size="sm"
              className="h-9 rounded-xl border border-blue-300/25 bg-[linear-gradient(135deg,#60a5fa,#2563eb,#4f46e5)] px-4 text-white shadow-[0_12px_28px_rgba(37,99,235,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(59,130,246,0.5)] sm:text-[15px]"
              onClick={onStart}
            >
              开始训练
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl border-slate-600/55 bg-slate-950/25 px-4 text-slate-300 transition hover:-translate-y-0.5 hover:border-rose-300/45 hover:bg-rose-500/10 hover:text-rose-100 hover:shadow-[0_12px_26px_rgba(225,29,72,0.14)] sm:text-[15px]"
              onClick={logout}
            >
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
