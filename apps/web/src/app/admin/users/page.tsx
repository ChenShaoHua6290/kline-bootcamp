'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { NoticeModal } from '@/components/NoticeModal';
import { PASSWORD_STRENGTH_HINT, isPasswordStrong } from '@/lib/password';

export default function AdminUsersPage() {
  const router = useRouter();
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let randomPart = '';
    for (let i = 0; i < 10; i += 1) {
      randomPart += chars[Math.floor(Math.random() * chars.length)];
    }
    return `Tmp${randomPart}9`;
  };

  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [pendingBanId, setPendingBanId] = useState<string | null>(null);
  const [pendingUnbanId, setPendingUnbanId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    tone: 'info',
  });
  const [accessActionModal, setAccessActionModal] = useState<{
    open: boolean;
    row: AdminUserRow | null;
    action: 'renew_monthly' | 'to_internal' | 'grant_full' | null;
    remark: string;
    extendMonths: number;
  }>({
    open: false,
    row: null,
    action: null,
    remark: '',
    extendMonths: 1,
  });
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    open: boolean;
    row: AdminUserRow | null;
    newPassword: string;
    confirmPassword: string;
    generatedPassword: string;
  }>({
    open: false,
    row: null,
    newPassword: '',
    confirmPassword: '',
    generatedPassword: '',
  });
  const queryClient = useQueryClient();
  const token = getToken();
  const user = getAuthUser();
  const usersQuery = useQuery({
    queryKey: ['admin-users', searchKeyword],
    enabled: Boolean(token && user?.role === 'ADMIN'),
    queryFn: async () => (await api.get<AdminUserRow[]>('/admin/users', { params: searchKeyword.trim() ? { q: searchKeyword.trim() } : undefined })).data,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const reload = () => {
    setSearchKeyword(keyword);
    usersQuery.refetch();
  };

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

  const updateAccessMutation = useMutation({
    mutationFn: async (payload: { userId: string; body: Record<string, unknown> }) =>
      (await api.patch(`/admin/users/${payload.userId}/access`, payload.body)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      reload();
      setToast({ open: true, message: '权限已更新', tone: 'success' });
      setAccessActionModal({ open: false, row: null, action: null, remark: '', extendMonths: 1 });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setToast({ open: true, message: Array.isArray(msg) ? msg.join('，') : msg || '权限更新失败', tone: 'error' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: { userId: string; newPassword: string; confirmPassword: string }) =>
      (await api.patch(`/admin/users/${payload.userId}/reset-password`, { newPassword: payload.newPassword, confirmPassword: payload.confirmPassword })).data,
    onSuccess: () => {
      setToast({ open: true, message: '用户密码已重置', tone: 'success' });
      setResetPasswordModal({ open: false, row: null, newPassword: '', confirmPassword: '', generatedPassword: '' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setToast({ open: true, message: Array.isArray(msg) ? msg.join('，') : msg || '重置密码失败', tone: 'error' });
    },
  });

  const openAccessActionModal = (row: AdminUserRow, action: 'renew_monthly' | 'to_internal' | 'grant_full') => {
    setAccessActionModal({
      open: true,
      row,
      action,
      remark: action === 'renew_monthly' ? '后台手动月续费' : action === 'grant_full' ? '后台开通完整课程权限' : '后台设为内部用户',
      extendMonths: 1,
    });
  };

  const confirmAccessAction = () => {
    if (!accessActionModal.row || !accessActionModal.action) return;
    const remark = accessActionModal.remark.trim() || undefined;
    if (accessActionModal.action === 'renew_monthly') {
      updateAccessMutation.mutate({
        userId: accessActionModal.row.id,
        body: { accessType: 'PAID', plan: 'MONTHLY', extendMonths: accessActionModal.extendMonths, disabled: false, remark },
      });
      return;
    }
    if (accessActionModal.action === 'grant_full') {
      updateAccessMutation.mutate({
        userId: accessActionModal.row.id,
        body: { learningAccessLevel: 'FULL', disabled: false, remark },
      });
      return;
    }
    updateAccessMutation.mutate({
      userId: accessActionModal.row.id,
      body: { accessType: 'INTERNAL', disabled: false, remark },
    });
  };

  const confirmResetPassword = () => {
    if (!resetPasswordModal.row) return;
    if (resetPasswordModal.newPassword !== resetPasswordModal.confirmPassword) {
      setToast({ open: true, message: '两次密码不一致', tone: 'error' });
      return;
    }
    if (!isPasswordStrong(resetPasswordModal.newPassword)) {
      setToast({ open: true, message: PASSWORD_STRENGTH_HINT, tone: 'error' });
      return;
    }
    resetPasswordMutation.mutate({
      userId: resetPasswordModal.row.id,
      newPassword: resetPasswordModal.newPassword,
      confirmPassword: resetPasswordModal.confirmPassword,
    });
  };

  return (
    <AdminLayout title="用户管理">
      <PageHeader>
        <div>
          <PageTitle>用户管理</PageTitle>
          <PageDescription>可按昵称或邮箱检索用户并执行封禁/解封操作。</PageDescription>
        </div>
      </PageHeader>
      <Card className="mb-3 p-4">
        <div className="flex items-center gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索昵称或邮箱..."
            autoComplete="off"
            name="admin-user-search"
          />
          <Button variant="default" className="h-9 min-w-[74px] whitespace-nowrap px-3" onClick={() => reload()}>
            搜索
          </Button>
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
          onAccessAction={(row, action) => {
            if (action === 'renew_monthly') {
              openAccessActionModal(row, 'renew_monthly');
              return;
            }
            if (action === 'to_internal') {
              openAccessActionModal(row, 'to_internal');
              return;
            }
            if (action === 'grant_full') {
              openAccessActionModal(row, 'grant_full');
              return;
            }
          }}
          onResetPassword={(row) => setResetPasswordModal({ open: true, row, newPassword: '', confirmPassword: '', generatedPassword: '' })}
          onViewHistory={(row) => {
            const label = (row.nickname || row.email || '').trim();
            const qs = new URLSearchParams({
              adminUserId: row.id,
              from: 'admin-users',
              label,
            });
            router.push(`/history?${qs.toString()}`);
          }}
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
      <NoticeModal
        open={accessActionModal.open}
        title={accessActionModal.action === 'renew_monthly' ? '确认月续费' : accessActionModal.action === 'grant_full' ? '确认开通完整课程' : '确认设为内部用户'}
        message={
          accessActionModal.row
            ? accessActionModal.action === 'renew_monthly'
              ? `将为用户「${accessActionModal.row.nickname || accessActionModal.row.email}」续费 ${accessActionModal.extendMonths} 个月。`
              : accessActionModal.action === 'grant_full'
                ? `将为用户「${accessActionModal.row.nickname || accessActionModal.row.email}」开通完整课程、课件、指标说明和共振提醒权限。`
              : `将把用户「${accessActionModal.row.nickname || accessActionModal.row.email}」设为内部用户并解除到期限制。`
            : ''
        }
        tone="warning"
        confirmText={updateAccessMutation.isPending ? '提交中...' : '确认'}
        cancelText="取消"
        onClose={() => {
          if (updateAccessMutation.isPending) return;
          setAccessActionModal({ open: false, row: null, action: null, remark: '', extendMonths: 1 });
        }}
        onConfirm={confirmAccessAction}
        maskClosable={!updateAccessMutation.isPending}
      >
        <div className="mt-3">
          {accessActionModal.action === 'renew_monthly' ? (
            <div className="mb-3">
              <label className="mb-1 block text-xs text-slate-300">续费时长</label>
              <select
                className="w-full rounded-xl border border-slate-600/80 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60"
                value={accessActionModal.extendMonths}
                onChange={(e) => setAccessActionModal((prev) => ({ ...prev, extendMonths: Number(e.target.value) || 1 }))}
                disabled={updateAccessMutation.isPending}
              >
                <option value={1}>1 个月</option>
                <option value={3}>3 个月</option>
                <option value={6}>6 个月</option>
                <option value={12}>12 个月</option>
              </select>
            </div>
          ) : null}
          <label className="mb-1 block text-xs text-slate-300">备注（可选）</label>
          <Input
            value={accessActionModal.remark}
            onChange={(e) => setAccessActionModal((prev) => ({ ...prev, remark: e.target.value }))}
            placeholder="请输入备注"
            disabled={updateAccessMutation.isPending}
          />
        </div>
      </NoticeModal>
      <NoticeModal
        open={resetPasswordModal.open}
        title="重置用户密码"
        message={resetPasswordModal.row ? `请为用户「${resetPasswordModal.row.nickname || resetPasswordModal.row.email}」设置新密码。` : ''}
        tone="warning"
        confirmText={resetPasswordMutation.isPending ? '提交中...' : '确认重置'}
        cancelText="取消"
        onClose={() => {
          if (resetPasswordMutation.isPending) return;
          setResetPasswordModal({ open: false, row: null, newPassword: '', confirmPassword: '', generatedPassword: '' });
        }}
        onConfirm={confirmResetPassword}
        maskClosable={!resetPasswordMutation.isPending}
      >
        <div className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 whitespace-nowrap rounded-lg px-2.5 py-0 text-[11px]"
              disabled={resetPasswordMutation.isPending}
              onClick={() => {
                const temp = generateTempPassword();
                setResetPasswordModal((prev) => ({ ...prev, newPassword: temp, confirmPassword: temp, generatedPassword: temp }));
              }}
            >
              生成临时密码
            </Button>
          </div>
          {resetPasswordModal.generatedPassword ? (
            <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2">
              <div className="mb-1 text-xs text-emerald-200">本次生成的临时密码</div>
              <div className="break-all font-mono text-sm text-emerald-100">{resetPasswordModal.generatedPassword}</div>
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 whitespace-nowrap rounded-lg px-2.5 py-0 text-[11px]"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resetPasswordModal.generatedPassword);
                      setToast({ open: true, message: '临时密码已复制', tone: 'success' });
                    } catch {
                      setToast({ open: true, message: '复制失败，请手动复制', tone: 'error' });
                    }
                  }}
                >
                  复制密码
                </Button>
              </div>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs text-slate-300">新密码</label>
            <Input
              type="password"
              value={resetPasswordModal.newPassword}
              onChange={(e) => setResetPasswordModal((prev) => ({ ...prev, newPassword: e.target.value }))}
              placeholder="请输入新密码"
              autoComplete="new-password"
              name="admin-reset-new-password"
              disabled={resetPasswordMutation.isPending}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-300">确认新密码</label>
            <Input
              type="password"
              value={resetPasswordModal.confirmPassword}
              onChange={(e) => setResetPasswordModal((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="请再次输入新密码"
              autoComplete="new-password"
              name="admin-reset-confirm-password"
              disabled={resetPasswordMutation.isPending}
            />
          </div>
          <p className="text-xs text-slate-400">{PASSWORD_STRENGTH_HINT}</p>
        </div>
      </NoticeModal>
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </AdminLayout>
  );
}
