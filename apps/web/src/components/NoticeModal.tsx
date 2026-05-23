'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

type NoticeTone = 'error' | 'warning' | 'info';

export function NoticeModal({
  open,
  title,
  message,
  tone = 'warning',
  onClose,
  onConfirm,
  confirmText = '确定',
  cancelText = '取消',
  maskClosable = true,
  children,
}: {
  open: boolean;
  title: string;
  message: string;
  tone?: NoticeTone;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  maskClosable?: boolean;
  children?: ReactNode;
}) {
  const [modalScale, setModalScale] = useState(1);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    const fitModal = () => {
      const el = modalRef.current;
      if (!el) return;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (!width || !height) return;
      const widthScale = (window.innerWidth - 24) / width;
      const heightScale = (window.innerHeight - 28) / height;
      const next = Math.min(1, widthScale, heightScale) * 0.98;
      setModalScale(Math.max(0.7, next));
    };
    const raf = requestAnimationFrame(fitModal);
    const ResizeObserverCtor = window.ResizeObserver;
    const observer = ResizeObserverCtor ? new ResizeObserverCtor(fitModal) : null;
    if (observer && modalRef.current) observer.observe(modalRef.current);
    window.addEventListener('resize', fitModal);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize', fitModal);
    };
  }, [open]);

  if (!open) return null;

  const toneStyle =
    tone === 'error'
      ? {
          badge: 'bg-rose-500/20 text-rose-200 border-rose-400/45',
          title: 'text-rose-200',
          button: 'from-rose-500 to-fuchsia-500 text-white',
        }
      : tone === 'info'
        ? {
            badge: 'bg-sky-500/20 text-sky-200 border-sky-400/45',
            title: 'text-sky-200',
            button: 'from-sky-500 to-cyan-500 text-white',
          }
        : {
            badge: 'bg-amber-500/20 text-amber-200 border-amber-400/45',
            title: 'text-amber-200',
            button: 'from-amber-500 to-orange-500 text-white',
          };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[radial-gradient(circle_at_50%_15%,rgba(56,189,248,0.12),transparent_44%),rgba(2,6,23,0.82)] p-4"
      onClick={maskClosable ? onClose : undefined}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 via-slate-900/95 to-slate-950/95 shadow-[0_20px_70px_rgba(0,0,0,0.58)]"
        style={{ transform: `scale(${modalScale})`, transformOrigin: 'center center', willChange: 'transform' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700/70 px-5 py-4">
          <div>
            <div className={`inline-flex rounded-lg border px-2.5 py-1 text-[18px] font-semibold ${toneStyle.badge}`}>系统提示</div>
            <div className="mt-1 text-[11px] text-slate-400">请确认后继续操作</div>
          </div>
          <Button
            onClick={onClose}
            variant="default"
            size="sm"
            className="!h-8 !w-8 !px-0 text-sm"
            aria-label="关闭"
          >
            ×
          </Button>
        </div>

        <div className="space-y-3 px-5 py-5">
          <h3 className={`text-[22px] font-semibold leading-tight ${toneStyle.title}`}>{title}</h3>
          <p className="text-[15px] leading-7 text-slate-300">{message}</p>
          {children}
          {onConfirm ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={onClose}
                variant="default"
                className="h-10 min-w-[88px] px-4 text-sm"
              >
                {cancelText}
              </Button>
              <Button
                onClick={onConfirm}
                variant="primary"
                className={`h-10 min-w-[104px] border-0 bg-gradient-to-r px-5 text-sm ${toneStyle.button}`}
              >
                {confirmText}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                onClick={onClose}
                variant="primary"
                className={`h-10 min-w-[104px] border-0 bg-gradient-to-r px-5 text-sm ${toneStyle.button}`}
              >
                我知道了
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
