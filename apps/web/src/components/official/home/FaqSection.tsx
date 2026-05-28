'use client';

import Link from 'next/link';
import { useState } from 'react';
import { homeFaqs } from '@/data/official-home-content';

export function FaqSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="faq" className="mx-auto max-w-[1360px] scroll-mt-24 px-4 pb-28 sm:px-6 lg:pb-36">
      <h2 className="text-center text-[30px] font-semibold tracking-[-0.01em] sm:text-4xl lg:text-[40px]">常见问题</h2>
      <div className="mx-auto mt-8 max-w-5xl space-y-3">
        {homeFaqs.map(([q, a], idx) => {
          const open = idx === activeIndex;
          const isFee = q.includes('费用');
          return (
            <div
              id={isFee ? 'faq-fee' : undefined}
              key={q}
              className={`scroll-mt-24 rounded-2xl border bg-slate-900/55 transition-all duration-300 ${open ? 'border-cyan-200/55 shadow-[0_0_0_1px_rgba(103,232,249,0.12),0_16px_36px_rgba(8,145,178,0.14)]' : 'border-cyan-400/20 hover:border-cyan-300/40'}`}
            >
              <button
                type="button"
                className={`flex w-full items-center justify-between px-5 py-4 text-left transition sm:px-6 sm:py-5 ${open ? 'bg-cyan-500/10' : ''}`}
                onClick={() => setActiveIndex(open ? -1 : idx)}
              >
                <span className={`text-lg font-semibold sm:text-xl ${open ? 'text-cyan-100' : 'text-slate-100'}`}>{q}</span>
                <span className={`text-xl transition ${open ? 'text-cyan-200' : 'text-cyan-300'}`}>{open ? '−' : '+'}</span>
              </button>
              {open ? (
                <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <div className="rounded-xl border border-cyan-400/18 bg-slate-950/45 px-4 py-4 sm:px-5 sm:py-5">
                    <p className="text-base leading-8 text-slate-300 sm:text-[17px] sm:leading-9">{a}</p>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="pt-2 text-center">
          <Link href="/system#faq-system" className="text-sm font-semibold text-cyan-200">查看更多问题 →</Link>
        </div>
      </div>
    </section>
  );
}
