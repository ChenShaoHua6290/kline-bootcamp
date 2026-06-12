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
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { PageDescription, PageHeader, PageTitle } from '@/components/ui/PageHeader';
import { NoticeModal } from '@/components/NoticeModal';
import { PASSWORD_STRENGTH_HINT, isPasswordStrong } from '@/lib/password';
import { CourseAccessLevel, formatAccessLevel } from '@/lib/courses/types';

type UserCourseAccessCourse = {
  id: string;
  title: string;
  subtitle?: string | null;
  status: string;
  sortOrder: number;
  accessLevel: CourseAccessLevel;
};

type UserCourseAccessResponse = {
  userId: string;
  isInternal: boolean;
  courses: UserCourseAccessCourse[];
};

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
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [pendingBanId, setPendingBanId] = useState<string | null>(null);
  const [pendingUnbanId, setPendingUnbanId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    tone: 'info',
  });
  const [accessActionModal, setAccessActionModal] = useState<{
    open: boolean;
    row: AdminUserRow | null;
    action: 'renew_monthly' | 'to_internal' | null;
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
  const [courseAccessModal, setCourseAccessModal] = useState<{
    open: boolean;
    row: AdminUserRow | null;
    values: Record<string, CourseAccessLevel>;
  }>({
    open: false,
    row: null,
    values: {},
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
  const courseAccessQuery = useQuery({
    queryKey: ['admin-user-course-access', courseAccessModal.row?.id],
    enabled: Boolean(courseAccessModal.open && courseAccessModal.row?.id),
    queryFn: async () => (await api.get<UserCourseAccessResponse>(`/admin/users/${courseAccessModal.row?.id}/course-access`)).data,
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

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => (await api.delete(`/admin/users/${userId}`)).data,
    onMutate: (userId) => setPendingDeleteId(userId),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      reload();
      setToast({ open: true, message: '用户已删除', tone: 'success' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join('，') : msg || '删除失败';
      setToast({ open: true, message: text, tone: 'error' });
    },
    onSettled: () => setPendingDeleteId(null),
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

  const updateCourseAccessMutation = useMutation({
    mutationFn: async (payload: { userId: string; items: Array<{ courseId: string; accessLevel: CourseAccessLevel }> }) =>
      (await api.patch(`/admin/users/${payload.userId}/course-access`, { items: payload.items })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-course-access'] });
      setToast({ open: true, message: '课程权限已更新', tone: 'success' });
      setCourseAccessModal({ open: false, row: null, values: {} });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setToast({ open: true, message: Array.isArray(msg) ? msg.join('，') : msg || '课程权限更新失败', tone: 'error' });
    },
  });

  const openAccessActionModal = (row: AdminUserRow, action: 'renew_monthly' | 'to_internal') => {
    setAccessActionModal({
      open: true,
      row,
      action,
      remark: action === 'renew_monthly' ? '后台手动月续费' : '后台设为内部用户',
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

  const openCourseAccessModal = (row: AdminUserRow) => {
    setCourseAccessModal({ open: true, row, values: {} });
  };

  const closeCourseAccessModal = () => {
    if (updateCourseAccessMutation.isPending) return;
    setCourseAccessModal({ open: false, row: null, values: {} });
  };

  const setCourseAccessValue = (courseId: string, accessLevel: CourseAccessLevel) => {
    setCourseAccessModal((prev) => ({ ...prev, values: { ...prev.values, [courseId]: accessLevel } }));
  };

  const courseAccessLevelFor = (course: UserCourseAccessCourse) => courseAccessModal.values[course.id] ?? course.accessLevel;

  const confirmCourseAccess = () => {
    if (!courseAccessModal.row || !courseAccessQuery.data) return;
    updateCourseAccessMutation.mutate({
      userId: courseAccessModal.row.id,
      items: courseAccessQuery.data.courses.map((course) => ({
        courseId: course.id,
        accessLevel: courseAccessLevelFor(course),
      })),
    });
  };

  return (
    <AdminLayout title="用户管理">
      <PageHeader>
        <div>
          <PageTitle>用户管理</PageTitle>
          <PageDescription>可按昵称或邮箱检索用户，并配置训练套餐、课程权限与账号状态。</PageDescription>
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
          pendingDeleteId={pendingDeleteId}
          onBan={(row) => setBanTarget(row)}
          onUnban={(row) => unbanMutation.mutate(row.id)}
          onDelete={(row) => setDeleteTarget(row)}
          onAccessAction={(row, action) => {
            if (action === 'renew_monthly') {
              openAccessActionModal(row, 'renew_monthly');
              return;
            }
            if (action === 'to_internal') {
              openAccessActionModal(row, 'to_internal');
              return;
            }
          }}
          onCourseAccess={(row) => openCourseAccessModal(row)}
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
        open={Boolean(deleteTarget)}
        title="确认删除用户"
        message={deleteTarget ? `将删除用户「${deleteTarget.nickname || deleteTarget.email}」。删除后该用户不会出现在用户列表，也不会参与实时排行榜统计。` : ''}
        tone="error"
        confirmText={deleteMutation.isPending ? '删除中...' : '确认删除'}
        cancelText="取消"
        onClose={() => {
          if (deleteMutation.isPending) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget || deleteMutation.isPending) return;
          deleteMutation.mutate(deleteTarget.id);
        }}
        maskClosable={!deleteMutation.isPending}
      />
      <NoticeModal
        open={accessActionModal.open}
        title={accessActionModal.action === 'renew_monthly' ? '确认月续费' : '确认设为内部用户'}
        message={
          accessActionModal.row
            ? accessActionModal.action === 'renew_monthly'
              ? `将为用户「${accessActionModal.row.nickname || accessActionModal.row.email}」续费 ${accessActionModal.extendMonths} 个月。`
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
      <Modal open={courseAccessModal.open} onClose={closeCourseAccessModal} className="max-w-3xl">
        <div className="border-b border-slate-700/70 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-100">课程权限</div>
              <div className="mt-1 text-xs text-slate-400">{courseAccessModal.row ? courseAccessModal.row.nickname || courseAccessModal.row.email : ''}</div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 px-0" onClick={closeCourseAccessModal}>×</Button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {courseAccessQuery.isLoading ? <LoadingState message="课程权限加载中..." /> : null}
          {courseAccessQuery.isError ? <ErrorState message="课程权限加载失败，请重试" /> : null}
          {courseAccessQuery.data?.isInternal ? (
            <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              内部用户课程不限制，默认可查看所有课程和内部课时。
            </div>
          ) : null}
          {courseAccessQuery.data && !courseAccessQuery.data.isInternal ? (
            <div className="space-y-2">
              {courseAccessQuery.data.courses.map((course) => (
                <div key={course.id} className="grid gap-2 rounded-xl border border-slate-700/75 bg-slate-900/55 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{course.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{course.subtitle || course.status}</div>
                  </div>
                  <Select value={courseAccessLevelFor(course)} onChange={(e) => setCourseAccessValue(course.id, e.target.value as CourseAccessLevel)} disabled={updateCourseAccessMutation.isPending}>
                    <option value="PREVIEW">{formatAccessLevel('PREVIEW')}</option>
                    <option value="TRAINING">{formatAccessLevel('TRAINING')}</option>
                    <option value="FULL">{formatAccessLevel('FULL')}</option>
                    <option value="INTERNAL">{formatAccessLevel('INTERNAL')}</option>
                  </Select>
                </div>
              ))}
              {courseAccessQuery.data.courses.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-slate-400">暂无课程。</div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-700/70 px-5 py-4">
          <Button variant="default" onClick={closeCourseAccessModal} disabled={updateCourseAccessMutation.isPending}>取消</Button>
          <Button variant="primary" onClick={confirmCourseAccess} disabled={updateCourseAccessMutation.isPending || !courseAccessQuery.data || courseAccessQuery.data.isInternal}>
            {updateCourseAccessMutation.isPending ? '保存中...' : '保存课程权限'}
          </Button>
        </div>
      </Modal>
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
