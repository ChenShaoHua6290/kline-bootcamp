 'use client';

import { useState } from 'react';
import { learningStages } from '@/data/official-home-content';

const routeLabels = ['认知', '模式', '指标/共振', '训练', '复盘', '执行'];

export function LearningFlowSection() {
  const [activeStage, setActiveStage] = useState(4);

  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 sm:pb-24 lg:pb-32">
      <h2 className="text-center text-[25px] font-semibold leading-tight tracking-[-0.02em] text-slate-100 sm:text-[32px] lg:text-[38px]">完整学习与训练流程</h2>
      <p className="mt-3 text-center text-[15px] leading-7 text-slate-300 sm:mt-4 sm:text-lg sm:leading-8">从认知，到训练，再到执行。</p>

      <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-[linear-gradient(165deg,rgba(15,23,42,0.85),rgba(7,29,51,0.52))] p-3 shadow-[0_24px_60px_rgba(2,6,23,0.5)] sm:mt-6 sm:p-6 lg:p-8">
        <div className="hidden lg:block">
          <div className="relative px-2">
            <div className="absolute left-5 right-5 top-[30px] h-px bg-cyan-300/30" />
            <div className="grid grid-cols-6 gap-3">
              {routeLabels.map((label, idx) => (
                <div key={label} className="relative text-center">
                  <div className={`mx-auto h-4 w-4 rounded-full border transition-all ${idx === activeStage ? 'border-amber-200/70 bg-amber-400/80 shadow-[0_0_0_8px_rgba(251,191,36,0.14)]' : 'border-cyan-200/55 bg-cyan-400/70 shadow-[0_0_0_8px_rgba(56,189,248,0.12)]'}`} />
                  <p className={`mt-3 text-sm font-semibold tracking-[0.08em] transition-colors ${idx === activeStage ? 'text-amber-100' : 'text-cyan-100'}`}>0{idx + 1}</p>
                  <p className={`mt-1 text-base transition-colors ${idx === activeStage ? 'text-amber-100' : 'text-slate-200'}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            {learningStages.map((stage, idx) => (
              <article
                key={stage.title}
                onClick={() => setActiveStage(idx)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 ${idx % 3 === 0 ? 'bg-[linear-gradient(150deg,rgba(15,23,42,0.9),rgba(8,47,73,0.28))]' : idx % 3 === 1 ? 'bg-[linear-gradient(150deg,rgba(15,23,42,0.9),rgba(30,58,138,0.24))]' : 'bg-[linear-gradient(150deg,rgba(15,23,42,0.9),rgba(180,83,9,0.18))]'} ${idx === activeStage ? 'border-amber-200/65 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_16px_30px_rgba(245,158,11,0.12)]' : 'border-cyan-300/20 hover:border-cyan-200/60'}`}
              >
                <p className="text-xs font-medium tracking-[0.12em] text-cyan-300">{stage.title}</p>
                <p className="mt-1 text-[19px] font-semibold leading-[1.35] text-slate-100">{stage.subtitle}</p>
                <ul className="mt-2 space-y-0 text-base leading-7 text-slate-300">
                  {stage.points.slice(0, 3).map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-3 lg:hidden">
          {learningStages.map((stage, idx) => (
            <div
              key={stage.title}
              onClick={() => setActiveStage(idx)}
              className={`relative cursor-pointer rounded-2xl border p-4 ${idx % 3 === 0 ? 'bg-[linear-gradient(150deg,rgba(15,23,42,0.9),rgba(8,47,73,0.28))]' : idx % 3 === 1 ? 'bg-[linear-gradient(150deg,rgba(15,23,42,0.9),rgba(30,58,138,0.24))]' : 'bg-[linear-gradient(150deg,rgba(15,23,42,0.9),rgba(180,83,9,0.18))]'} ${idx === activeStage ? 'border-amber-200/65' : 'border-cyan-300/20'}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-cyan-200/50 text-xs font-semibold text-cyan-100">{idx + 1}</span>
                <p className="text-sm text-cyan-200">{routeLabels[Math.min(idx, routeLabels.length - 1)]}</p>
              </div>
              <p className="text-xs font-medium tracking-[0.12em] text-cyan-300">{stage.title}</p>
              <p className="mt-1 text-lg font-semibold leading-7 text-slate-100">{stage.subtitle}</p>
              <ul className="mt-2 space-y-0 text-base leading-7 text-slate-300">
                {stage.points.slice(0, 3).map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
