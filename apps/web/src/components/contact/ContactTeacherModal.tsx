'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function ContactTeacherModal({
  open,
  onClose,
  wechatId,
  qrPath,
  onCopy,
  title = '联系管理员',
  description = '扫码或添加微信获取帮助',
  emptyText = '暂未上传二维码，请联系管理员配置。',
}: {
  open: boolean;
  onClose: () => void;
  wechatId: string;
  qrPath: string;
  onCopy: () => void;
  title?: string;
  description?: string;
  emptyText?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const hasQr = Boolean(qrPath && qrPath.trim());
  const hasWechat = Boolean(wechatId && wechatId.trim());

  return (
    <Modal open={open} onClose={onClose} className="w-[92vw] max-w-[460px] overflow-hidden p-0">
      <div className="border-b border-slate-700/70 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
        <div className="text-xl font-semibold text-slate-100 sm:text-2xl">{title}</div>
        <p className="mt-1.5 text-sm text-slate-400">{description}</p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <div className="flex justify-center">
          {hasQr ? (
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/65 p-3">
              <Image
                src={qrPath}
                alt="管理员微信二维码"
                width={220}
                height={220}
                className="h-[180px] w-[180px] rounded-lg object-cover sm:h-[220px] sm:w-[220px]"
              />
            </div>
          ) : (
            <div className="flex h-[180px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-slate-900/50 px-4 text-center text-sm text-slate-400 sm:h-[220px]">
              {emptyText}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-3">
          <div className="text-xs text-slate-500">微信号</div>
          <div className="mt-1 select-text break-all font-medium text-slate-100">
            {hasWechat ? wechatId : '未配置'}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={onCopy}
            disabled={!hasWechat}
          >
            复制微信号
          </Button>
          <Button variant="default" className="flex-1" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
}
