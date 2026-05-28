import Link from 'next/link';
import { painPoints } from '@/data/official-home-content';

export function PainPointsSection() {
  const featured = painPoints.filter((x) => x.title === '看得懂' || x.title === '复盘清楚');
  const rest = painPoints.filter((x) => x.title !== '看得懂' && x.title !== '复盘清楚');

  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 lg:pb-32">
      <h2 className="text-center text-[28px] font-semibold tracking-[-0.02em] text-slate-100 sm:text-[32px] lg:text-[38px]">你是否有以下困惑</h2>
      <p className="mt-4 text-center text-base leading-8 text-slate-300 sm:text-lg">为什么很多人：学了几年交易，依然做不好？</p>

      <div className="mt-6 grid gap-3 lg:grid-cols-12">
        {featured.map((item, idx) => (
          <article
            key={item.title}
            className={`lg:col-span-6 rounded-[30px] border border-cyan-300/25 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200/55 ${idx === 0 ? 'bg-[linear-gradient(145deg,rgba(15,23,42,0.94),rgba(8,47,73,0.42))]' : 'bg-[linear-gradient(145deg,rgba(15,23,42,0.94),rgba(30,64,175,0.36))]'}`}
          >
            <p className="text-[26px] font-semibold leading-[1.3] text-cyan-100 sm:text-[30px]">{item.title}</p>
            <p className="mt-3 text-[18px] leading-8 text-slate-200">{item.desc}</p>
          </article>
        ))}

        <div className="lg:col-span-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {rest.map((item, idx) => (
            <article
              key={item.title + item.desc}
              className={`rounded-2xl border border-cyan-300/20 px-4 py-4 shadow-[0_12px_30px_rgba(2,6,23,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200/50 ${idx % 3 === 0 ? 'bg-[linear-gradient(145deg,rgba(15,23,42,0.8),rgba(14,116,144,0.22))]' : idx % 3 === 1 ? 'bg-[linear-gradient(145deg,rgba(15,23,42,0.8),rgba(30,58,138,0.22))]' : 'bg-[linear-gradient(145deg,rgba(15,23,42,0.8),rgba(180,83,9,0.18))]'}`}
            >
              <p className="text-[18px] font-semibold leading-tight text-cyan-100">{item.title}</p>
              <p className="mt-2 text-base leading-7 text-slate-300">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-5xl text-center text-base leading-8 text-slate-300 sm:text-lg sm:leading-9">
        真正限制大多数人的，不是“没学过技术”，而是没有建立固定模式 + 执行体系 + 训练流程。
        所以我们整理了「只做一种模式」完整交易系统体系。
      </p>
      <div className="mt-6 text-center">
        <Link href="/system#why-one-mode" className="inline-flex items-center rounded-xl border border-cyan-300/30 px-5 py-2.5 text-base font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-500/10">查看体系逻辑 →</Link>
      </div>
    </section>
  );
}
