'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getAuthUser, getToken } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BanUserModal } from '@/components/admin/BanUserModal';
import { AdminUserRow, UserManagementTable } from '@/components/admin/UserManagementTable';
import { Toast } from '@/components/ui/Toast';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageDescription, PageHeader, PageTitle } from '@/components/ui/PageHeader';

export default function AdminUsersPage() {
  const [keyword, setKeyword] = useState('');
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [pendingBanId, setPendingBanId] = useState<string | null>(null);
  const [pendingUnbanId, setPendingUnbanId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    tone: 'info',
  });
  const queryClient = useQueryClient();
  const token = getToken();
  const user = getAuthUser();
  const usersQuery = useQuery({
    queryKey: ['admin-users', keyword],
    enabled: Boolean(token && user?.role === 'ADMIN'),
    queryFn: async () => (await api.get<AdminUserRow[]>('/admin/users', { params: keyword.trim() ? { q: keyword.trim() } : undefined })).data,
  });

  const rows = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const reload = () => usersQuery.refetch();

  const banMutation = useMutation({
    mutationFn: async (payload: { userId: string; reason: string }) =>
      (await api.patch(`/admin/users/${payload.userId}/ban`, { reason: payload.reason })).data,
    onMutate: (payload) => setPendingBanId(payload.userId),
    onSuccess: () => {
      setBanTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      reload();
      setToast({ open: true, message: '用户已封禁', tone: 'success' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join('，') : msg || '封禁失败';
      setToast({ open: true, message: text, tone: 'error' });
    },
    onSettled: () => setPendingBanId(null),
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => (await api.patch(`/admin/users/${userId}/unban`)).data,
    onMutate: (userId) => setPendingUnbanId(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      reload();
      setToast({ open: true, message: '用户已解封', tone: 'success' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join('，') : msg || '解封失败';
      setToast({ open: true, message: text, tone: 'error' });
    },
    onSettled: () => setPendingUnbanId(null),
  });

  return (
    <AdminLayout title="用户管理">
      <PageHeader>
        <div>
          <PageTitle className="text-base sm:text-lg">用户管理</PageTitle>
          <PageDescription>可按邮箱检索用户并执行封禁/解封操作。</PageDescription>
        </div>
      </PageHeader>
      <Card className="mb-2 p-3">
        <div className="flex items-center gap-2">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索邮箱..." />
          <Button variant="default" onClick={() => reload()}>搜索</Button>
        </div>
      </Card>

      {usersQuery.isLoading ? <LoadingState message="用户列表加载中..." /> : null}
      {usersQuery.isError ? <ErrorState message="用户列表加载失败，请重试" /> : null}
      {!usersQuery.isLoading && !usersQuery.isError ? (
        <UserManagementTable
          rows={rows}
          pendingBanId={pendingBanId}
          pendingUnbanId={pendingUnbanId}
          onBan={(row) => setBanTarget(row)}
          onUnban={(row) => unbanMutation.mutate(row.id)}
        />
      ) : null}

      <BanUserModal
        open={Boolean(banTarget)}
        email={banTarget?.email}
        submitting={banMutation.isPending}
        onClose={() => setBanTarget(null)}
        onConfirm={(reason) => {
          if (!banTarget) return;
          banMutation.mutate({ userId: banTarget.id, reason });
        }}
      />
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </AdminLayout>
  );
}
