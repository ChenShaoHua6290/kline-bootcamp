'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuthSession, type AuthUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { cn } from '@/lib/cn';

type NavTone = 'admin' | 'courses' | 'history' | 'settings';
type AccessInfo = {
  accessType: 'TRIAL' | 'PAID' | 'INTERNAL';
  accessExpiresAt: string | null;
  todayTrainingCount?: number;
  todayRemainingTrainingCount?: number | null;
  currentPlan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
};
type IconName =
  | 'admin'
  | 'courses'
  | 'history'
  | 'settings'
  | 'play'
  | 'logout'
  | 'menu'
  | 'chevron'
  | 'user'
  | 'shield'
  | 'refresh'
  | 'calendar';

const navToneClass: Record<NavTone, { active: string; idle: string; glow: string; iconActive: string; iconIdle: string }> = {
  admin: {
    active: 'border-rose-300/30 bg-[linear-gradient(135deg,rgba(251,113,133,0.22),rgba(190,18,60,0.18))] text-rose-50 shadow-[0_12px_28px_rgba(225,29,72,0.2)]',
    idle: 'border-slate-500/35 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(30,41,59,0.68))] text-slate-200 hover:-translate-y-0.5 hover:border-rose-300/35 hover:bg-rose-500/10 hover:text-rose-50 hover:shadow-[0_12px_28px_rgba(225,29,72,0.14)]',
    glow: 'from-rose-300/0 via-rose-200/55 to-rose-300/0',
    iconActive: 'border-rose-300/30 bg-rose-400/10 text-rose-100',
    iconIdle: 'border-slate-600/35 bg-slate-900/60 text-slate-400 group-hover:border-rose-300/25 group-hover:text-rose-100',
  },
  courses: {
    active: 'border-cyan-300/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(37,99,235,0.18))] text-cyan-50 shadow-[0_12px_28px_rgba(37,99,235,0.22)]',
    idle: 'border-slate-500/35 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(30,41,59,0.68))] text-slate-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-500/10 hover:text-cyan-50 hover:shadow-[0_12px_28px_rgba(37,99,235,0.16)]',
    glow: 'from-cyan-300/0 via-cyan-200/55 to-cyan-300/0',
    iconActive: 'text-cyan-100',
    iconIdle: 'text-slate-400 group-hover:text-cyan-100',
  },
  history: {
    active: 'border-amber-300/30 bg-[linear-gradient(135deg,rgba(251,191,36,0.22),rgba(217,119,6,0.16))] text-amber-50 shadow-[0_12px_28px_rgba(217,119,6,0.18)]',
    idle: 'border-slate-500/35 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(30,41,59,0.68))] text-slate-300 hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-amber-500/10 hover:text-amber-50 hover:shadow-[0_12px_28px_rgba(217,119,6,0.13)]',
    glow: 'from-amber-300/0 via-amber-200/55 to-amber-300/0',
    iconActive: 'text-amber-100',
    iconIdle: 'text-slate-400 group-hover:text-amber-100',
  },
  settings: {
    active: 'border-violet-300/30 bg-[linear-gradient(135deg,rgba(167,139,250,0.22),rgba(124,58,237,0.18))] text-violet-50 shadow-[0_12px_28px_rgba(124,58,237,0.18)]',
    idle: 'border-slate-500/35 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(30,41,59,0.68))] text-slate-200 hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-violet-500/10 hover:text-violet-50 hover:shadow-[0_12px_28px_rgba(124,58,237,0.13)]',
    glow: 'from-violet-300/0 via-violet-200/55 to-violet-300/0',
    iconActive: 'border-violet-300/30 bg-violet-400/10 text-violet-100',
    iconIdle: 'border-slate-600/35 bg-slate-900/60 text-slate-400 group-hover:border-violet-300/25 group-hover:text-violet-100',
  },
};

