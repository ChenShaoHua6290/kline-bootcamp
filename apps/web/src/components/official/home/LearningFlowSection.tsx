import { learningStages } from '@/data/official-home-content';

export function LearningFlowSection() {
  const firstRow = learningStages.slice(0, 3);
  const secondRow = learningStages.slice(3, 6);

  return (
    <section className="mx-auto max-w-[1360px] px-4 pb-28 sm:px-6 lg:pb-36">
      <h2 className="text-center text-[28px] font-semibold tracking-[-0.01em] sm:text-4xl lg:text-[38px]">完整学习与训练流程</h2>
      <p className="mt-3 text-center text-base leading-7 text-slate-300 sm:text-lg">从认知，到训练，再到执行。</p>

      <div className="mt-10">
        <div className="hidden xl:block">
          <div className="flex items-center justify-center gap-3">
            {firstRow.map((stage, idx) => (
              <div key={stage.title} className="flex items-center gap-3">
                <div className="w-[286px] rounded-3xl border border-cyan-300/25 bg-slate-900/55 p-4 shadow-[0_12px_34px_rgba(2,6,23,0.4)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200/55">
                  <p className="text-xs tracking-[0.1em] text-cyan-300">{stage.title}</p>
                  <p className="mt-1.5 text-[24px] font-semibold leading-[1.35] text-slate-100">{stage.subtitle}</p>
                  <ul className="mt-2.5 space-y-1 text-base leading-8 text-slate-300">
                    {stage.points.slice(0, 3).map((p) => (
                      <li key={p}>• {p}</li>
                    ))}
                  </ul>
                </div>
                {idx < firstRow.length - 1 ? <div className="text-2xl text-cyan-300/80">→</div> : null}
              </div>
            ))}
          </div>

          <div className="my-3 flex justify-center text-2xl text-cyan-300/80">↓</div>

          <div className="flex items-center justify-center gap-3">
            {secondRow.map((stage, idx) => (
              <div key={stage.title} className="flex items-center gap-3">
                <div className="w-[286px] rounded-3xl border border-cyan-300/25 bg-slate-900/55 p-4 shadow-[0_12px_34px_rgba(2,6,23,0.4)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200/55">
                  <p className="text-xs tracking-[0.1em] text-cyan-300">{stage.title}</p>
                  <p className="mt-1.5 text-[24px] font-semibold leading-[1.35] text-slate-100">{stage.subtitle}</p>
                  <ul className="mt-2.5 space-y-1 text-base leading-8 text-slate-300">
                    {stage.points.slice(0, 3).map((p) => (
                      <li key={p}>• {p}</li>
                    ))}
                  </ul>
                </div>
                {idx < secondRow.length - 1 ? <div className="text-2xl text-cyan-300/80">→</div> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 xl:hidden">
          {learningStages.map((stage, idx) => (
            <div key={stage.title} className="flex flex-col items-center">
              <div className="w-full rounded-3xl border border-cyan-300/25 bg-slate-900/55 p-5 shadow-[0_12px_34px_rgba(2,6,23,0.4)] transition-all duration-300 hover:border-cyan-200/55">
                <p className="text-xs tracking-[0.1em] text-cyan-300">{stage.title}</p>
                <p className="mt-1.5 text-base font-semibold leading-7 text-slate-100">{stage.subtitle}</p>
                <ul className="mt-2.5 space-y-1 text-sm leading-7 text-slate-300">
                  {stage.points.slice(0, 3).map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              </div>
              {idx < learningStages.length - 1 ? <div className="mt-2 text-2xl text-cyan-300/80">↓</div> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
