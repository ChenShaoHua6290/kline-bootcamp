'use client';

import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setAuthSession, setRefreshToken } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageDescription, PageTitle } from '@/components/ui/PageHeader';
import { ContactTeacherModal } from '@/components/contact/ContactTeacherModal';
import { Toast } from '@/components/ui/Toast';
import { resolveAdminWechatId, resolveAdminWechatQr } from '@/lib/contact';

type Mode = 'login' | 'register';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: 'USER' | 'ADMIN' };
};

function normalizeAuthErrorToZh(msg: string | undefined, mode: Mode) {
  if (!msg) return mode === 'login' ? '登录失败，请稍后重试' : '注册失败，请稍后重试';
  const text = msg.toLowerCase();

  if (text.includes('invalid credentials') || text.includes('unauthorized')) return '邮箱或密码错误';
  if (text.includes('banned')) return '账号已被封禁，请联系管理员';
  if (text.includes('email already') || text.includes('already exists') || text.includes('duplicate')) return '该邮箱已注册，请直接登录';
  if (text.includes('invite') && text.includes('required')) return '注册需要填写邀请码';
  if (text.includes('invite') && (text.includes('invalid') || text.includes('not found'))) return '邀请码无效，请检查后重试';
  if (text.includes('invite') && (text.includes('expired') || text.includes('inactive'))) return '邀请码已失效，请联系管理员';
  if (text.includes('invite') && (text.includes('max') || text.includes('limit') || text.includes('used up'))) return '邀请码使用次数已达上限';
  if (text.includes('too many requests') || text.includes('throttle')) return '请求过于频繁，请稍后再试';

  return msg;
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    tone: 'info',
  });
  const router = useRouter();
  const wechatId = resolveAdminWechatId();
  const qrPath = resolveAdminWechatQr();

  const copyWechat = async () => {
    if (!wechatId) {
      setToast({ open: true, message: '未配置微信号', tone: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(wechatId);
      setToast({ open: true, message: '微信号已复制', tone: 'success' });
    } catch {
      setToast({ open: true, message: '复制失败，请手动复制', tone: 'error' });
    }
  };

  const mutation = useMutation({
    mutationFn: async (payload: { email: string; password: string; mode: Mode; inviteCode?: string }) => {
      const endpoint = payload.mode === 'login' ? '/auth/login' : '/auth/register';
      const resp = await api.post<AuthResponse>(endpoint, {
        email: payload.email,
        password: payload.password,
        inviteCode: payload.inviteCode,
      });
      return resp.data;
    },
    onSuccess: (data) => {
      setAuthSession(data.accessToken, data.user);
      setRefreshToken(data.refreshToken);
      router.push('/');
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (Array.isArray(msg)) {
        setErrorMessage(msg.map((item) => normalizeAuthErrorToZh(item, mode)).join('，'));
        return;
      }
      setErrorMessage(normalizeAuthErrorToZh(typeof msg === 'string' ? msg : undefined, mode));
    },
  });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    mutation.mutate({ email: email.trim(), password, mode, inviteCode: mode === 'register' ? inviteCode.trim() : undefined });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
      <Card className="w-full">
        <CardBody className="p-7 sm:p-8">
        <PageTitle className="text-2xl">欢迎使用 K 线训练</PageTitle>
        <PageDescription className="text-slate-300">登录后即可开始双盲训练。</PageDescription>

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
          <Button type="button" variant={mode === 'login' ? 'primary' : 'default'} onClick={() => setMode('login')}>
            登录
          </Button>
          <Button type="button" variant={mode === 'register' ? 'primary' : 'default'} onClick={() => setMode('register')}>
            注册
          </Button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block text-sm">
            <span className="field-label mb-1.5 block">邮箱</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm">
            <span className="field-label mb-1.5 block">密码（至少 6 位）</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="******"
            />
          </label>

          {mode === 'register' ? (
            <label className="block text-sm">
              <span className="field-label mb-1.5 block">邀请码（必填）</span>
              <Input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                placeholder="请输入邀请码"
              />
            </label>
          ) : null}

          {errorMessage ? (
            <div className="space-y-2">
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="text-xs text-cyan-300 hover:text-cyan-200"
              >
                如需帮助，请联系管理员
              </button>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={mutation.isPending}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {mutation.isPending ? '提交中...' : mode === 'login' ? '登录' : '注册并登录'}
          </Button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="text-xs text-slate-400 underline-offset-4 hover:text-cyan-300 hover:underline"
            >
              联系管理员
            </button>
          </div>
        </form>
        </CardBody>
      </Card>
      <ContactTeacherModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        wechatId={wechatId}
        qrPath={qrPath}
        onCopy={copyWechat}
        title="联系管理员"
        description="如果你遇到账号登录、邀请码、封禁等问题，请通过微信联系管理员。"
        emptyText="暂未配置二维码，请联系平台管理员。"
      />
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </main>
  );
}
