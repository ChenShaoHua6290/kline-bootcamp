'use client';

import { useEffect, useState } from 'react';
import { homeFaqs } from '@/data/official-home-content';

export function FaqSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? homeFaqs : homeFaqs.slice(0, 6);

  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash !== '#faq-fee') return;
      const feeIndex = homeFaqs.findIndex(([q]) => q.includes('学习费用'));
      if (feeIndex >= 0) {
        setShowAll(true);
        setActiveIndex(feeIndex);
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  return (
    <section id="faq" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-24 sm:px-6 lg:px-10 lg:pb-32">
      <h2 className="text-center text-[28px] font-semibold tracking-[-0.02em] text-slate-100 sm:text-[32px] lg:text-[38px]">常见问题</h2>
      <div className="mx-auto mt-6 max-w-4xl space-y-3">
        {visibleFaqs.map(([q, a], idx) => {
          const open = idx === activeIndex;
          const isFee = q.includes('费用');
          return (
            <div
              id={isFee ? 'faq-fee' : undefined}
              key={q}
              className={`scroll-mt-24 overflow-hidden rounded-2xl border transition-colors duration-200 ${idx % 2 === 0 ? 'bg-[linear-gradient(145deg,rgba(15,23,42,0.8),rgba(8,47,73,0.2))]' : 'bg-[linear-gradient(145deg,rgba(15,23,42,0.8),rgba(30,58,138,0.16))]'} ${open ? 'border-cyan-200/60 shadow-[0_0_0_1px_rgba(103,232,249,0.14),0_14px_24px_rgba(8,145,178,0.12)]' : 'border-cyan-300/20 hover:border-cyan-200/45'}`}
            >
              <button
                type="button"
                className={`flex w-full items-center justify-between px-6 py-4 text-left transition-colors duration-200 sm:px-7 ${open ? 'bg-cyan-500/10' : ''}`}
                onClick={() => setActiveIndex(open ? -1 : idx)}
              >
                <span className={`text-base font-semibold sm:text-lg ${open ? 'text-cyan-100' : 'text-slate-100'}`}>{q}</span>
                <span className={`text-xl transition-transform duration-300 ${open ? 'translate-y-[-1px] text-cyan-200' : 'text-cyan-300'}`}>{open ? '−' : '+'}</span>
              </button>

              <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${open ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div>
                  <div className="px-6 pb-3 sm:px-7 sm:pb-4">
                    <p className="whitespace-pre-line text-base leading-8 text-slate-300">{a}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-2 text-center">
          <button
            type="button"
            className="inline-flex items-center rounded-xl border border-cyan-300/30 px-5 py-2.5 text-base font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-500/10"
            onClick={() => {
              setShowAll((prev) => {
                if (prev && activeIndex >= 6) setActiveIndex(-1);
                return !prev;
              });
            }}
          >
            {showAll ? '收起更多问题' : '查看更多问题'}
          </button>
        </div>
      </div>
    </section>
  );
}
