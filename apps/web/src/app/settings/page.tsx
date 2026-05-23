'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearAuthSession, getToken } from '@/lib/auth';
import { PASSWORD_STRENGTH_HINT, isPasswordStrong } from '@/lib/password';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function SettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) router.replace('/auth');
  }, [router]);

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword })).data as { message: string },
    onSuccess: (data) => {
      setMessage(data.message || '密码修改成功');
      setError('');
      clearAuthSession();
      setTimeout(() => router.push('/auth'), 1200);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join('，') : msg || '密码修改失败');
      setMessage('');
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    if (!isPasswordStrong(newPassword)) {
      setError(PASSWORD_STRENGTH_HINT);
      return;
    }
    mutation.mutate();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-slate-100">修改密码</h1>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => router.push('/')}>
              返回首页
            </Button>
          </div>
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">当前密码</span>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">新密码</span>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">确认新密码</span>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </label>
            <p className="text-xs text-slate-400">{PASSWORD_STRENGTH_HINT}</p>
            <Button type="submit" variant="primary" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? '提交中...' : '修改密码'}
            </Button>
          </form>
          {error ? <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
          {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
        </CardBody>
      </Card>
    </main>
  );
}
