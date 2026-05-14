'use client';
import { useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/Slider';

const markets = ['STOCK', 'FOREX', 'FUTURES', 'CRYPTO'];
const timeframes = ['15m', '1H', '4H', 'D'];
const marketLabels: Record<string, string> = {
  STOCK: '股票',
  FOREX: '外汇',
  FUTURES: '期货',
  GOLD: '黄金',
  CRYPTO: '加密',
};

export function TrainingConfigModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (v: { market: string; drivingTimeframe: string; trainingBars: number }) => void;
  submitting?: boolean;
}) {
  const [form, setForm] = useState({ market: 'CRYPTO', drivingTimeframe: '1H', trainingBars: 150 });
  const [modalScale, setModalScale] = useState(1);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fitModal = () => {
      const fallbackWidth = 430;
      const fallbackHeight = 760;
      const currentWidth = cardRef.current?.offsetWidth ?? fallbackWidth;
      const currentHeight = cardRef.current?.offsetHeight ?? fallbackHeight;
      const widthScale = (window.innerWidth - 24) / currentWidth;
      const heightScale = (window.innerHeight - 24) / currentHeight;
      const next = Math.min(1, widthScale, heightScale);
      setModalScale(Math.max(0.60, next));
    };
    const raf = requestAnimationFrame(fitModal);
    window.addEventListener('resize', fitModal);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fitModal);
    };
  }, []);

  const optionBtnBase =
    'rounded-2xl border border-slate-600/70 bg-slate-800/45 text-slate-300 transition hover:border-slate-400/80 active:border-cyan-300/70 active:bg-cyan-500/22 active:text-cyan-100 disabled:opacity-60';

  return (
    <div
        className="fixed inset-0 z-[220] flex items-center justify-center bg-[radial-gradient(circle_at_50%_8%,rgba(6,182,212,0.08),transparent_42%),rgba(2,6,23,0.86)] px-3 py-3"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="relative flex w-[calc(100vw-32px)] max-w-[430px] flex-col rounded-[24px] border border-cyan-500/18 bg-[linear-gradient(145deg,rgba(20,29,45,0.96)_0%,rgba(14,22,38,0.98)_55%,rgba(10,16,29,0.99)_100%)] font-['SF_Pro_Display','PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif] shadow-[0_0_0_1px_rgba(6,182,212,0.10),0_20px_64px_rgba(0,0,0,0.60)]"
        style={{ transform: `scale(${modalScale})`, transformOrigin: 'center center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 z-10 rounded-xl border border-slate-500/65 bg-slate-800/55 px-2.5 py-1.5 text-[22px] leading-none text-slate-300 transition hover:border-cyan-400/60 hover:text-white disabled:opacity-60"
          aria-label="关闭"
        >
          ×
        </button>

        <div className="border-b border-slate-700/70 px-5 pb-3.5 pt-4.5 text-center sm:px-6 sm:pb-4 sm:pt-5">
          <h2 className="mt-2 text-[clamp(1.05rem,1.6vw,1.45rem)] font-semibold leading-tight tracking-[0.01em] text-slate-100">开始训练</h2>
          <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-slate-400">选择市场、推进周期和训练长度</p>
        </div>

        <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-4">
          <section>
            <div className="mb-2 text-[12px] font-semibold tracking-[0.03em] text-cyan-300">市场</div>
            <div className="grid grid-cols-4 gap-2">
              {markets.map((m) => {
                const active = form.market === m;
                return (
                  <button
                    key={m}
                    disabled={submitting}
                    onClick={() => setForm({ ...form, market: m })}
                    className={`${optionBtnBase} h-9 px-2 text-[13px] font-semibold tracking-[0.01em] ${
                      active
                        ? 'border-cyan-200/80 bg-gradient-to-r from-cyan-500/75 to-sky-500/70 text-white shadow-[0_8px_24px_rgba(34,211,238,0.22),inset_0_0_0_1px_rgba(255,255,255,0.18)]'
                        : ''
                    }`}
                  >
                    {marketLabels[m] ?? m}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-[0.03em] text-cyan-300">
              <span>推进周期</span>
              <span className="group relative inline-flex">
                <span
                  className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-cyan-400/45 bg-cyan-500/10 text-[11px] font-bold text-cyan-300"
                  aria-label="推进周期说明"
                  title="该周期决定每次点击“观望”时，K线向后推进的单位。示例：选择 1H，则每次观望推进 1 根 1小时K线。"
                  tabIndex={0}
                >
                  ?
                </span>
                <span className="pointer-events-none absolute left-1/2 top-full z-[260] mt-2 hidden w-[240px] -translate-x-1/2 rounded-lg border border-cyan-500/30 bg-slate-900/95 px-2.5 py-2 text-[11px] font-medium leading-4 text-cyan-100 shadow-xl group-hover:block group-focus-within:block">
                  该周期决定每次点击“观望”时，K线向后推进的单位。示例：选择 1H，则每次观望推进 1 根 1小时K线。
                </span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {timeframes.map((tf) => {
                const active = form.drivingTimeframe === tf;
                return (
                  <button
                    key={tf}
                    disabled={submitting}
                    onClick={() => setForm({ ...form, drivingTimeframe: tf })}
                    className={`${optionBtnBase} h-9 px-2 text-[13px] font-semibold tracking-[0.01em] ${
                      active ? 'border-cyan-200/80 bg-gradient-to-r from-cyan-500/75 to-sky-500/70 text-white shadow-[0_8px_24px_rgba(34,211,238,0.22),inset_0_0_0_1px_rgba(255,255,255,0.18)]' : ''
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between text-[12px] font-semibold tracking-[0.03em] text-cyan-300">
              <div className="flex items-center gap-2">
                <span>训练K线数量</span>
                <span className="group relative inline-flex">
                <span
                  className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-cyan-400/45 bg-cyan-500/10 text-[11px] font-bold text-cyan-300"
                  aria-label="训练K线数量说明"
                  title="表示开始训练后可逐根推进的K线数量。"
                  tabIndex={0}
                >
                  ?
                </span>
                  <span className="pointer-events-none absolute left-1/2 top-full z-[260] mt-2 hidden w-[180px] -translate-x-1/2 rounded-lg border border-cyan-500/30 bg-slate-900/95 px-2.5 py-2 text-[11px] font-medium leading-4 text-cyan-100 shadow-xl group-hover:block group-focus-within:block">
                    表示开始训练后可逐根推进的K线数量。
                  </span>
                </span>
              </div>
              <span className="text-cyan-200 text-[16px] leading-none font-semibold">{form.trainingBars} 根</span>
            </div>
            <Slider
              min={50}
              max={500}
              step={10}
              value={form.trainingBars}
              disabled={submitting}
              onChange={(e) => setForm((prev) => ({ ...prev, trainingBars: Number(e.target.value) }))}
              className="slider-compact h-1.5 bg-slate-700/65 [&::-webkit-slider-thumb]:!h-2 [&::-webkit-slider-thumb]:!w-2 [&::-webkit-slider-thumb]:!shadow-[0_0_0_2px_rgba(6,182,212,0.14)] [&::-moz-range-thumb]:!h-2 [&::-moz-range-thumb]:!w-2"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>50</span>
              <span>500</span>
            </div>
          </section>
        </div>

        <div className="space-y-2 border-t border-slate-700/70 px-5 py-3 sm:px-6 sm:py-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-2xl border border-slate-500/70 bg-slate-800/55 py-2 text-[12px] font-semibold text-slate-200 transition hover:border-slate-400/80 hover:bg-slate-700/70 active:border-cyan-300/70 active:bg-cyan-500/22 active:text-cyan-100 disabled:opacity-60"
            >
              取消
            </button>
            <button
              disabled={submitting}
              onClick={() => onSubmit(form)}
              className="rounded-2xl bg-gradient-to-r from-[#13d9b6] to-[#22cde6] py-2 text-[12px] font-semibold tracking-[0.02em] text-slate-950 transition hover:brightness-105 active:from-[#31e6c5] active:to-[#46ddf2] active:shadow-[0_0_0_2px_rgba(34,211,238,0.35),0_0_20px_rgba(34,211,238,0.25)] disabled:opacity-60"
            >
              {submitting ? '创建中...' : '开始训练'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/65 px-3 py-2 text-[11px] font-medium leading-4 text-slate-500 sm:px-4">
            本功能用于K线训练与交易复盘学习，不构成投资建议。请根据自身风险承受能力理性训练。
          </div>
        </div>
      </div>
    </div>
  );
}
