'use client';

export function TimeframeSwitcher({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const list = ['15m', '30m', '1H', '2H', '4H', 'D', 'W', 'M'];
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-900/70 p-1">
      {list.map((tf) => (
        <button
          key={tf}
          className={`rounded px-2.5 py-1 text-xs font-medium transition ${
            value === tf ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-700/80'
          }`}
          onClick={() => onChange(tf)}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
