'use client';

import { useEffect } from 'react';
import { Button } from './Button';

export function Toast({
  open,
  message,
  tone = 'info',
  onClose,
}: {
  open: boolean;
  message: string;
  tone?: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;
  const cls =
    tone === 'success'
      ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
      : tone === 'error'
        ? 'border-rose-400/40 bg-rose-500/20 text-rose-100'
        : 'border-cyan-400/40 bg-cyan-500/20 text-cyan-100';

  return (
    <div className="fixed right-4 top-4 z-[220]">
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-xl backdrop-blur ${cls}`}>
        <span>{message}</span>
        <Button size="sm" variant="ghost" className="px-2 py-1 text-[11px]" onClick={onClose}>
          关闭
        </Button>
      </div>
    </div>
  );
}