function AppIcon({ name, className }: { name: IconName; className?: string }) {
  const icon: Record<IconName, ReactNode> = {
    admin: (
      <>
        <path d="M12 3.75 18.5 6v5.2c0 4.05-2.62 7.1-6.5 8.95-3.88-1.85-6.5-4.9-6.5-8.95V6L12 3.75Z" />
        <path d="M9.25 12.1 11 13.85l3.9-4.15" />
      </>
    ),
    courses: (
      <>
        <path d="M5.5 5.25h7.2a2.2 2.2 0 0 1 2.2 2.2v11.3H7.7a2.2 2.2 0 0 1-2.2-2.2V5.25Z" />
        <path d="M14.9 7.25h2.4a1.2 1.2 0 0 1 1.2 1.2v10.3h-3.6" />
        <path d="M8.1 9.25h4.05" />
        <path d="M8.1 12.25h4.05" />
      </>
    ),
    history: (
      <>
        <path d="M4.75 12a7.25 7.25 0 1 0 2.12-5.13" />
        <path d="M4.75 5.25v3.9H8.6" />
        <path d="M12 8.25v4.2l2.8 1.65" />
      </>
    ),
    settings: (
      <>
        <path d="M15.4 8.6a3.15 3.15 0 1 0-4.45 4.45" />
        <path d="m14.05 13.05 1.55 1.55" />
        <path d="m16.7 13.5-3.95 3.95a1.7 1.7 0 0 1-2.4 0 1.7 1.7 0 0 1 0-2.4l3.95-3.95" />
        <path d="M17.95 6.05 19 5" />
      </>
    ),
    play: <path d="M8.25 5.75v12.5L18 12 8.25 5.75Z" />,
    logout: (
      <>
        <path d="M10.25 6.25H7a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h3.25" />
        <path d="M14 8.25 17.75 12 14 15.75" />
        <path d="M17.35 12H9.5" />
      </>
    ),
    menu: (
      <>
        <path d="M5 7.25h14" />
        <path d="M5 12h14" />
        <path d="M5 16.75h14" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    user: (
      <>
        <path d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
        <path d="M5.25 19.25a6.75 6.75 0 0 1 13.5 0" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3.75 18 6v5.15c0 3.55-2.32 6.48-6 8.1-3.68-1.62-6-4.55-6-8.1V6l6-2.25Z" />
        <path d="M9.25 12.15 11.15 14 15 9.8" />
      </>
    ),
    refresh: (
      <>
        <path d="M18.6 8.5A7 7 0 0 0 6.15 7.2L5 8.75" />
        <path d="M5 5.25v3.5h3.5" />
        <path d="M5.4 15.5a7 7 0 0 0 12.45 1.3L19 15.25" />
        <path d="M19 18.75v-3.5h-3.5" />
      </>
    ),
    calendar: (
      <>
        <path d="M7.25 4.75v3" />
        <path d="M16.75 4.75v3" />
        <path d="M5.25 8.25h13.5" />
        <path d="M6.75 6.25h10.5a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 2-2Z" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      {icon[name]}
    </svg>
  );
}

function NavChrome({ active, tone, children }: { active?: boolean; tone: NavTone; children: ReactNode }) {
  const toneClass = navToneClass[tone];
  return (
    <>
      <span className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0))] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <span className={cn('pointer-events-none absolute inset-x-3 bottom-0.5 h-px origin-center rounded-full bg-gradient-to-r transition-all duration-200', toneClass.glow, active ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-0 group-hover:scale-x-100 group-hover:opacity-80')} />
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </>
  );
}

function navBaseClass(active: boolean | undefined, tone: NavTone) {
  const toneClass = navToneClass[tone];
  return cn(
    'group relative inline-flex h-8 min-w-[96px] items-center justify-center overflow-hidden whitespace-nowrap rounded-xl border px-3 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(2,6,23,0.16)] transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35',
    active ? toneClass.active : toneClass.idle,
  );
}

function NavItemContent({ active, tone, icon, children }: { active?: boolean; tone: NavTone; icon: IconName; children: ReactNode }) {
  const toneClass = navToneClass[tone];
  return (
    <>
      <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-200', active ? toneClass.iconActive : toneClass.iconIdle)}>
        <AppIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="text-xs">{children}</span>
    </>
  );
}

function NavButton({
  active,
  tone,
  icon,
  children,
  onClick,
}: {
  active?: boolean;
  tone: NavTone;
  icon: IconName;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" aria-current={active ? 'page' : undefined} onClick={onClick} className={navBaseClass(active, tone)}>
      <NavChrome active={active} tone={tone}><NavItemContent active={active} tone={tone} icon={icon}>{children}</NavItemContent></NavChrome>
    </button>
  );
}

function NavLink({ active, tone, icon, href, children }: { active?: boolean; tone: NavTone; icon: IconName; href: string; children: ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={navBaseClass(active, tone)}>
      <NavChrome active={active} tone={tone}><NavItemContent active={active} tone={tone} icon={icon}>{children}</NavItemContent></NavChrome>
    </Link>
  );
}

function UserAvatar({ initial, className }: { initial: string; className?: string }) {
  return (
    <span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.24),rgba(37,99,235,0.22),rgba(15,23,42,0.65))] font-bold text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(8,47,73,0.2)]', className)}>
      <span className="absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent" />
      {initial}
    </span>
  );
}

