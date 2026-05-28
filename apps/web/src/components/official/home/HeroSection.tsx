import Link from 'next/link';

export function HeroSection() {
  return (
    <section id="home" className="mx-auto max-w-[1360px] scroll-mt-24 px-4 pb-28 pt-6 sm:px-6 lg:pb-36 lg:pt-10">
      <div className="animate-[fadeInUp_.6s_ease-out] text-center">
        <p className="mb-4 text-sm tracking-[0.2em] text-cyan-300/80 sm:text-base">ONLY ONE PATTERN SYSTEM</p>
        <h1 className="text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
          <span className="bg-[linear-gradient(115deg,#f8fbff_0%,#c9eeff_42%,#67e8f9_82%,#22d3ee_100%)] bg-clip-text text-transparent">只做一种模式</span>
        </h1>
        <p className="mx-auto mt-7 max-w-3xl text-xl leading-[1.75] text-cyan-50 sm:text-2xl">
          真正稳定的交易，不是会很多模式。
          <br />
          而是把一种模式，理解透、训练熟、执行稳。
        </p>
        <p className="mx-auto mt-7 max-w-4xl text-[17px] leading-9 text-slate-300 sm:text-xl sm:leading-[1.85]">
          一套围绕固定交易模式搭建的完整交易体系，覆盖课件、视频、指标、共振提醒、K线训练与复盘流程，帮助建立固定模式、执行能力与交易纪律。
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#signup" className="rounded-2xl bg-[linear-gradient(135deg,#67e8f9,#22d3ee_35%,#0ea5e9)] px-7 py-3.5 text-base font-bold text-slate-950 shadow-[0_16px_36px_rgba(6,182,212,0.42)] transition-all hover:-translate-y-0.5 hover:brightness-110">立即报名</a>
          <Link href="/system" className="rounded-2xl border border-cyan-300/35 bg-slate-900/65 px-7 py-3.5 text-base font-semibold text-cyan-50 transition-all hover:-translate-y-0.5 hover:border-cyan-200/75 hover:bg-cyan-500/10">查看完整体系</Link>
        </div>
      </div>
    </section>
  );
}
