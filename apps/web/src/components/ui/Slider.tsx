import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Slider({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="range"
      className={cn(
        'h-2.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700/80 outline-none transition',
        '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-cyan-300/60 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(6,182,212,0.15)]',
        '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-cyan-300/60 [&::-moz-range-thumb]:bg-cyan-400',
        className,
      )}
      {...props}
    />
  );
}