function CompactMenuButton({ icon, children, onClick }: { icon: IconName; children: ReactNode; onClick: () => void | Promise<void> }) {
  return (
    <button
      type="button"
      className="group flex h-10 w-full items-center gap-2 rounded-xl border border-slate-700/70 bg-[rgba(15,23,42,0.72)] px-3 text-left text-xs font-semibold text-slate-200 transition hover:border-violet-300/45 hover:bg-violet-500/10 hover:text-violet-50"
      onClick={() => void onClick()}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-600/50 bg-slate-950/45 text-slate-400 transition group-hover:border-violet-300/35 group-hover:text-violet-100">
        <AppIcon name={icon} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <AppIcon name="chevron" className="-rotate-90 h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-violet-100" />
    </button>
  );
}

function AccessCard({
  accessInfo,
  accessTypeLabel,
  accessPlanLabel,
  accessExpireLabel,
  accessUsageLabel,
}: {
  accessInfo: AccessInfo | null | undefined;
  accessTypeLabel: string;
  accessPlanLabel: string;
  accessExpireLabel: string;
  accessUsageLabel: string;
}) {
  return (
    <div className="rounded-xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(8,47,73,0.9),rgba(15,23,42,0.96))] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-400/10 text-cyan-100">
            <AppIcon name="shield" className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold leading-5 text-slate-50">{accessTypeLabel}</div>
            <div className="mt-0.5 truncate text-[11px] leading-4 text-cyan-100/80">{accessUsageLabel}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {accessInfo?.accessType === 'PAID' && accessInfo.currentPlan && accessInfo.currentPlan !== 'NONE' ? (
            <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold leading-4 text-cyan-100">
              {accessPlanLabel}
            </span>
          ) : null}
          <span className="flex items-center gap-1 text-[11px] leading-4 text-slate-400">
            <AppIcon name="calendar" className="h-3 w-3 text-slate-500" />
            {accessExpireLabel.replace('到期 ', '')}
          </span>
        </div>
      </div>
    </div>
  );
}

