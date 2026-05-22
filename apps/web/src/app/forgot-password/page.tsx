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
    <main className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4 p-5">
          <h1 className="text-lg font-semibold text-slate-100">忘记密码</h1>
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">邮箱</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </label>
            <Button type="submit" variant="primary" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? '提交中...' : '发送重置邮件'}
            </Button>
          </form>
          {message ? <p className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">{message}</p> : null}
          <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/auth">
            返回登录
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}
