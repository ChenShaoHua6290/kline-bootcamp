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
    <main className="relative mx-auto flex min-h-dvh w-full flex-col items-center justify-center overflow-x-hidden bg-[#020617] px-3 py-6 text-slate-100 sm:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_8%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(59,130,246,0.13),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.9))]" />
      <Card className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[18px] border-cyan-400/20 bg-[linear-gradient(145deg,rgba(16,25,42,0.96),rgba(8,14,26,0.99))] shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_24px_70px_rgba(2,6,23,0.68)]">
        <CardBody className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center rounded-md border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-cyan-200">
                账号安全
              </div>
              <h1 className="text-[22px] font-semibold leading-tight text-slate-50">修改密码</h1>
              <p className="mt-2 text-[13px] leading-6 text-slate-400">修改成功后需要重新登录。</p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 rounded-xl px-3 text-xs" onClick={() => router.push('/')}>
              返回首页
            </Button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold leading-4 text-slate-300">当前密码</span>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-[46px] rounded-xl px-3 !text-[16px] md:h-11 md:!text-[15px]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold leading-4 text-slate-300">新密码</span>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="至少 8 位，字母 + 数字"
                autoComplete="new-password"
                className="h-[46px] rounded-xl px-3 !text-[16px] md:h-11 md:!text-[15px]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold leading-4 text-slate-300">确认新密码</span>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-[46px] rounded-xl px-3 !text-[16px] md:h-11 md:!text-[15px]"
              />
              <p className="mt-1 text-[11px] leading-4 text-slate-500">{PASSWORD_STRENGTH_HINT}</p>
            </label>

            <Button type="submit" variant="primary" size="lg" className="h-[46px] w-full rounded-xl !text-[16px] font-semibold md:h-11 md:!text-[15px]" disabled={mutation.isPending}>
              {mutation.isPending ? '提交中...' : '修改密码'}
            </Button>
          </form>

          {error ? <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[13px] leading-5 text-rose-200">{error}</p> : null}
          {message ? <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-[13px] leading-5 text-emerald-200">{message}</p> : null}
        </CardBody>
      </Card>
    </main>
  );
}
