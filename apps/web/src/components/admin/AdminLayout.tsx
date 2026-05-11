'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthUser, getToken } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { AdminSidebar } from './AdminSidebar';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getAuthUser();
    const authedAdmin = Boolean(token && user && user.role === 'ADMIN');
    setIsAdmin(authedAdmin);
    setReady(true);

    if (!token || !user) {
      router.replace('/auth');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [router]);

  // Keep SSR and first client render identical to prevent hydration mismatch.
  if (!ready || !isAdmin) {
    return (
      <main className="p-6">
        <LoadingState message="正在校验管理员权限..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-3 sm:p-4">
      <header className="app-nav mb-3">
        <div>
          <h1 className="app-title text-sm sm:text-base">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="default" size='sm'>返回首页</Button>
          </Link>
        </div>
      </header>
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[220px_minmax(0,1fr)]">
        <AdminSidebar />
        <div className="min-w-0">{children}</div>
      </section>
    </main>
  );
}
