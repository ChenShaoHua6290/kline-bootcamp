'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function BanUserModal({
  open,
  email,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  email?: string;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} className="max-w-lg overflow-hidden p-0">
      <div className="border-b border-slate-700/70 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold text-slate-100">封禁用户</div>
          <Badge tone="danger">高风险操作</Badge>
        </div>
        <div className="mt-1 text-sm text-slate-300">用户：{email ?? '--'}</div>
      </div>
      <div className="space-y-3 px-5 py-4">
      <label className="block">
        <span className="field-label mb-1 block">封禁原因</span>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请输入封禁原因" />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={handleClose}>取消</Button>
        <Button
          variant="danger"
          disabled={submitting || !reason.trim()}
          onClick={() => {
            onConfirm(reason.trim());
            setReason('');
          }}
        >
          {submitting ? '处理中...' : '确认封禁'}
        </Button>
      </div>
      </div>
    </Modal>
  );
}
