import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export function Modal({
  open,
  onClose,
  children,
  className,
  overlayClassName,
  maskClosable = true,
  escClosable = true,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  maskClosable?: boolean;
  escClosable?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !escClosable) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, escClosable, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[520] flex items-start justify-center overflow-y-auto bg-black/62 p-2 pt-3 backdrop-blur-[2px] sm:items-center sm:p-4 sm:pt-4',
        overlayClassName,
      )}
      onClick={maskClosable ? onClose : undefined}
    >
      <div
        className={cn(
          'ui-card my-auto w-full max-h-[calc(100dvh-24px)] max-w-2xl overflow-hidden rounded-2xl sm:w-[calc(100vw-32px)] sm:max-h-[calc(100vh-48px)]',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
