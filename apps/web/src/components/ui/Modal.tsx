import { ReactNode, useEffect } from 'react';
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
  useEffect(() => {
    if (!open || !escClosable) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, escClosable, onClose]);

  if (!open) return null;
  return (
    <div
      className={cn(
        'fixed inset-0 z-[170] flex items-start justify-center overflow-y-auto bg-black/62 p-4 pt-6 backdrop-blur-[2px] sm:items-center sm:pt-4',
        overlayClassName,
      )}
      onClick={maskClosable ? onClose : undefined}
    >
      <div
        className={cn(
          'ui-card my-auto w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] max-w-2xl overflow-hidden rounded-2xl',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
