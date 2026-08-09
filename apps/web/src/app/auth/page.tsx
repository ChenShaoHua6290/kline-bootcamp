'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setAuthSession, setRefreshToken } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

const authLabelClass = 'mb-1.5 block text-[12px] font-semibold leading-4 text-slate-300 md:text-[13px]';
const authInputClass = 'h-[46px] rounded-xl px-3 !text-[16px] leading-none md:h-11 md:!text-[15px]';
const authHelperClass = 'mt-1 text-[11px] leading-4 text-slate-500';

function normalizeAuthErrorToZh(msg: string | undefined, mode: Mode) {
  if (!msg) return mode === 'login' ? '登录失败，请稍后重试' : '注册失败，请稍后重试';
  const text = msg.toLowerCase();

  if (text.includes('invalid credentials') || text.includes('unauthorized')) return '邮箱或密码错误';
  if (text.includes('banned')) return '账号已被封禁，请联系管理员';
  if (text.includes('email already') || text.includes('already exists') || text.includes('duplicate')) return '该邮箱已注册，请直接登录';
  if (text.includes('email code') || text.includes('邮箱验证码') || text.includes('验证码')) {
    if (text.includes('frequent') || text.includes('频繁')) return '验证码发送过于频繁，请稍后再试';
    if (text.includes('expired') || text.includes('过期')) return '邮箱验证码已过期，请重新获取';
    if (text.includes('too many') || text.includes('次数过多')) return '验证码错误次数过多，请重新获取';
    if (text.includes('required') || text.includes('先获取')) return '请先获取邮箱验证码';
    if (text.includes('invalid') || text.includes('错误')) return '邮箱验证码错误';
    return msg;
  }
  if (text.includes('invite') && text.includes('required')) return '邀请码可选，不填写会注册为试用用户';
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
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeCountdown, setEmailCodeCountdown] = useState(0);
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

  useEffect(() => {
    if (emailCodeCountdown <= 0) return;
    const timer = window.setTimeout(() => setEmailCodeCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [emailCodeCountdown]);

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

  const emailCodeMutation = useMutation({
    mutationFn: async (payload: { email: string }) => (await api.post('/auth/register/email-code', payload)).data,
    onSuccess: () => {
      setEmailCodeCountdown(60);
      setToast({ open: true, message: '验证码已发送，请查收邮箱', tone: 'success' });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (Array.isArray(msg)) {
        setErrorMessage(msg.map((item) => normalizeAuthErrorToZh(item, 'register')).join('，'));
        return;
      }
      setErrorMessage(normalizeAuthErrorToZh(typeof msg === 'string' ? msg : undefined, 'register'));
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { email: string; password: string; mode: Mode; inviteCode?: string; nickname?: string; emailCode?: string }) => {
      const endpoint = payload.mode === 'login' ? '/auth/login' : '/auth/register';
      const resp = await api.post<AuthResponse>(endpoint, {
        email: payload.email,
        password: payload.password,
        inviteCode: payload.inviteCode,
        nickname: payload.nickname,
        emailCode: payload.emailCode,
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
      inviteCode: mode === 'register' && inviteCode.trim() ? inviteCode.trim() : undefined,
      nickname: mode === 'register' ? nickname.trim() : undefined,
      emailCode: mode === 'register' ? emailCode.trim() : undefined,
    });
  };

  const sendEmailCode = () => {
    const nextEmail = email.trim();
    setErrorMessage('');
    if (!nextEmail) {
      setErrorMessage('请先输入邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setErrorMessage('请输入有效邮箱');
      return;
    }
    emailCodeMutation.mutate({ email: nextEmail });
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrorMessage('');
  };

  const canSendEmailCode = mode === 'register' && email.trim() && emailCodeCountdown <= 0 && !emailCodeMutation.isPending;

  return (
    <main className="relative mx-auto flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#020617] px-3 text-slate-100 sm:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_4%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_88%_0%,rgba(59,130,246,0.16),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.86))]" />
      <div className="relative z-10 flex flex-1 items-start justify-center pb-4 pt-3 sm:items-center sm:py-8">
        <Card className="relative w-full max-w-[420px] overflow-hidden rounded-[18px] border-cyan-400/25 bg-[linear-gradient(145deg,rgba(16,25,42,0.96)_0%,rgba(10,17,31,0.98)_52%,rgba(7,13,24,0.99)_100%)] shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_28px_80px_rgba(2,6,23,0.72)] sm:max-w-[460px] md:max-w-[780px] md:rounded-2xl">
          <CardBody className="p-0">
            <section className="border-b border-cyan-400/14 px-4 pb-3 pt-3 md:hidden">
              <div className="mb-1.5 inline-flex items-center rounded-md border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-cyan-200">
                欢迎使用
              </div>
              <h1 className="text-[22px] font-semibold leading-[1.15] text-slate-50">
                {mode === 'login' ? '登录 K线训练' : '创建训练账号'}
              </h1>
              <p className="mt-1.5 text-[12px] leading-5 text-slate-400">
                {mode === 'login' ? '回到双盲训练、交易记录与复盘节奏。' : '填写资料并验证邮箱，注册后即可开始训练。'}
              </p>
              {mode === 'login' ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5">
                    <div className="text-[12px] font-semibold text-cyan-100">固定模式</div>
                    <div className="mt-0.5 text-[11px] leading-4 text-cyan-100/75">减少策略切换</div>
                  </div>
                  <div className="rounded-xl border border-slate-700/75 bg-slate-900/50 px-3 py-2.5">
                    <div className="text-[12px] font-semibold text-slate-100">训练复盘</div>
                    <div className="mt-0.5 text-[11px] leading-4 text-slate-400">沉淀执行记录</div>
                  </div>
                </div>
              ) : null}
            </section>

          <div className="grid md:grid-cols-[0.84fr_1.16fr]">
            <section className="hidden border-r border-slate-700/45 bg-slate-900/20 p-6 md:flex md:flex-col md:justify-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-cyan-300/35 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.28)]">
                    欢迎使用
                  </span>
                </div>
                <h1 className="mt-4 text-[26px] font-semibold leading-tight tracking-[0.01em] text-slate-50">
                  只做一种模式
                  <span className="block bg-gradient-to-r from-cyan-200 via-sky-100 to-indigo-200 bg-clip-text text-transparent">K线训练</span>
                </h1>
                <p className="mt-3 text-[13px] leading-6 text-slate-300">登录后继续训练；新用户完成邮箱验证后即可进入双盲训练和复盘。</p>
                <div className="mt-6 grid gap-2.5">
                  <div className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3.5 py-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan-400/20 text-[10px] text-cyan-200">◆</span>
                      <div>
                        <div className="text-[13px] font-semibold text-cyan-100">只做一种模式</div>
                        <div className="mt-0.5 text-[12px] leading-5 text-cyan-200/85">聚焦执行与盘感</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-700/80 bg-slate-900/45 px-3.5 py-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-400/20 text-[10px] text-sky-200">▦</span>
                      <div>
                        <div className="text-[13px] font-semibold text-slate-200">真实K线回放</div>
                        <div className="mt-0.5 text-[12px] leading-5 text-slate-400">支持训练和复盘</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-4 py-4 sm:px-5 md:flex md:items-center md:px-6 md:py-6">
              <div className="w-full md:p-0">
                <div className="mb-3 hidden md:block">
                  <div className="text-[11px] font-semibold tracking-[0.12em] text-cyan-300">{mode === 'login' ? '账号登录' : '创建账号'}</div>
                  <h2 className="mt-1.5 text-[22px] font-semibold leading-tight text-slate-50">
                    {mode === 'login' ? '继续你的训练' : '注册后开始训练'}
                  </h2>
                  <p className="mt-1.5 text-[12px] leading-5 text-slate-400">
                    {mode === 'login' ? '输入邮箱和密码，回到上次的训练节奏。' : '请完成邮箱验证。'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[16px] font-semibold md:text-[16px]">
                  <button
                    type="button"
                    className={`transition ${mode === 'login' ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => switchMode('login')}
                  >
                    登录
                  </button>
                  <span className="text-slate-600">/</span>
                  <button
                    type="button"
                    className={`transition ${mode === 'register' ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => switchMode('register')}
                  >
                    注册
                  </button>
                </div>

                <form className="mt-3 space-y-3 md:space-y-3.5" onSubmit={submit}>
                  {mode === 'register' ? (
                    <label className="block">
                      <span className={authLabelClass}>昵称</span>
                      <Input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required={mode === 'register'}
                        disabled={mode !== 'register'}
                        minLength={2}
                        maxLength={20}
                        pattern="[\u4e00-\u9fa5A-Za-z0-9_]+"
                        placeholder="2-20 位，支持中文、英文、数字和下划线"
                        className={authInputClass}
                      />
                    </label>
                  ) : null}

                  <label className="block">
                    <span className={authLabelClass}>邮箱</span>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      className={authInputClass}
                    />
                  </label>

                  {mode === 'register' ? (
                    <label className="block">
                      <span className={authLabelClass}>邮箱验证码</span>
                      <div className="flex items-stretch gap-2">
                        <Input
                          type="text"
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required={mode === 'register'}
                          disabled={mode !== 'register'}
                          minLength={6}
                          maxLength={6}
                          pattern="\d{6}"
                          placeholder="6位数字"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          className={`${authInputClass} min-w-0 flex-1`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!canSendEmailCode}
                          onClick={sendEmailCode}
                          className="h-[46px] w-[108px] shrink-0 whitespace-nowrap rounded-xl px-2 text-[12px] leading-none md:h-11"
                        >
                          {emailCodeMutation.isPending ? '发送中...' : emailCodeCountdown > 0 ? `${emailCodeCountdown}s后重发` : '获取验证码'}
                        </Button>
                      </div>
                      <p className={`${authHelperClass} hidden md:block`}>10 分钟内有效，以最新验证码为准</p>
                    </label>
                  ) : null}

                  <div className="space-y-1.5">
                    <label className="block">
                      <span className={authLabelClass}>
                        <span>密码</span>
                        {mode === 'register' ? (
                          <span className="ml-1 hidden text-[11px] font-normal text-slate-500 md:inline">
                            {PASSWORD_STRENGTH_HINT}
                          </span>
                        ) : null}
                      </span>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={mode === 'register' ? 8 : 1}
                        placeholder={mode === 'register' ? '至少 8 位，字母 + 数字' : '请输入密码'}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        className={authInputClass}
                      />
                    </label>
                  </div>

                  {mode === 'register' ? (
                    <label className="block">
                      <span className={authLabelClass}>邀请码（选填）</span>
                      <Input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        disabled={mode !== 'register'}
                        placeholder="如果有邀请码，请输入"
                        className={authInputClass}
                      />
                    </label>
                  ) : null}

                  {errorMessage ? (
                    <div className="space-y-1.5">
                      <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-[11px] leading-5 text-rose-200 md:px-3 md:py-2.5 md:text-[12px]">{errorMessage}</p>
                      <button
                        type="button"
                        onClick={() => setContactOpen(true)}
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-cyan-400/45 bg-cyan-500/12 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20 md:w-auto md:text-[12px]"
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
                    className="h-[46px] w-full rounded-xl !text-[16px] font-semibold md:h-11 md:!text-[15px]"
                  >
                    {mutation.isPending ? '提交中...' : mode === 'login' ? '登录' : '注册并登录'}
                  </Button>

                  <div className={`grid gap-2 pt-1 text-center text-[12px] md:text-right md:text-[12px] ${mode === 'login' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {mode === 'login' ? (
                      <Link href="/forgot-password" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-1.5 text-[12px] font-semibold text-cyan-300 hover:text-cyan-200">
                        忘记密码？
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setContactOpen(true)}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-cyan-400/45 bg-cyan-500/12 px-3 py-1.5 text-[12px] font-semibold text-cyan-200 shadow-[0_6px_18px_rgba(6,182,212,0.18)] transition hover:bg-cyan-500/22 hover:text-cyan-100 md:justify-self-center md:px-4 md:py-2"
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
      </div>
      <ContactTeacherModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        wechatId={wechatId}
        qrPath={qrPath}
        onCopy={copyWechat}
        title="联系管理员"
        description="如果你遇到账号登录、邀请码开通、封禁等问题，请通过微信联系管理员。"
        emptyText="暂未配置二维码，请联系平台管理员。"
      />
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <IcpFooter className="pointer-events-auto relative z-10 mt-auto px-3 pb-3 text-center sm:pb-5" />
    </main>
  );
}
