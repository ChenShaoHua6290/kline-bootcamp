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
    <Modal open={open} onClose={onClose} className="w-[calc(100vw-20px)] max-w-[360px] overflow-hidden rounded-[18px] p-0 sm:max-w-[460px] sm:rounded-2xl">
      <div className="border-b border-slate-700/70 px-4 pb-3 pt-4 sm:px-6 sm:pb-5 sm:pt-6">
        <div className="text-[18px] font-semibold leading-tight text-slate-100 sm:text-2xl">{title}</div>
        <p className="mt-1.5 text-[12px] leading-5 text-slate-400 sm:text-sm">{description}</p>
      </div>

      <div className="space-y-3 px-4 py-4 sm:space-y-4 sm:px-6 sm:py-5">
        <div className="flex justify-center">
          {hasQr ? (
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/65 p-2.5 sm:rounded-2xl sm:p-3">
              <Image
                src={qrPath}
                alt="管理员微信二维码"
                width={220}
                height={220}
                className="h-[156px] w-[156px] rounded-lg object-cover sm:h-[220px] sm:w-[220px]"
              />
            </div>
          ) : (
            <div className="flex h-[132px] w-full items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/50 px-4 text-center text-[12px] leading-5 text-slate-400 sm:h-[220px] sm:rounded-2xl sm:text-sm">
              {emptyText}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 sm:rounded-2xl">
          <div className="text-[11px] text-slate-500 sm:text-xs">微信号</div>
          <div className="mt-1 select-text break-all text-[14px] font-medium leading-5 text-slate-100 sm:text-base">
            {hasWechat ? wechatId : '未配置'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            className="h-10 rounded-xl !text-[13px] sm:h-11 sm:!text-sm"
            onClick={onCopy}
            disabled={!hasWechat}
          >
            复制微信号
          </Button>
          <Button variant="default" className="h-10 rounded-xl !text-[13px] sm:h-11 sm:!text-sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
}
