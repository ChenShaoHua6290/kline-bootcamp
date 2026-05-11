'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthUser, getToken } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { AdminSidebar } from './AdminSidebar';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageTitle } from '@/components/ui/PageHeader';

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

  if (!ready || !isAdmin) {
    return (
      <main className="p-6">
        <LoadingState message="正在校验管理员权限..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-3 sm:p-4">
      <header className="app-nav mb-4">
        <div className="flex items-center justify-between gap-3">
          <PageTitle className="text-lg sm:text-xl">{title}</PageTitle>
          <Link href="/" className="shrink-0">
            <Button variant="ghost" size='sm' className="hover:shadow-[0_8px_20px_rgba(2,132,199,0.22)]">返回首页</Button>
          </Link>
        </div>
      </header>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <AdminSidebar />
        <div className="min-w-0">{children}</div>
      </section>
    </main>
  );
}
