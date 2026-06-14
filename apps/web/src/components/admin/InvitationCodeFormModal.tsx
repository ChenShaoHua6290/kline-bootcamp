'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DEFAULT_TRIAL_DAILY_TRAINING_LIMIT, DEFAULT_TRIAL_DAYS } from '@/lib/trial-access';

type FormValue = {
  code: string;
  maxUses: number;
  expiresAt?: string;
  isActive: boolean;
  type: 'TRIAL' | 'PAID' | 'INTERNAL';
  trialDays?: number;
  dailyTrainingLimit?: number;
  paidPlan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
};

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function defaultExpiresAtValue() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(23, 59, 0, 0);
  return toDateTimeLocalValue(d);
}

function generateInviteCode(length = 10) {
  let code = '';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(length);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < length; i += 1) {
      code += INVITE_CHARS[buf[i] % INVITE_CHARS.length];
    }
    return code;
  }
  for (let i = 0; i < length; i += 1) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
}

export function InvitationCodeFormModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (val: FormValue) => void;
}) {
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState(10);
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState<'TRIAL' | 'PAID' | 'INTERNAL'>('INTERNAL');
  const [trialDays, setTrialDays] = useState(DEFAULT_TRIAL_DAYS);
  const [dailyTrainingLimit, setDailyTrainingLimit] = useState(DEFAULT_TRIAL_DAILY_TRAINING_LIMIT);
  const [paidPlan, setPaidPlan] = useState<'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');

  useEffect(() => {
    if (!open) {
      setCode('');
      setMaxUses(10);
      setExpiresAt(defaultExpiresAtValue());
      setIsActive(true);
      setType('INTERNAL');
      setTrialDays(DEFAULT_TRIAL_DAYS);
      setDailyTrainingLimit(DEFAULT_TRIAL_DAILY_TRAINING_LIMIT);
      setPaidPlan('MONTHLY');
    }
  }, [open]);

  useEffect(() => {
    if (type === 'TRIAL' || type === 'PAID') {
      setMaxUses(1);
      return;
    }
    setMaxUses(10);
  }, [type]);

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg overflow-hidden p-0">
      <div className="flex max-h-[min(86vh,760px)] flex-col">
        <div className="border-b border-slate-700/70 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-lg font-semibold text-slate-100">创建邀请码</div>
            <Badge tone="info">管理员</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">邀请码支持手动输入或自动生成。</p>
        </div>
        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="field-label mb-1.5 block text-[13px]">邀请码</span>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="例如 K7Q9M2X8PA" />
              <Button
                type="button"
                variant="default"
                className="h-10 min-w-[96px] shrink-0 whitespace-nowrap px-3 text-sm"
                onClick={() => setCode(generateInviteCode(10))}
              >
                自动生成
              </Button>
            </div>
          </label>
          <label className="block">
            <span className="field-label mb-1.5 block text-[13px]">最大使用次数</span>
            <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value || 1)))} />
          </label>
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/25 p-3">
            <label className="block">
              <span className="field-label mb-1.5 block text-[13px]">类型</span>
              <select
                className="h-10 w-full rounded-lg border border-slate-600/80 bg-slate-900/70 px-3 text-[15px] font-medium text-slate-100 outline-none ring-0 transition focus:border-cyan-400/70"
                value={type}
                onChange={(e) => setType(e.target.value as never)}
              >
                <option className="bg-slate-900 text-slate-100" value="INTERNAL">内部</option>
                <option className="bg-slate-900 text-slate-100" value="TRIAL">试用</option>
                <option className="bg-slate-900 text-slate-100" value="PAID">付费</option>
              </select>
            </label>
            {type === 'TRIAL' ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label mb-1.5 block text-[13px]">试用天数</span>
                  <Input type="number" min={1} value={trialDays} onChange={(e) => setTrialDays(Math.max(1, Number(e.target.value || 1)))} />
                </label>
                <label className="block">
                  <span className="field-label mb-1.5 block text-[13px]">每日训练限制</span>
                  <Input type="number" min={1} value={dailyTrainingLimit} onChange={(e) => setDailyTrainingLimit(Math.max(1, Number(e.target.value || 1)))} />
                </label>
              </div>
            ) : null}
            {type === 'PAID' ? (
              <label className="mt-3 block">
                <span className="field-label mb-1.5 block text-[13px]">付费套餐</span>
                <select
                  className="h-10 w-full rounded-lg border border-slate-600/80 bg-slate-900/70 px-3 text-[15px] font-medium text-slate-100 outline-none ring-0 transition focus:border-cyan-400/70"
                  value={paidPlan}
                  onChange={(e) => setPaidPlan(e.target.value as never)}
                >
                  <option className="bg-slate-900 text-slate-100" value="MONTHLY">月卡</option>
                  <option className="bg-slate-900 text-slate-100" value="QUARTERLY">季卡</option>
                  <option className="bg-slate-900 text-slate-100" value="YEARLY">年卡</option>
                </select>
              </label>
            ) : null}
          </div>
          <label className="block">
            <span className="field-label mb-1.5 block text-[13px]">过期时间（可选）</span>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            启用
          </label>
        </div>
        <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-700/60 bg-slate-950/70 px-5 py-4">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            disabled={submitting || !code.trim()}
            onClick={() =>
              onSubmit({
                code: code.trim(),
                maxUses,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
                isActive,
                type,
                trialDays: type === 'TRIAL' ? trialDays : undefined,
                dailyTrainingLimit: type === 'TRIAL' ? dailyTrainingLimit : undefined,
                paidPlan: type === 'PAID' ? paidPlan : undefined,
              })
            }
          >
            {submitting ? '提交中...' : '创建'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
