'use client';

export function TopNav({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
      <h1 className="font-semibold">K线双盲模拟训练系统</h1>
      <div className="flex gap-2">
        <button className="rounded bg-blue-600 px-3 py-1" onClick={onStart}>开始训练</button>
      </div>
    </div>
  );
}
