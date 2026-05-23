'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export function Button({
  className,
  variant = 'default',
  size = 'md',
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const normalizedVariant = variant === 'secondary' ? 'default' : variant === 'outline' ? 'ghost' : variant;
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-[background-color,border-color,box-shadow,opacity,color] duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-3.5 text-sm',
        size === 'lg' && 'h-11 px-4 text-base',
        normalizedVariant === 'default' &&
          'border border-[color:var(--line-soft)] bg-[color:var(--surface-2)] text-[color:var(--text-1)] hover:border-[color:var(--line-strong)] hover:text-[color:var(--text-0)]',
        normalizedVariant === 'primary' &&
          'border-0 text-white bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] shadow-[0_10px_24px_rgba(37,99,235,0.35)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.42)]',
        normalizedVariant === 'success' &&
          'border-0 text-slate-950 bg-[linear-gradient(135deg,#2dd4bf,#22c55e)] shadow-[0_10px_20px_rgba(16,185,129,0.28)]',
        normalizedVariant === 'danger' &&
          'border-0 text-white bg-[linear-gradient(135deg,#fb7185,#ef4444)] shadow-[0_10px_20px_rgba(244,63,94,0.26)]',
        normalizedVariant === 'warning' &&
          'border-0 text-slate-950 bg-[linear-gradient(135deg,#fbbf24,#f97316)] shadow-[0_10px_20px_rgba(245,158,11,0.24)]',
        normalizedVariant === 'ghost' && 'border border-[color:var(--line-soft)] bg-transparent text-[color:var(--text-1)] hover:border-[color:var(--line-strong)] hover:bg-slate-800/70',
        className,
      )}
      disabled={disabled}
      type={type}
      {...props}
    />
  );
}
