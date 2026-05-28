import Link from 'next/link';
import { painPoints } from '@/data/official-home-content';

export function PainPointsSection() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 pb-28 sm:px-6 lg:pb-36">
      <h2 className="text-center text-[28px] font-semibold tracking-[-0.01em] text-slate-100 sm:text-[34px]">你是否有以下困惑</h2>
      <p className="mt-3 text-center text-[17px] text-slate-300 sm:text-[21px]">为什么很多人：学了几年交易，依然做不好？</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {painPoints.map((item) => (
          <div key={item.title + item.desc} className="rounded-3xl border border-cyan-400/20 bg-slate-900/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/45 hover:shadow-[0_14px_30px_rgba(8,145,178,0.14)] sm:p-6">
            <p className="text-[22px] font-semibold leading-tight text-cyan-100 sm:text-[24px]">{item.title}</p>
            <p className="mt-2.5 text-base leading-8 text-slate-300">{item.desc}</p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-5xl text-center text-base leading-9 text-slate-300 sm:text-lg sm:leading-[1.95]">
        真正限制大多数人的，不是“没学过技术”，而是没有建立固定模式 + 执行体系 + 训练流程。
        所以我们整理了「只做一种模式」完整交易系统体系。
      </p>
      <div className="mt-5 text-center">
        <Link href="/system#why-one-mode" className="text-base font-semibold text-cyan-200 transition hover:text-cyan-100">查看体系逻辑 →</Link>
      </div>
    </section>
  );
}
