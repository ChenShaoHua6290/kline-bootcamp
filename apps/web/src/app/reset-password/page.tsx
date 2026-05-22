'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PASSWORD_STRENGTH_HINT, isPasswordStrong } from '@/lib/password';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post('/auth/reset-password', { token, newPassword, confirmPassword })).data as { message: string },
    onSuccess: (data) => {
      setMessage(data.message || '密码已重置，请重新登录');
      setError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join('，') : msg || '链接已过期或无效');
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('链接已过期或无效');
      return;
    }
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
          <h1 className="text-lg font-semibold text-slate-100">重置密码</h1>
          <form className="space-y-3" onSubmit={onSubmit}>
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
              {mutation.isPending ? '提交中...' : '重置密码'}
            </Button>
          </form>
          {error ? <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
          {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
          <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/auth">
            返回登录
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}
