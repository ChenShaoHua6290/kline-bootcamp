import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Switch({
  checked,
  disabled,
  className,
  onClick,
  onChange,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onChange?.(!checked);
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-500 to-blue-500'
          : 'border-slate-600/70 bg-slate-800',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition duration-200 ease-out',
          checked ? 'translate-x-[22px]' : 'translate-x-1',
        )}
      />
    </button>
  );
}
