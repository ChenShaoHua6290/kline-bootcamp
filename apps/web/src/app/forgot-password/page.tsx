'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/auth/forgot-password', { email: email.trim() })).data,
    onSuccess: () => setMessage('如果该邮箱已注册，我们已发送重置密码邮件'),
    onError: () => setMessage('如果该邮箱已注册，我们已发送重置密码邮件'),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    mutation.mutate();
  };

  return (
    <main className="relative mx-auto flex min-h-dvh w-full flex-col items-center justify-center overflow-x-hidden bg-[#020617] px-3 py-6 text-slate-100 sm:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_8%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(59,130,246,0.13),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.9))]" />
      <Card className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-[18px] border-cyan-400/20 bg-[linear-gradient(145deg,rgba(16,25,42,0.96),rgba(8,14,26,0.99))] shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_24px_70px_rgba(2,6,23,0.68)]">
        <CardBody className="p-5 sm:p-6">
          <div className="mb-5">
            <div className="mb-2 inline-flex items-center rounded-md border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-cyan-200">
              只做一种模式
            </div>
            <h1 className="text-[22px] font-semibold leading-tight text-slate-50">找回密码</h1>
            <p className="mt-2 text-[13px] leading-6 text-slate-400">输入注册邮箱，我们会发送一封重置密码邮件。</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold leading-4 text-slate-300">邮箱</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                className="h-[46px] rounded-xl px-3 !text-[16px] md:h-11 md:!text-[15px]"
              />
              <p className="mt-1 text-[11px] leading-4 text-slate-500">请填写注册账号时使用的邮箱。</p>
            </label>
            <Button type="submit" variant="primary" size="lg" className="h-[46px] w-full rounded-xl !text-[16px] font-semibold md:h-11 md:!text-[15px]" disabled={mutation.isPending}>
              {mutation.isPending ? '提交中...' : '发送重置邮件'}
            </Button>
          </form>

          {message ? <p className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-[13px] leading-5 text-cyan-100">{message}</p> : null}

          <Link className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-1.5 text-[13px] font-semibold text-cyan-300 transition hover:text-cyan-200" href="/auth">
            返回登录
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}
