'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type FormValue = {
  code: string;
  maxUses: number;
  expiresAt?: string;
  isActive: boolean;
};

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

  useEffect(() => {
    if (!open) {
      setCode('');
      setMaxUses(10);
      setExpiresAt('');
      setIsActive(true);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg overflow-hidden p-0">
      <div className="border-b border-slate-700/70 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold text-slate-100">创建邀请码</div>
          <Badge tone="info">管理员</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-400">邀请码支持手动输入或自动生成。</p>
      </div>
      <div className="space-y-3 px-5 py-4">
        <label className="block">
          <span className="field-label mb-1 block">邀请码</span>
          <div className="flex items-center gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="例如 K7Q9M2X8PA" />
            <Button type="button" variant="default" onClick={() => setCode(generateInviteCode(10))}>
              自动生成
            </Button>
          </div>
        </label>
        <label className="block">
          <span className="field-label mb-1 block">最大使用次数</span>
          <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value || 1)))} />
        </label>
        <label className="block">
          <span className="field-label mb-1 block">过期时间（可选）</span>
          <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          启用
        </label>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
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
            })
          }
        >
          {submitting ? '提交中...' : '创建'}
        </Button>
      </div>
    </Modal>
  );
}
