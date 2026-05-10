import { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full appearance-none rounded-xl border border-[#35507a] bg-[linear-gradient(180deg,#15233c_0%,#101a30_100%)] px-3 pr-9 text-sm text-slate-100 outline-none transition',
        'bg-[url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%277%27 viewBox=%270 0 12 7%27 fill=%27none%27%3E%3Cpath d=%27M1 1L6 6L11 1%27 stroke=%27%23b8c7e8%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E\")] bg-[position:right_12px_center] bg-no-repeat',
        'hover:border-[#4b6da3] focus:border-cyan-400 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.2)]',
        '[&>option]:bg-slate-900 [&>option]:text-slate-100',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
