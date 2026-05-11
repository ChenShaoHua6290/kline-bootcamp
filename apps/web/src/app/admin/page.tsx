'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getAuthUser, getToken } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminSummary, AdminSummaryCards } from '@/components/admin/AdminSummaryCards';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageDescription, PageHeader, PageTitle } from '@/components/ui/PageHeader';

export default function AdminHomePage() {
  const token = getToken();
  const user = getAuthUser();
  const summaryQuery = useQuery({
    queryKey: ['admin-summary'],
    enabled: Boolean(token && user?.role === 'ADMIN'),
    queryFn: async () => (await api.get<AdminSummary>('/admin/summary')).data,
  });

  return (
    <AdminLayout title="后台概览">
      <PageHeader>
        <div>
          <PageTitle>管理总览</PageTitle>
          <PageDescription>实时查看用户、封禁和邀请码使用情况。</PageDescription>
        </div>
      </PageHeader>
      {summaryQuery.isLoading ? <LoadingState message="正在加载后台概览..." /> : null}
      {summaryQuery.isError ? <ErrorState message="加载后台概览失败，请稍后重试。" /> : null}
      <AdminSummaryCards summary={summaryQuery.data} />
    </AdminLayout>
  );
}
