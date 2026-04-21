'use client';
import { useState } from 'react';

const markets = ['STOCK', 'FOREX', 'FUTURES', 'GOLD', 'CRYPTO'];
const bars = [150, 300, 500];
const initialBars = [60, 150, 300, 500];

export function TrainingConfigModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (v: any) => void }) {
  const [form, setForm] = useState({ market: 'CRYPTO', drivingTimeframe: '1H', totalBars: 300, initialVisibleBars: 150 });
  const allowedInitial = initialBars.filter((n) => n <= form.totalBars);

  return (
    <div className="fixed inset-0 bg-black/60 p-10">
      <div className="mx-auto max-w-lg space-y-3 rounded bg-slate-900 p-5">
        <h2 className="text-lg">训练配置</h2>
        <select className="w-full bg-slate-800 p-2" value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>{markets.map((m) => <option key={m}>{m}</option>)}</select>
        <input className="w-full bg-slate-800 p-2" value={form.drivingTimeframe} onChange={(e) => setForm({ ...form, drivingTimeframe: e.target.value })} />
        <select className="w-full bg-slate-800 p-2" value={form.totalBars} onChange={(e) => setForm({ ...form, totalBars: Number(e.target.value) })}>{bars.map((m) => <option key={m}>{m}</option>)}</select>
        <select className="w-full bg-slate-800 p-2" value={form.initialVisibleBars} onChange={(e) => setForm({ ...form, initialVisibleBars: Number(e.target.value) })}>{allowedInitial.map((m) => <option key={m}>{m}</option>)}</select>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1">取消</button>
          <button onClick={() => onSubmit(form)} className="rounded bg-blue-600 px-3 py-1">开始</button>
        </div>
      </div>
    </div>
  );
}
