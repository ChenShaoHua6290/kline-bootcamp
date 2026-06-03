import Link from 'next/link';

export function HeroSection() {
  return (
    <section id="home" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-20 pt-7 sm:px-6 sm:pb-28 lg:pb-44 lg:pt-14">
      <div className="animate-[fadeInUp_.6s_ease-out] text-center">
        <p className="mb-3 text-xs tracking-[0.14em] text-cyan-300/80 sm:mb-4 sm:text-sm sm:tracking-[0.22em]">ONLY ONE PATTERN SYSTEM</p>
        <h1 className="text-[36px] font-extrabold leading-[1.12] tracking-[-0.02em] sm:text-[52px] lg:text-[64px]">
          <span className="bg-[linear-gradient(115deg,#f8fbff_0%,#c9eeff_42%,#67e8f9_82%,#22d3ee_100%)] bg-clip-text text-transparent">只做一种模式</span>
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-[18px] font-medium leading-[1.65] text-cyan-50 sm:mt-7 sm:text-[24px]">
          真正稳定的交易，不是会很多模式。
          <br />
          而是把一种模式，理解透、训练熟、执行稳。
        </p>
        <p className="mx-auto mt-5 max-w-4xl text-[15px] leading-7 text-slate-300 sm:mt-7 sm:text-lg sm:leading-9">
          一套围绕固定交易模式搭建的完整交易体系，覆盖课件、视频、指标、共振提醒、K线训练与复盘流程，1v1帮助建立固定模式、执行能力与交易纪律。
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
          <a href="#signup" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#67e8f9,#22d3ee_35%,#0ea5e9)] px-6 py-3 text-base font-bold text-slate-950 shadow-[0_16px_36px_rgba(6,182,212,0.42)] transition-all hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#67e8f9,#22d3ee_28%,#0ea5e9_72%,#f59e0b)] hover:shadow-[0_18px_38px_rgba(245,158,11,0.26)] sm:rounded-2xl sm:px-7 sm:py-3.5">立即报名</a>
          <Link href="/auth" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-300/35 bg-slate-900/65 px-6 py-3 text-base font-semibold text-cyan-50 transition-all hover:-translate-y-0.5 hover:border-amber-200/65 hover:bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(245,158,11,0.12))] sm:rounded-2xl sm:px-7 sm:py-3.5">开始K线训练</Link>
        </div>
      </div>
    </section>
  );
}
