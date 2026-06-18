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

const authLabelClass = 'field-label mb-1 block text-[11px] normal-case leading-4 tracking-[0.06em] text-slate-300 md:text-[12px]';
const authInputClass = 'h-[44px] rounded-xl px-3 !text-[16px] leading-none md:h-11 md:!text-sm';

function normalizeAuthErrorToZh(msg: string | undefined, mode: Mode) {
  if (!msg) return mode === 'login' ? '登录失败，请稍后重试' : '注册失败，请稍后重试';
  const text = msg.toLowerCase();

  if (text.includes('invalid credentials') || text.includes('unauthorized')) return '邮箱或密码错误';
  if (text.includes('banned')) return '账号已被封禁，请联系管理员';
  if (text.includes('email already') || text.includes('already exists') || text.includes('duplicate')) return '该邮箱已注册，请直接登录';
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
      inviteCode: mode === 'register' && inviteCode.trim() ? inviteCode.trim() : undefined,
      nickname: mode === 'register' ? nickname.trim() : undefined,
    });
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrorMessage('');
  };

  return (
    <main className="relative mx-auto flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#020617] px-2 text-slate-100 sm:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_4%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_88%_0%,rgba(59,130,246,0.16),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.86))]" />
      <div className="relative z-10 flex flex-1 items-start justify-center pb-4 pt-2 sm:items-center sm:py-8">
        <Card className="relative w-full max-w-[390px] overflow-hidden rounded-[18px] border-cyan-400/25 bg-[linear-gradient(145deg,rgba(16,25,42,0.96)_0%,rgba(10,17,31,0.98)_52%,rgba(7,13,24,0.99)_100%)] shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_28px_80px_rgba(2,6,23,0.72)] sm:max-w-[460px] md:max-w-[900px] md:rounded-2xl">
          <CardBody className="p-0">
            <section className="border-b border-cyan-400/14 px-3 pb-2.5 pt-2.5 md:hidden">
              <div className="mb-1.5 inline-flex items-center rounded-md border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-cyan-200">
                欢迎使用
              </div>
              <h1 className="text-[19px] font-semibold leading-[1.15] text-slate-50">
                {mode === 'login' ? '登录 K线训练' : '创建训练账号'}
              </h1>
              <p className="mt-1.5 text-[11px] leading-5 text-slate-300">
                {mode === 'login' ? '回到双盲训练、交易记录与复盘节奏。' : '注册后开始训练，邀请码可选。'}
              </p>
              {mode === 'login' ? (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-2">
                    <div className="text-[11px] font-semibold text-cyan-100">固定模式</div>
                    <div className="mt-0.5 text-[10px] leading-4 text-cyan-100/75">减少策略切换</div>
                  </div>
                  <div className="rounded-xl border border-slate-700/75 bg-slate-900/50 px-2.5 py-2">
                    <div className="text-[11px] font-semibold text-slate-100">训练复盘</div>
                    <div className="mt-0.5 text-[10px] leading-4 text-slate-400">沉淀执行记录</div>
                  </div>
                </div>
              ) : null}
            </section>

          <div className="grid md:grid-cols-[1fr_1.15fr]">
            <section className="hidden border-r border-slate-700/45 bg-slate-900/20 p-6 md:block">
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
                <div className="mt-4 grid gap-2.5">
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
                <div className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-900/45 p-2">
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

            <section className="px-3 py-3 sm:px-5 md:flex md:items-center md:px-6 md:py-8">
              <div className="w-full md:rounded-2xl md:border md:border-slate-700/45 md:bg-slate-900/20 md:p-3.5">
                <div className="mb-3 md:hidden">
                  <div className="text-[10px] font-semibold tracking-[0.1em] text-cyan-300">{mode === 'login' ? '账号登录' : '创建账号'}</div>
                  <h2 className="mt-1 text-[17px] font-semibold leading-tight text-slate-50">
                    {mode === 'login' ? '继续你的训练' : '注册后开始训练'}
                  </h2>
                  <p className="mt-1 text-[11px] leading-5 text-slate-400">
                    {mode === 'login' ? '输入邮箱和密码，回到上次的训练节奏。' : '邀请码可选，不填写会注册为试用用户。'}
                  </p>
                </div>

                <div className="flex items-center gap-5 border-b border-slate-700/70 text-[15px] font-semibold md:text-[13px]">
                  <button
                    type="button"
                    className={`relative pb-2 transition ${mode === 'login' ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => switchMode('login')}
                  >
                    登录
                    {mode === 'login' ? <span className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-cyan-300" /> : null}
                  </button>
                  <button
                    type="button"
                    className={`relative pb-2 transition ${mode === 'register' ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => switchMode('register')}
                  >
                    注册
                    {mode === 'register' ? <span className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-cyan-300" /> : null}
                  </button>
                </div>

                <form className="mt-3 space-y-2.5 md:mt-3.5 md:space-y-3" onSubmit={submit}>
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
                        placeholder="2-20位，中文/英文/数字/下划线"
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

                  <div className="space-y-1.5">
                    <label className="block">
                      <span className={authLabelClass}>
                        <span>密码</span>
                        {mode === 'register' ? (
                          <span className="ml-1 inline text-[10px] font-normal tracking-normal text-slate-500 md:text-[11px]">
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
                    className="h-[44px] w-full rounded-xl !text-[16px] font-semibold md:h-11 md:!text-[15px]"
                  >
                    {mutation.isPending ? '提交中...' : mode === 'login' ? '登录' : '注册并登录'}
                  </Button>

                  <div className={`grid gap-2 pt-0.5 text-center text-[12px] md:pt-1 md:text-right md:text-[12px] ${mode === 'login' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {mode === 'login' ? (
                      <Link href="/forgot-password" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-1.5 text-[12px] font-semibold text-cyan-300 hover:text-cyan-200">
                        忘记密码？
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setContactOpen(true)}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl border border-cyan-400/45 bg-cyan-500/12 px-3 py-1.5 text-[12px] font-semibold text-cyan-200 shadow-[0_6px_18px_rgba(6,182,212,0.18)] transition hover:bg-cyan-500/22 hover:text-cyan-100 md:justify-self-center md:px-4 md:py-2"
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
