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
  onAdmin,
  onLogout,
  user,
  liquidationCount = 0,
  totalResetCount = 0,
  onRequestReset,
  resetBalanceBusy = false,
}: {
  onStart: () => void;
  onHistory?: () => void;
  onAdmin?: () => void;
  onLogout?: () => void | Promise<void>;
  user: AuthUser | null;
  liquidationCount?: number;
  totalResetCount?: number;
  onRequestReset?: () => void;
  resetBalanceBusy?: boolean;
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

  return (
    <div className="app-nav flex flex-wrap items-center justify-between gap-2 sm:gap-2">
      <h1 className="app-title flex items-center gap-2">
        <span className="rounded-md border border-cyan-300/35 bg-cyan-500/10 px-1.5 py-0.5 text-xs font-bold tracking-[0.08em] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.28)] sm:text-[20px]">
          只做一种模式K线训练系统
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
              <Panel className="absolute right-0 z-[140] mt-2 w-[190px] p-3 shadow-2xl backdrop-blur">
                <div className="text-xs text-slate-400">爆仓次数: <span className="font-semibold text-rose-300">{liquidationCount}</span></div>
                <div className="mt-1 text-[13px] text-slate-300">
                  重置次数: <span className="font-semibold text-cyan-300">{totalResetCount}</span>
                </div>
                <Button
                  variant="primary"
                  className="mt-3 h-8 w-full !text-[13px] !font-medium"
                  onClick={() => {
                    onRequestReset?.();
                    setMenuOpen(false);
                  }}
                  disabled={resetBalanceBusy}
                >
                  {resetBalanceBusy ? '重置中...' : '重置金额'}
                </Button>
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
