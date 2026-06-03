'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { testimonialCards } from '@/data/official-home-content';

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const cardCount = testimonialCards.length;

  const pauseAndResumeLater = () => {
    setPaused(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      setPaused(false);
      resumeTimerRef.current = null;
    }, 6000);
  };

  const scrollToIndex = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-feedback-card="1"]'));
    const target = cards[index];
    if (!target) return;
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  };

  const scrollByCard = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    pauseAndResumeLater();
    const amount = Math.round(el.clientWidth * 0.8) * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateActive = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-feedback-card="1"]'));
      if (!cards.length) return;
      const viewportCenter = el.scrollLeft + el.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      cards.forEach((card, idx) => {
        const center = card.offsetLeft - el.offsetLeft + card.clientWidth / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      setActiveIndex(bestIdx);
    };

    updateActive();
    el.addEventListener('scroll', updateActive, { passive: true });
    return () => el.removeEventListener('scroll', updateActive);
  }, []);

  useEffect(() => {
    if (paused || cardCount <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % cardCount;
        scrollToIndex(next);
        return next;
      });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [paused, cardCount]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const dots = useMemo(() => Array.from({ length: cardCount }, (_, i) => i), [cardCount]);

  return (
    <section id="testimonials" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-20 sm:px-6 sm:pb-28 lg:pb-44">
      <div className="relative mb-5 lg:mb-8">
        <h2 className="text-center text-[25px] font-semibold leading-tight tracking-[-0.02em] text-slate-100 sm:text-[32px] lg:text-[38px]">学员真实反馈</h2>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="上一组反馈"
          className="absolute left-[-6px] top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/35 bg-slate-900/75 text-cyan-100 transition hover:bg-cyan-500/15 lg:flex"
          onClick={() => scrollByCard(-1)}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="下一组反馈"
          className="absolute right-[-6px] top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/35 bg-slate-900/75 text-cyan-100 transition hover:bg-cyan-500/15 lg:flex"
          onClick={() => scrollByCard(1)}
        >
          →
        </button>

        <div
          ref={ref}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => pauseAndResumeLater()}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => pauseAndResumeLater()}
        >
          {testimonialCards.map((item, idx) => (
            <article
              key={item.name + item.tag}
              data-feedback-card="1"
              className={`w-[86%] shrink-0 snap-start rounded-2xl border p-3 shadow-[0_18px_40px_rgba(2,6,23,0.5)] transition-all sm:w-[46%] sm:rounded-3xl sm:p-4 lg:w-[32%] ${idx % 3 === 0 ? 'bg-[linear-gradient(155deg,rgba(15,23,42,0.92),rgba(8,47,73,0.5))]' : idx % 3 === 1 ? 'bg-[linear-gradient(155deg,rgba(15,23,42,0.92),rgba(30,58,138,0.42))]' : 'bg-[linear-gradient(155deg,rgba(15,23,42,0.92),rgba(180,83,9,0.28))]'} ${idx === activeIndex ? 'border-cyan-200/60 shadow-[0_0_0_1px_rgba(103,232,249,0.2),0_18px_38px_rgba(6,182,212,0.18)]' : 'border-cyan-300/25'}`}
            >
              <div className="rounded-2xl border border-cyan-300/18 bg-slate-950/60 p-2.5 backdrop-blur-sm">
                <div className="relative overflow-hidden rounded-xl">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_60%)]" />
                  <img
                    src={item.image}
                    alt={`${item.name} 反馈截图`}
                    className="relative z-[1] aspect-[4/5] w-full rounded-xl object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {dots.map((dot) => (
          <button
            key={dot}
            type="button"
            aria-label={`跳转到第 ${dot + 1} 条反馈`}
            className={`h-2.5 w-2.5 rounded-full transition ${dot === activeIndex ? 'bg-cyan-300' : 'bg-slate-600 hover:bg-slate-500'}`}
            onClick={() => {
              pauseAndResumeLater();
              setActiveIndex(dot);
              scrollToIndex(dot);
            }}
          />
        ))}
      </div>
    </section>
  );
}
