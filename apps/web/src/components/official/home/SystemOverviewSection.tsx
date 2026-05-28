import Link from 'next/link';
import { systemCards } from '@/data/official-home-content';

export function SystemOverviewSection() {
  return (
    <section id="service-intro" className="mx-auto max-w-[1360px] scroll-mt-24 px-4 pb-28 sm:px-6 lg:pb-36">
      <div className="mb-10 text-center">
        <h2 className="text-[30px] font-semibold tracking-[-0.01em] sm:text-4xl lg:text-[40px]">一套完整的交易系统体系</h2>
        <p className="mt-4 text-lg leading-8 text-slate-300 sm:text-xl">学 → 看 → 辅助 → 训练 → 复盘，形成完整闭环。</p>
      </div>

      <div className="rounded-[28px] border border-cyan-300/20 bg-slate-900/45 p-5 shadow-[0_22px_55px_rgba(2,6,23,0.45)] sm:p-7">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {systemCards.map((card) => (
            <Card key={card.title} title={card.title} lines={card.lines} />
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/system#learning-content" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">进入体系中心查看详情 →</Link>
      </div>
    </section>
  );
}

function Card({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-3xl border border-cyan-300/25 bg-slate-950/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200/70 hover:shadow-[0_16px_36px_rgba(6,182,212,0.14)]">
      <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
      <ul className="mt-3 space-y-2 text-base leading-8 text-slate-300">
        {lines.map((x) => <li key={x}>• {x}</li>)}
      </ul>
    </div>
  );
}
