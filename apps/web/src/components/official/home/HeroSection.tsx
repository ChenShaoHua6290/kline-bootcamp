import Link from 'next/link';

export function HeroSection() {
  return (
    <section id="home" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-32 pt-8 sm:px-6 lg:pb-44 lg:pt-14">
      <div className="animate-[fadeInUp_.6s_ease-out] text-center">
        <p className="mb-4 text-xs tracking-[0.22em] text-cyan-300/80 sm:text-sm">ONLY ONE PATTERN SYSTEM</p>
        <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[52px] lg:text-[64px]">
          <span className="bg-[linear-gradient(115deg,#f8fbff_0%,#c9eeff_42%,#67e8f9_82%,#22d3ee_100%)] bg-clip-text text-transparent">只做一种模式</span>
        </h1>
        <p className="mx-auto mt-7 max-w-3xl text-[20px] font-medium leading-[1.7] text-cyan-50 sm:text-[24px]">
          真正稳定的交易，不是会很多模式。
          <br />
          而是把一种模式，理解透、训练熟、执行稳。
        </p>
        <p className="mx-auto mt-7 max-w-4xl text-base leading-8 text-slate-300 sm:text-lg sm:leading-9">
          一套围绕固定交易模式搭建的完整交易体系，覆盖课件、视频、指标、共振提醒、K线训练与复盘流程，1v1帮助建立固定模式、执行能力与交易纪律。
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#signup" className="rounded-2xl bg-[linear-gradient(135deg,#67e8f9,#22d3ee_35%,#0ea5e9)] px-7 py-3.5 text-base font-bold text-slate-950 shadow-[0_16px_36px_rgba(6,182,212,0.42)] transition-all hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#67e8f9,#22d3ee_28%,#0ea5e9_72%,#f59e0b)] hover:shadow-[0_18px_38px_rgba(245,158,11,0.26)]">立即报名</a>
          <Link href="/auth" className="rounded-2xl border border-cyan-300/35 bg-slate-900/65 px-7 py-3.5 text-base font-semibold text-cyan-50 transition-all hover:-translate-y-0.5 hover:border-amber-200/65 hover:bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(245,158,11,0.12))]">开始K线训练</Link>
        </div>
      </div>
    </section>
  );
}
