'use client';

import Link from 'next/link';
import { useState } from 'react';
import { homeFaqs } from '@/data/official-home-content';

export function FaqSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleFaqs = homeFaqs.slice(0, 7);

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
              className={`scroll-mt-24 overflow-hidden rounded-2xl border transition-all duration-300 ${idx % 2 === 0 ? 'bg-[linear-gradient(145deg,rgba(15,23,42,0.8),rgba(8,47,73,0.2))]' : 'bg-[linear-gradient(145deg,rgba(15,23,42,0.8),rgba(30,58,138,0.16))]'} ${open ? 'border-cyan-200/60 shadow-[0_0_0_1px_rgba(103,232,249,0.14),0_18px_34px_rgba(8,145,178,0.16)]' : 'border-cyan-300/20 hover:border-cyan-200/45'}`}
            >
              <button
                type="button"
                className={`flex w-full items-center justify-between px-6 py-4 text-left transition sm:px-7 ${open ? 'bg-cyan-500/10' : ''}`}
                onClick={() => setActiveIndex(open ? -1 : idx)}
              >
                <span className={`text-base font-semibold sm:text-lg ${open ? 'text-cyan-100' : 'text-slate-100'}`}>{q}</span>
                <span className={`text-xl transition-transform duration-300 ${open ? 'translate-y-[-1px] text-cyan-200' : 'text-cyan-300'}`}>{open ? '−' : '+'}</span>
              </button>

              <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="px-6 pb-3 sm:px-7 sm:pb-4">
                    <p className="text-base leading-8 text-slate-300">{a}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-2 text-center">
          <Link href="/system#faq-system" className="inline-flex items-center rounded-xl border border-cyan-300/30 px-5 py-2.5 text-base font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-500/10">
            查看更多问题 →
          </Link>
        </div>
      </div>
    </section>
  );
}
