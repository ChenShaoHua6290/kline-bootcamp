"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HeroSection } from './home/HeroSection';
import { SystemOverviewSection } from './home/SystemOverviewSection';
import { PainPointsSection } from './home/PainPointsSection';
import { LearningFlowSection } from './home/LearningFlowSection';
import { TestimonialsSection } from './home/TestimonialsSection';
import { FaqSection } from './home/FaqSection';
import { SignupSection } from './home/SignupSection';
import { IcpFooter } from '@/components/IcpFooter';

const navItems = [
  { label: '首页', href: '#home' },
  { label: '服务介绍', href: '#service-intro' },
  { label: '价格', href: '#faq-fee' },
  { label: '学员反馈', href: '#testimonials' },
  { label: '常见问题', href: '#faq' },
];

export function OfficialLanding() {
  const navAnchors = useMemo(() => navItems.map((n) => n.href.replace('#', '')), []);
  const [activeNav, setActiveNav] = useState(navAnchors[0] ?? 'home');

  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (fromHash) setActiveNav(fromHash);

    const onHash = () => {
      const next = window.location.hash.replace('#', '');
      if (next) setActiveNav(next);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target?.id;
        if (id && navAnchors.includes(id)) setActiveNav(id);
      },
      { rootMargin: '-110px 0px -55% 0px', threshold: [0.2, 0.45, 0.7] },
    );

    navAnchors.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    window.addEventListener('hashchange', onHash);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', onHash);
    };
  }, [navAnchors]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_8%_-10%,rgba(56,189,248,0.34),transparent_36%),radial-gradient(circle_at_92%_-14%,rgba(14,165,233,0.32),transparent_42%),radial-gradient(circle_at_85%_24%,rgba(245,158,11,0.1),transparent_30%),radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.16),transparent_48%),linear-gradient(165deg,#020617_0%,#04142f_36%,#0a2442_60%,#020617_100%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-cyan-400/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-4 py-3 sm:px-6 lg:py-4">
          <a href="#home" className="text-sm font-bold tracking-[0.16em] text-cyan-100 sm:text-base">只做一种模式</a>
          <nav className="hidden items-center gap-8 text-base text-slate-300 md:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setActiveNav(item.href.replace('#', ''))}
                className={`rounded-xl px-3 py-2 transition-all duration-300 ${activeNav === item.href.replace('#', '') ? 'bg-cyan-500/16 text-cyan-100 shadow-[0_0_0_1px_rgba(103,232,249,0.2),0_10px_24px_rgba(8,145,178,0.18)]' : 'text-slate-300 hover:bg-cyan-500/10 hover:text-white'}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a href="#signup" className="rounded-xl bg-[linear-gradient(135deg,#67e8f9,#22d3ee_35%,#0ea5e9)] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_8px_24px_rgba(14,165,233,0.45)] transition-all hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#67e8f9,#22d3ee_30%,#0ea5e9_72%,#f59e0b)] hover:shadow-[0_10px_26px_rgba(245,158,11,0.24)]">我要报名</a>
        </div>
        <div className="md:hidden">
          <nav className="mx-auto flex max-w-[1360px] gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setActiveNav(item.href.replace('#', ''))}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-all ${activeNav === item.href.replace('#', '') ? 'bg-cyan-500/16 text-cyan-100 shadow-[0_0_0_1px_rgba(103,232,249,0.2)]' : 'text-slate-300 hover:bg-cyan-500/10 hover:text-white'}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <HeroSection />
      <div className="animate-[fadeInUp_.65s_ease-out] [animation-delay:.08s] [animation-fill-mode:both]">
        <SystemOverviewSection />
      </div>
      <div className="animate-[fadeInUp_.65s_ease-out] [animation-delay:.14s] [animation-fill-mode:both]">
        <PainPointsSection />
      </div>
      <div className="animate-[fadeInUp_.65s_ease-out] [animation-delay:.2s] [animation-fill-mode:both]">
        <LearningFlowSection />
      </div>
      <div className="animate-[fadeInUp_.65s_ease-out] [animation-delay:.26s] [animation-fill-mode:both]">
        <TestimonialsSection />
      </div>
      <div className="animate-[fadeInUp_.65s_ease-out] [animation-delay:.32s] [animation-fill-mode:both]">
        <FaqSection />
      </div>
      <div className="animate-[fadeInUp_.65s_ease-out] [animation-delay:.38s] [animation-fill-mode:both]">
        <SignupSection />
      </div>
      <IcpFooter className="border-t border-cyan-500/10 px-4 py-5" />
    </main>
  );
}
