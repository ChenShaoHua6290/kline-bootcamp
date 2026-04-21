'use client';

export function TimeframeSwitcher({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const list = ['15m', '30m', '1H', '2H', '4H', 'D', 'W'];
  return <div className="mb-2 flex gap-2">{list.map((tf) => <button key={tf} className={`rounded px-2 py-1 ${value === tf ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => onChange(tf)}>{tf}</button>)}</div>;
}
