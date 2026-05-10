'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getAuthUser, getToken } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InvitationCodeFormModal } from '@/components/admin/InvitationCodeFormModal';
import { InvitationCodeTable, type InvitationRow } from '@/components/admin/InvitationCodeTable';
import { Toast } from '@/components/ui/Toast';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageDescription, PageHeader, PageTitle } from '@/components/ui/PageHeader';

export default function AdminInvitationsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    tone: 'info',
  });
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const token = getToken();
  const user = getAuthUser();
  const invitationsQuery = useQuery({
    queryKey: ['admin-invitations'],
    enabled: Boolean(token && user?.role === 'ADMIN'),
    queryFn: async () => (await api.get<InvitationRow[]>('/admin/invitations')).data,
  });

  const reload = () => invitationsQuery.refetch();

  const createMutation = useMutation({
    mutationFn: async (payload: { code: string; maxUses: number; expiresAt?: string; isActive: boolean }) =>
      (await api.post('/admin/invitations', payload)).data,
    onSuccess: () => {
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      reload();
      setToast({ open: true, message: '邀请码创建成功', tone: 'success' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join('，') : msg || '创建失败';
      setError(text);
      setToast({ open: true, message: text, tone: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; isActive: boolean }) =>
      (await api.patch(`/admin/invitations/${payload.id}`, { isActive: payload.isActive })).data,
    onMutate: (payload) => setPendingToggleId(payload.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      reload();
      setToast({ open: true, message: '邀请码状态已更新', tone: 'success' });
    },
    onError: () => setToast({ open: true, message: '邀请码状态更新失败', tone: 'error' }),
    onSettled: () => setPendingToggleId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/admin/invitations/${id}`)).data,
    onMutate: (id) => setPendingDeleteId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      reload();
      setToast({ open: true, message: '邀请码已删除', tone: 'success' });
    },
    onError: () => setToast({ open: true, message: '邀请码删除失败', tone: 'error' }),
    onSettled: () => setPendingDeleteId(null),
  });

  return (
    <AdminLayout title="邀请码管理">
      <PageHeader>
        <div>
          <PageTitle className="text-base sm:text-lg">邀请码管理</PageTitle>
          <PageDescription>创建、启停、维护邀请码有效期和使用次数。</PageDescription>
        </div>
      </PageHeader>
      <Card className="mb-3 p-1">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-300">管理邀请码的创建、启用、停用与删除。</div>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>创建邀请码</Button>
        </div>
        {error ? <div className="mt-2 text-sm text-rose-300">{error}</div> : null}
      </Card>

      {invitationsQuery.isLoading ? <LoadingState message="邀请码加载中..." /> : null}
      {invitationsQuery.isError ? <ErrorState message="邀请码加载失败，请重试" /> : null}
      {!invitationsQuery.isLoading && !invitationsQuery.isError ? (
        <InvitationCodeTable
          rows={invitationsQuery.data ?? []}
          pendingToggleId={pendingToggleId}
          pendingDeleteId={pendingDeleteId}
          onToggleActive={(row) => updateMutation.mutate({ id: row.id, isActive: !row.isActive })}
          onDelete={(row) => deleteMutation.mutate(row.id)}
        />
      ) : null}

      <InvitationCodeFormModal
        open={createOpen}
        submitting={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(val) => {
          setError('');
          createMutation.mutate(val);
        }}
      />
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </AdminLayout>
  );
}
