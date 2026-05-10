'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAuthSession, type AuthUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { ContactTeacherButton } from '@/components/contact/ContactTeacherButton';

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
  showContactButton = true,
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
  showContactButton?: boolean;
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

  return (
    <div className="app-nav flex flex-wrap items-center justify-between gap-2 sm:gap-2">
      <h1 className="app-title text-base sm:text-lg">只做一种模式K线训练系统</h1>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
        {user ? (
          <div ref={menuRef} className="relative hidden lg:block">
            <button
              className="surface-muted max-w-[210px] cursor-pointer px-2.5 py-1.5 text-left transition hover:border-slate-500 xl:max-w-[260px]"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="truncate text-sm font-medium text-slate-200">{user.email}</div>
            </button>
            {menuOpen ? (
              <Panel className="absolute right-0 z-[140] mt-2 w-[240px] p-3 shadow-2xl backdrop-blur">
                <div className="mt-1 text-sm text-slate-300">
                  重置次数: <span className="font-semibold text-cyan-300">{totalResetCount}</span>
                </div>
                <Button
                  variant="primary"
                  className="mt-3 w-full"
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
              <Button variant="default" size="sm" className="sm:h-10 sm:px-3.5 sm:text-sm" onClick={onAdmin}>
                管理后台
              </Button>
            ) : null}
            <Button variant="default" size="sm" className="sm:h-10 sm:px-3.5 sm:text-sm" onClick={onHistory}>
              历史记录
            </Button>
            {showContactButton ? <ContactTeacherButton /> : null}
            <Button variant="primary" size="sm" className="sm:h-10 sm:px-3.5 sm:text-sm" onClick={onStart}>
              开始训练
            </Button>
            <Button variant="default" size="sm" className="sm:h-10 sm:px-3.5 sm:text-sm" onClick={logout}>
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
