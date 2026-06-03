'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
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
import { PASSWORD_STRENGTH_HINT } from '@/lib/password';
import { IcpFooter } from '@/components/IcpFooter';

type Mode = 'login' | 'register';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; nickname?: string | null; role: 'USER' | 'ADMIN' };
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
  const [nickname, setNickname] = useState('');
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
    mutationFn: async (payload: { email: string; password: string; mode: Mode; inviteCode?: string; nickname?: string }) => {
      const endpoint = payload.mode === 'login' ? '/auth/login' : '/auth/register';
      const resp = await api.post<AuthResponse>(endpoint, {
        email: payload.email,
        password: payload.password,
        inviteCode: payload.inviteCode,
        nickname: payload.nickname,
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
    mutation.mutate({
      email: email.trim(),
      password,
      mode,
      inviteCode: mode === 'register' ? inviteCode.trim() : undefined,
      nickname: mode === 'register' ? nickname.trim() : undefined,
    });
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrorMessage('');
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full items-start justify-center overflow-x-hidden px-4 pb-14 pt-5 sm:items-center sm:px-5 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_50%_95%,rgba(14,165,233,0.10),transparent_38%)]" />
      <Card className="relative w-full max-w-[900px] border-cyan-400/25 bg-[linear-gradient(145deg,rgba(16,25,42,0.96)_0%,rgba(10,17,31,0.98)_52%,rgba(7,13,24,0.99)_100%)] shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_28px_80px_rgba(2,6,23,0.72)]">
        <CardBody className="p-0">
        <div className="grid md:grid-cols-[1fr_1.15fr]">
          <section className="border-b border-slate-700/45 bg-slate-900/20 p-4 md:border-b-0 md:border-r md:p-6">
            <div className="rounded-2xl border border-slate-700/45 bg-slate-900/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold tracking-[0.08em] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.28)]">
                  欢迎使用
                </span>
              <PageTitle className="text-[clamp(1.25rem,5vw,1.55rem)] leading-tight tracking-[0.01em]">
                <span className="bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 bg-clip-text text-transparent">
                  只做一种模式K线训练
                </span>
              </PageTitle>
            </div>
            <PageDescription className="mt-2 text-[13px] leading-6 text-slate-300">登录后即可开始双盲训练。</PageDescription>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-1">
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-400/20 text-[11px] text-cyan-200">◆</span>
                  <div>
                    <div className="text-[12px] font-semibold text-cyan-100">只做一种模式</div>
                    <div className="mt-0.5 text-[11px] text-cyan-200/90">聚焦执行与盘感，不被复杂策略干扰</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/45 px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-400/20 text-[11px] text-sky-200">▦</span>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-200">真实K线回放</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">按周期推进训练，支持复盘总结</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 hidden rounded-2xl border border-slate-700/80 bg-slate-900/45 p-2 md:block">
              <div className="mb-2 text-[11px] font-semibold tracking-[0.03em] text-slate-400">训练界面预览</div>
              <div className="rounded-xl border border-cyan-500/25 bg-[linear-gradient(135deg,rgba(6,182,212,0.16),rgba(15,23,42,0.85))] p-2">
                <div className="mb-1.5 h-1.5 w-20 rounded-full bg-cyan-300/70" />
                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: 18 }).map((_, idx) => (
                    <div key={idx} className={`rounded-sm ${idx % 2 === 0 ? 'bg-emerald-400/65' : 'bg-rose-400/65'}`} style={{ height: `${6 + (idx % 4) * 3}px` }} />
                  ))}
                </div>
                <div className="mt-2 h-5 rounded-lg border border-slate-600/70 bg-slate-900/60" />
              </div>
            </div>
            </div>
          </section>

          <section className="flex items-center px-4 py-5 md:px-6 md:py-8">
        <div className="w-full rounded-2xl border border-slate-700/45 bg-slate-900/20 p-4 md:p-3.5">
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <Button type="button" variant={mode === 'login' ? 'primary' : 'default'} className={`h-11 ${mode === 'login' ? '!shadow-[0_8px_22px_rgba(37,99,235,0.35)]' : ''}`} onClick={() => switchMode('login')}>
            登录
          </Button>
          <Button type="button" variant={mode === 'register' ? 'primary' : 'default'} className={`h-11 ${mode === 'register' ? '!shadow-[0_8px_22px_rgba(37,99,235,0.35)]' : ''}`} onClick={() => switchMode('register')}>
            注册
          </Button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          {mode === 'register' ? (
            <label className="block text-[12px]">
              <span className="field-label mb-1 block">昵称（2-20位，中文/英文/数字/下划线）</span>
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required={mode === 'register'}
                disabled={mode !== 'register'}
                minLength={2}
                maxLength={20}
                pattern="[\u4e00-\u9fa5A-Za-z0-9_]+"
                placeholder="请输入昵称"
                className="h-11 text-base sm:text-sm"
              />
            </label>
          ) : null}

          <label className="block text-[12px]">
            <span className="field-label mb-1 block">邮箱</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              className="h-11 text-base sm:text-sm"
            />
          </label>

          <label className="block text-[12px]">
            <span className="field-label mb-1 block">{mode === 'register' ? '密码（至少 8 位，字母+数字）' : '密码'}</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 8 : 1}
              placeholder="******"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className="h-11 text-base sm:text-sm"
            />
          </label>
          {mode === 'register' ? <p className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-[11px] leading-5 text-slate-400">{PASSWORD_STRENGTH_HINT}</p> : null}

          {mode === 'register' ? (
            <label className="block text-[12px]">
              <span className="field-label mb-1 block">邀请码（必填）</span>
              <Input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required={mode === 'register'}
                disabled={mode !== 'register'}
                placeholder="请输入邀请码"
                className="h-11 text-base sm:text-sm"
              />
            </label>
          ) : null}

          {errorMessage ? (
            <div className="space-y-2">
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-5 text-rose-200">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="inline-flex min-h-9 items-center rounded-lg border border-cyan-400/45 bg-cyan-500/12 px-3 py-1.5 text-[12px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
              >
                遇到问题？立即联系管理员
              </button>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={mutation.isPending}
            variant="primary"
            size="lg"
            className="h-11 w-full text-[15px] font-semibold"
          >
            {mutation.isPending ? '提交中...' : mode === 'login' ? '登录' : '注册并登录'}
          </Button>
          {mode === 'login' ? (
            <div className="text-right">
              <Link href="/forgot-password" className="text-[12px] text-cyan-300 hover:text-cyan-200">
                忘记密码？
              </Link>
            </div>
          ) : null}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-cyan-400/45 bg-cyan-500/12 px-4 py-2 text-[12px] font-semibold text-cyan-200 shadow-[0_6px_18px_rgba(6,182,212,0.18)] transition hover:bg-cyan-500/22 hover:text-cyan-100"
            >
              联系管理员
            </button>
          </div>
        </form>
        </div>
          </section>
        </div>
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
      <IcpFooter className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 px-3" />
    </main>
  );
}
