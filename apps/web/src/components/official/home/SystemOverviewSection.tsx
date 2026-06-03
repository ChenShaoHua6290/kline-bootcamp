import { systemCards } from '@/data/official-home-content';

const orbitConfig = [
  'lg:top-3 lg:left-1/2 lg:-translate-x-1/2',
  'lg:top-1/2 lg:right-6 lg:-translate-y-1/2',
  'lg:bottom-3 lg:left-1/2 lg:-translate-x-1/2',
  'lg:top-1/2 lg:left-6 lg:-translate-y-1/2',
] as const;

export function SystemOverviewSection() {
  const centerCard = systemCards[4];
  const orbitCards = systemCards.slice(0, 4);

  return (
    <section id="service-intro" className="mx-auto max-w-[1320px] scroll-mt-24 px-4 pb-20 sm:px-6 sm:pb-28 lg:pb-36">
      <div className="mb-4 text-center lg:mb-6">
        <h2 className="text-[25px] font-semibold leading-tight tracking-[-0.02em] text-slate-100 sm:text-[32px] lg:text-[38px]">一套完整的交易系统体系</h2>
        <p className="mx-auto mt-2 max-w-3xl text-[15px] leading-7 text-slate-300 sm:mt-1 sm:text-lg sm:leading-9">学 → 看 → 辅助 → 训练 → 复盘，形成完整闭环。</p>
      </div>

      <div className="rounded-3xl border border-cyan-300/20 bg-[linear-gradient(160deg,rgba(15,23,42,0.84),rgba(8,47,73,0.36))] p-3 shadow-[0_20px_52px_rgba(2,6,23,0.48)] sm:p-6 lg:p-6">
        <div className="grid gap-5 lg:hidden">
          <CenterCard title={centerCard?.title ?? ''} lines={centerCard?.lines ?? []} />
          <div className="grid gap-4 sm:grid-cols-2">
            {orbitCards.map((card) => (
              <OrbitCard key={card.title} title={card.title} lines={card.lines} />
            ))}
          </div>
        </div>

        <div className="relative hidden min-h-[590px] lg:block">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />

          <div className="absolute left-1/2 top-1/2 w-[286px] -translate-x-1/2 -translate-y-1/2">
            <CenterCard title={centerCard?.title ?? ''} lines={centerCard?.lines ?? []} />
          </div>

          {orbitCards.map((card, idx) => (
            <div key={card.title} className={`absolute w-[270px] ${orbitConfig[idx]}`}>
              <OrbitCard title={card.title} lines={card.lines} />
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

function CenterCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-cyan-200/35 bg-[linear-gradient(145deg,rgba(14,165,233,0.2),rgba(15,23,42,0.88))] px-4 py-4 text-left shadow-[0_16px_38px_rgba(2,6,23,0.44)] sm:rounded-[26px]">
      <p className="text-xs tracking-[0.14em] text-cyan-200/90 sm:text-sm sm:tracking-[0.2em]">只做一种模式</p>
      <h3 className="mt-2 text-[20px] font-semibold leading-[1.3] text-slate-100">{title}</h3>
      <ul className="mt-3 space-y-0.5 text-[15px] leading-6 text-slate-200/95">
        {lines.map((x) => <li key={x}>• {x}</li>)}
      </ul>
      {/* <p className="mt-3 text-xs text-cyan-100/80">只做一种模式</p> */}
    </div>
  );
}

function OrbitCard({ title, lines }: { title: string; lines: string[] }) {
  const toneByTitle: Record<string, string> = {
    系统课件: 'bg-[linear-gradient(150deg,rgba(15,23,42,0.92),rgba(8,47,73,0.38))]',
    视频教学: 'bg-[linear-gradient(150deg,rgba(15,23,42,0.92),rgba(30,58,138,0.34))]',
    指标系统: 'bg-[linear-gradient(150deg,rgba(15,23,42,0.92),rgba(14,116,144,0.34))]',
    多周期共振提醒: 'bg-[linear-gradient(150deg,rgba(15,23,42,0.92),rgba(180,83,9,0.26))]',
  };
  const toneClass = toneByTitle[title] ?? 'bg-slate-950/55';

  return (
    <div className={`rounded-2xl border border-cyan-300/25 ${toneClass} p-4 shadow-[0_14px_34px_rgba(2,6,23,0.4)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200/60 hover:shadow-[0_18px_34px_rgba(8,145,178,0.2)] sm:rounded-3xl`}>
      <h3 className="text-[20px] font-semibold text-slate-100">{title}</h3>
      <ul className="mt-3 space-y-0.5 text-[15px] leading-6 text-slate-300">
        {lines.map((x) => <li key={x}>• {x}</li>)}
      </ul>
    </div>
  );
}