function ResetCard({
  needResetAfterLiquidation,
  totalResetCount,
  resetBalanceBusy,
  onRequestReset,
}: {
  needResetAfterLiquidation: boolean;
  totalResetCount: number;
  resetBalanceBusy: boolean;
  onRequestReset: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        needResetAfterLiquidation
          ? 'border-amber-300/30 bg-[linear-gradient(135deg,rgba(120,53,15,0.46),rgba(15,23,42,0.9))]'
          : 'border-slate-700/70 bg-[linear-gradient(135deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98))]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
              needResetAfterLiquidation ? 'border-amber-300/35 bg-amber-400/10 text-amber-100' : 'border-slate-600/55 bg-slate-900/75 text-cyan-100',
            )}
          >
            <AppIcon name="refresh" className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className={cn('truncate text-xs font-semibold', needResetAfterLiquidation ? 'text-amber-50' : 'text-slate-50')}>资金重置</div>
            <div className="mt-0.5 text-[11px] text-slate-400">累计 {totalResetCount} 次</div>
          </div>
        </div>
        <Button
          variant={needResetAfterLiquidation ? 'warning' : 'primary'}
          size="sm"
          className={cn(
            'h-8 shrink-0 rounded-lg px-3 text-xs',
            needResetAfterLiquidation
              ? 'text-slate-950 shadow-[0_10px_22px_rgba(245,158,11,0.2)]'
              : 'border border-blue-300/20 bg-[linear-gradient(135deg,#38bdf8,#2563eb)] shadow-[0_10px_22px_rgba(37,99,235,0.28)]',
          )}
          onClick={onRequestReset}
          disabled={resetBalanceBusy}
        >
          {resetBalanceBusy ? '重置中' : '重置金额'}
        </Button>
      </div>
    </div>
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
  accessInfo?: AccessInfo | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const logout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    clearAuthSession();
    router.push('/auth');
  };

  const goAdmin = () => {
    if (onAdmin) onAdmin();
    else router.push('/admin');
  };

  const goHistory = () => {
    if (onHistory) onHistory();
    else router.push('/history');
  };

  const goSettings = () => {
    if (onSettings) onSettings();
    else router.push('/settings');
  };

  const runMobileAction = (action: () => void | Promise<void>) => {
    setMobileMenuOpen(false);
    void action();
  };

  const requestReset = () => {
    onRequestReset?.();
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const openSettingsFromMenu = () => {
    setMenuOpen(false);
    goSettings();
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

  useEffect(() => {
    setMobileMenuOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const displayName = user ? (user.nickname?.trim() || user.email.split('@')[0] || user.email) : '';
  const accessTypeLabel = accessInfo?.accessType === 'TRIAL' ? '试用用户' : accessInfo?.accessType === 'PAID' ? '付费用户' : accessInfo?.accessType === 'INTERNAL' ? '内部用户' : '权限同步中';
  const accessPlanLabel =
    accessInfo?.currentPlan === 'YEARLY' ? '年卡' : accessInfo?.currentPlan === 'QUARTERLY' ? '季卡' : accessInfo?.currentPlan === 'MONTHLY' ? '月卡' : '';
  const accessExpireLabel = accessInfo?.accessExpiresAt ? `到期 ${new Date(accessInfo.accessExpiresAt).toLocaleDateString('zh-CN')}` : accessInfo ? '长期有效' : '正在同步';
  const accessUsageLabel = accessInfo
    ? accessInfo.accessType === 'TRIAL'
      ? `今日 ${accessInfo.todayTrainingCount ?? 0} 次，剩余 ${accessInfo.todayRemainingTrainingCount ?? 0} 次`
      : accessInfo.accessType === 'PAID'
        ? '训练次数不限'
        : '训练次数不限'
    : '同步账户权限中';
  const userInitial = displayName.slice(0, 1).toUpperCase() || 'U';

  return (
    <div className="app-nav flex flex-wrap items-center justify-between gap-3 sm:gap-2 2xl:flex-nowrap">
      <Link href="/" className="group flex min-w-0 flex-1 items-center gap-2.5 lg:flex-none">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-[linear-gradient(135deg,rgba(8,145,178,0.36),rgba(37,99,235,0.2),rgba(15,23,42,0.74))] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_24px_rgba(8,47,73,0.22)] transition group-hover:border-cyan-200/55 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_28px_rgba(8,145,178,0.2)]">
          <span className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
          <span className="relative z-10 text-[18px] font-black leading-none tracking-normal text-cyan-50 drop-shadow-[0_1px_8px_rgba(125,211,252,0.5)]">1</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold tracking-[0.01em] text-slate-50 sm:text-[20px]">只做一种模式</span>
          <span className="hidden text-[11px] font-medium text-slate-400 sm:block">训练 · 答疑 · 复盘</span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-2 lg:hidden">
        {user ? (
          <>
            <Button
              variant="primary"
              size="sm"
              className="h-10 rounded-xl border border-blue-300/25 bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-3 text-white shadow-[0_10px_22px_rgba(37,99,235,0.3)]"
              onClick={() => runMobileAction(onStart)}
            >
              <AppIcon name="play" className="h-4 w-4" />
              开始
            </Button>
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/60 bg-slate-950/40 text-slate-200 transition hover:border-cyan-300/55 hover:bg-cyan-500/10"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <AppIcon name="menu" className="h-5 w-5" />
            </button>
          </>
        ) : (
          <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] px-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]" href="/auth">
            登录
          </Link>
        )}
      </div>
      <div className="hidden w-full min-w-0 flex-wrap items-center justify-end gap-2 lg:flex lg:w-auto 2xl:flex-nowrap">
        {user ? (
          <div ref={menuRef} className="relative order-2 xl:order-none">
            <button
              className="group flex h-8 max-w-[250px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-500/35 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(30,41,59,0.68))] px-3 text-left text-xs font-semibold text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(2,6,23,0.16)] transition hover:border-cyan-300/40 hover:bg-slate-900/80 xl:max-w-[286px]"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 text-[11px] font-bold text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">{userInitial}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-300">{displayName}</span>
              </span>
              <AppIcon name="chevron" className={cn('h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-100', menuOpen && 'rotate-180 text-cyan-100')} />
              {needResetAfterLiquidation ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]" /> : null}
            </button>
            {menuOpen ? (
              <Panel className="absolute right-0 z-[240] mt-2 w-[316px] rounded-2xl border-slate-600/60 bg-[rgba(2,6,23,0.99)] p-3 shadow-[0_22px_52px_rgba(2,6,23,0.82)]">
                <div className="mb-2.5 rounded-xl border border-slate-700/70 bg-[rgba(15,23,42,0.96)] p-2.5">
                  <div className="flex items-center gap-3">
                    <UserAvatar initial={userInitial} className="h-10 w-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-xs font-semibold leading-5 text-slate-50">{displayName}</div>
                        <span className="shrink-0 rounded-full border border-slate-600/60 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold leading-4 text-slate-400">
                          {user.role === 'ADMIN' ? '管理员' : '用户'}
                        </span>
                      </div>
                      <div className="mt-1 break-all text-[11px] leading-4 text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <AccessCard
                    accessInfo={accessInfo}
                    accessTypeLabel={accessTypeLabel}
                    accessPlanLabel={accessPlanLabel}
                    accessExpireLabel={accessExpireLabel}
                    accessUsageLabel={accessUsageLabel}
                  />
                  <ResetCard
                    needResetAfterLiquidation={needResetAfterLiquidation}
                    totalResetCount={totalResetCount}
                    resetBalanceBusy={resetBalanceBusy}
                    onRequestReset={requestReset}
                  />
                  <CompactMenuButton icon="settings" onClick={openSettingsFromMenu}>
                    修改密码
                  </CompactMenuButton>
                </div>
              </Panel>
            ) : null}
          </div>
        ) : null}
        {user ? (
          <>
            <nav className="order-1 flex min-w-0 flex-wrap items-center gap-2 xl:order-none 2xl:flex-nowrap">
              {user.role === 'ADMIN' ? (
                <NavButton active={pathname.startsWith('/admin')} tone="admin" icon="admin" onClick={goAdmin}>
                  管理中心
                </NavButton>
              ) : null}
              <NavLink active={pathname.startsWith('/courses') || pathname.startsWith('/lessons')} tone="courses" icon="courses" href="/courses">
                学习中心
              </NavLink>
              <NavButton active={pathname.startsWith('/history')} tone="history" icon="history" onClick={goHistory}>
                历史记录
              </NavButton>
            </nav>
            <Button
              variant="primary"
              size="sm"
              className="order-3 h-10 rounded-xl !border !border-blue-300/35 bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-3.5 text-[13px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_rgba(37,99,235,0.34)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_16px_34px_rgba(59,130,246,0.42)] xl:order-none"
              onClick={onStart}
            >
              <AppIcon name="play" className="h-4 w-4" />
              开始训练
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="order-4 h-8 rounded-xl border-slate-500/35 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(30,41,59,0.68))] px-3.5 text-xs text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(2,6,23,0.16)] transition hover:-translate-y-0.5 hover:border-rose-300/45 hover:bg-rose-500/10 hover:text-rose-100 hover:shadow-[0_12px_26px_rgba(225,29,72,0.14)] xl:order-none"
              onClick={logout}
            >
              <AppIcon name="logout" className="h-4 w-4" />
              退出
            </Button>
          </>
        ) : (
          <Link className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]" href="/auth">
            登录 / 注册
          </Link>
        )}
      </div>
      {user && mobileMenuOpen ? (
        <div className="w-full lg:hidden">
          <Panel className="relative z-[220] rounded-2xl border-slate-600/60 bg-[rgba(2,6,23,0.99)] p-3 shadow-[0_18px_42px_rgba(2,6,23,0.82)]">
            <div className="mb-2.5 rounded-xl border border-slate-700/70 bg-[rgba(15,23,42,0.96)] p-2.5">
              <div className="flex items-center gap-3">
                <UserAvatar initial={userInitial} className="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-xs font-semibold leading-5 text-slate-50">{displayName}</div>
                    <span className="shrink-0 rounded-full border border-slate-600/60 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold leading-4 text-slate-400">
                      {user.role === 'ADMIN' ? '管理员' : '用户'}
                    </span>
                  </div>
                  <div className="mt-1 break-all text-[11px] leading-4 text-slate-400">{user.email}</div>
                </div>
              </div>
            </div>

            <div className="mb-2.5 space-y-2">
              <AccessCard
                accessInfo={accessInfo}
                accessTypeLabel={accessTypeLabel}
                accessPlanLabel={accessPlanLabel}
                accessExpireLabel={accessExpireLabel}
                accessUsageLabel={accessUsageLabel}
              />
              <ResetCard
                needResetAfterLiquidation={needResetAfterLiquidation}
                totalResetCount={totalResetCount}
                resetBalanceBusy={resetBalanceBusy}
                onRequestReset={requestReset}
              />
              <CompactMenuButton icon="settings" onClick={() => runMobileAction(goSettings)}>
                修改密码
              </CompactMenuButton>
            </div>

            <nav className="grid grid-cols-2 gap-2">
              {user.role === 'ADMIN' ? (
                <button type="button" className={cn(navBaseClass(pathname.startsWith('/admin'), 'admin'), 'w-full')} onClick={() => runMobileAction(goAdmin)}>
                  <NavChrome active={pathname.startsWith('/admin')} tone="admin"><NavItemContent active={pathname.startsWith('/admin')} tone="admin" icon="admin">管理后台</NavItemContent></NavChrome>
                </button>
              ) : null}
              <Link
                href="/courses"
                aria-current={pathname.startsWith('/courses') || pathname.startsWith('/lessons') ? 'page' : undefined}
                className={cn(navBaseClass(pathname.startsWith('/courses') || pathname.startsWith('/lessons'), 'courses'), 'w-full')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <NavChrome active={pathname.startsWith('/courses') || pathname.startsWith('/lessons')} tone="courses"><NavItemContent active={pathname.startsWith('/courses') || pathname.startsWith('/lessons')} tone="courses" icon="courses">学习中心</NavItemContent></NavChrome>
              </Link>
              <button type="button" className={cn(navBaseClass(pathname.startsWith('/history'), 'history'), 'w-full')} onClick={() => runMobileAction(goHistory)}>
                <NavChrome active={pathname.startsWith('/history')} tone="history"><NavItemContent active={pathname.startsWith('/history')} tone="history" icon="history">历史记录</NavItemContent></NavChrome>
              </button>
            </nav>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                size="sm"
                className="h-10 rounded-xl border border-blue-300/25 bg-[linear-gradient(135deg,#38bdf8,#2563eb)] text-white"
                onClick={() => runMobileAction(onStart)}
              >
                <AppIcon name="play" className="h-4 w-4" />
                开始训练
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 rounded-xl border-slate-600/55 bg-slate-950/25 text-slate-300 hover:border-rose-300/45 hover:bg-rose-500/10 hover:text-rose-100"
                onClick={() => runMobileAction(logout)}
              >
                <AppIcon name="logout" className="h-4 w-4" />
                退出登录
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
