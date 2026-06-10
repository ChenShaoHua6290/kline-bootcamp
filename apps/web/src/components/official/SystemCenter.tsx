'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { KnowledgeSidebar } from './KnowledgeSidebar';
import { useActiveAnchor } from './useActiveAnchor';
import { systemNavGroups, systemSectionMedia, type SectionMediaItem } from '@/data/official-content';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

const sectionIds = systemNavGroups.flatMap((g) => g.items.map((i) => i.id));

function MediaPanel({ media }: { media: SectionMediaItem[] }) {
  return (
    <div className="rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4">
      <p className="text-xs text-slate-400">图文展示</p>
      {media.length === 0 ? (
        <div className="mt-2 h-32 rounded-lg border border-cyan-400/15 bg-[linear-gradient(140deg,rgba(8,47,73,0.35),rgba(15,23,42,0.8))]" />
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {media.map((item) => (
            <div key={`${item.src}-${item.title}`} className="rounded-lg border border-cyan-400/15 bg-slate-900/60 p-2">
              <img
                src={item.src}
                alt={item.title}
                className="h-28 w-full rounded-md bg-slate-800 object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <p className="mt-2 text-xs font-medium text-slate-200">{item.title}</p>
              {item.caption ? <p className="mt-1 text-[11px] text-slate-400">{item.caption}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StandardSection({ id, title, intro, points }: { id: string; title: string; intro: string; points: string[] }) {
  const media = systemSectionMedia[id] ?? [];
  const markdown = [intro, '', ...points.map((point) => `- ${point}`)].join('\n');
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
      <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4">
          <p className="text-xs text-slate-400">内容要点</p>
          <MarkdownRenderer content={markdown} className="mt-2 [&_li]:text-sm [&_li]:leading-7 [&_p]:text-sm [&_p]:leading-7" />
        </div>
        <MediaPanel media={media} />
      </div>
    </section>
  );
}

function TimelineSection() {
  const steps = ['认知', '模式', '规则', '指标', '共振', '训练', '复盘', '执行'];
  return (
    <section id="learning-flow" className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
      <h3 className="text-xl font-semibold text-slate-100">学习流程</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">认知 → 理解 → 训练 → 修正，逐步建立稳定执行能力。</p>
      <div className="mt-4 rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4">
        <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {steps.map((s, i) => (
            <div key={s} className="rounded-lg border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-center text-xs text-cyan-100">
              <div className="text-[10px] text-slate-400">阶段{i + 1}</div>
              <div className="mt-1 font-semibold">{s}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <MediaPanel media={systemSectionMedia['learning-flow'] ?? []} />
      </div>
    </section>
  );
}

function HighlightSection() {
  const items = ['只做一种模式', '固定交易逻辑', '多市场训练', '目标训练机制', '错题复盘', '多周期共振提醒', '学→练→用→复盘闭环'];
  return (
    <section id="system-advantages" className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
      <h3 className="text-xl font-semibold text-slate-100">体系亮点与优势</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((x) => (
          <div key={x} className="rounded-lg border border-cyan-400/20 bg-slate-950/55 px-3 py-2 text-sm text-slate-200">✔ {x}</div>
        ))}
      </div>
      <div className="mt-4">
        <MediaPanel media={systemSectionMedia['system-advantages'] ?? []} />
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing-notes" className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
      <h3 className="text-xl font-semibold text-slate-100">学习费用与说明</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4">
          <p className="text-sm font-semibold text-cyan-100">K线训练系统</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            <li>• 7天体验：39 RMB</li><li>• 月卡：99 RMB</li><li>• 季卡：269 RMB</li><li>• 年卡：569 RMB</li>
          </ul>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4">
          <p className="text-sm font-semibold text-cyan-100">完整交易体系</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            <li>• 系统课件</li><li>• 视频教学</li><li>• 指标系统</li><li>• 多周期共振提醒</li><li>• K线训练系统</li><li>• 训练与复盘逻辑</li>
          </ul>
          <Link href="#contact" className="mt-3 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100">咨询完整体系 →</Link>
        </div>
      </div>
    </section>
  );
}

function OutcomeSection() {
  const items = ['建立固定模式', '减少情绪化交易', '提高执行一致性', '建立复盘能力', '形成长期训练习惯'];
  return (
    <section id="learning-outcome" className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
      <h3 className="text-xl font-semibold text-slate-100">学习后的作用</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((x) => <div key={x} className="rounded-lg border border-cyan-400/20 bg-slate-950/55 px-3 py-2 text-sm text-slate-200">{x}</div>)}
      </div>
      <div className="mt-4">
        <MediaPanel media={systemSectionMedia['learning-outcome'] ?? []} />
      </div>
    </section>
  );
}

function FeedbackSection() {
  const items = [
    ['学习前', '看了很多方法，实盘执行很乱。'],
    ['学习后', '固定模式更清晰，盘中判断更稳定。'],
    ['执行变化', '不再频繁切换策略，进出场规则更统一。'],
    ['训练感受', '通过复盘更快发现错误并修正。'],
  ];
  return (
    <section id="student-feedback" className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
      <h3 className="text-xl font-semibold text-slate-100">学员收获与评价</h3>
      <p className="mt-2 text-sm text-slate-300">聚焦执行稳定、交易纪律与固定模式，不展示收益宣传。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-cyan-400/20 bg-slate-950/55 p-4">
            <p className="text-sm font-semibold text-cyan-100">{k}</p>
            <p className="mt-2 text-sm text-slate-300">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <MediaPanel media={systemSectionMedia['student-feedback'] ?? []} />
      </div>
    </section>
  );
}

function FaqInlineSection({ id, title, qa }: { id: string; title: string; qa: Array<[string, string]> }) {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
      <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
      <div className="mt-4 space-y-2">
        {qa.map(([q, a], idx) => {
          const open = idx === openIndex;
          return (
            <div key={q} className="rounded-xl border border-cyan-400/20 bg-slate-950/45">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-100"
                onClick={() => setOpenIndex(open ? -1 : idx)}
              >
                <span>{q}</span>
                <span className="text-cyan-300">{open ? '−' : '+'}</span>
              </button>
              {open ? (
                <div className="px-4 pb-4 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-300">
                  <MarkdownRenderer content={a} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SystemCenter() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = useActiveAnchor(sectionIds);
  const faqIds = useMemo(() => ['faq-system', 'faq-training', 'faq-access', 'faq-learning', 'faq-renewal'], []);
  const faqData: Record<string, Array<[string, string]>> = {
    'faq-system': [
      ['完整体系包含什么？', '包含系统课件、视频教学、指标系统、多周期共振提醒、K线训练系统和复盘训练逻辑。'],
      ['为什么只做一种模式？', '固定模式更容易建立一致性和可复盘能力，减少模式切换造成的执行混乱。'],
    ],
    'faq-training': [
      ['如何开始训练？', '登录后进入训练系统，选择市场、品种和周期后即可开始随机历史训练。'],
      ['如何查看历史记录？', '训练结束后在历史记录中查看完整操作轨迹并做复盘总结。'],
      ['是否支持股票？', '支持股票、期货、加密市场。'],
    ],
    'faq-access': [
      ['trial 和 paid 区别？', 'trial 有时长与每日次数限制；paid 在有效期内训练次数不限。'],
      ['内部用户是什么？', '内部用户通过内部邀请码开通，通常用于老学员或内部测试。'],
    ],
    'faq-learning': [
      ['建议学习顺序是什么？', '建议按“认知 → 模式 → 规则 → 指标 → 共振 → 训练 → 复盘”顺序推进。'],
      ['我已经有体系还需要学完整内容吗？', '可以先使用训练系统；若执行不稳定，建议补全课件与视频模块。'],
    ],
    'faq-renewal': [
      ['如何续费？', '通过官网咨询入口联系管理员，根据套餐续费开通。'],
      ['完整体系如何咨询？', '在体系中心或官网的咨询入口提交需求，获取完整体系说明。'],
    ],
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(165deg,#020617_0%,#03112a_45%,#020617_100%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-cyan-400/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs tracking-[0.14em] text-cyan-200">只做一种模式 · 体系中心</p>
            <h1 className="text-lg font-semibold text-slate-100">完整交易成长路径</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/official" className="rounded-lg border border-cyan-400/25 px-3 py-1.5 text-xs text-slate-200">返回官网</Link>
            <button className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 md:hidden" onClick={() => setMobileOpen((v) => !v)} type="button">
              {mobileOpen ? '收起目录' : '展开目录'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[300px_minmax(0,1fr)] sm:px-6">
        <div className={mobileOpen ? 'block' : 'hidden md:block'}>
          <div className="md:sticky md:top-24">
            <KnowledgeSidebar title="体系目录" groups={systemNavGroups} activeId={activeId} basePath="/system" />
          </div>
        </div>

        <div className="space-y-4">
          <section id="system-home" className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
            <h2 className="text-2xl font-semibold">这不是课程页，也不是工具页</h2>
            <MarkdownRenderer
              className="mt-3 [&_p]:text-sm [&_p]:leading-7"
              content="这里是「只做一种模式」体系中心，按“认知 → 理解 → 信任 → 转化”的节奏，完整展示学习内容、流程、训练、复盘与服务结构。"
            />
          </section>

          <StandardSection id="why-one-mode" title="为什么只做一种模式" intro="交易不稳定的核心问题通常不是信息不足，而是模式切换频繁、执行标准不统一。" points={['为什么大多数人交易不稳定', '为什么模式越多越乱', '为什么执行比技术更重要']} />
          <StandardSection id="learning-content" title="学习内容与体系" intro="学习内容围绕固定模式展开，形成完整结构。" points={['系统课件', '视频教学', '指标系统', '多周期共振提醒', 'K线训练系统', '复盘训练流程']} />
          <TimelineSection />
          <HighlightSection />
          <PricingSection />
          <OutcomeSection />
          <FeedbackSection />

          <StandardSection id="kline-intro" title="K线训练系统 · 系统介绍" intro="K线训练系统是体系中的训练模块，用于把规则练成执行能力。" points={['随机历史行情训练', '下一根推进', '买入/部分平仓/全部平仓', '历史记录与复盘']} />
          <StandardSection id="kline-start" title="如何开始训练" intro="从注册到开始训练，路径清晰。" points={['注册账号', '进入训练页', '选择市场/周期/根数', '开始训练']} />
          <StandardSection id="kline-flow" title="训练流程" intro="以真实执行节奏推进训练。" points={['观察结构', '等待机会', '执行买入', '风险控制', '结束复盘']} />
          <StandardSection id="kline-actions" title="买入 / 平仓操作" intro="操作简洁，聚焦执行。" points={['买入', '部分平仓', '全部平仓', '结束训练']} />
          <StandardSection id="kline-review" title="历史记录与复盘" intro="用记录反推执行问题。" points={['操作记录', '错题复盘', '训练统计']} />
          <StandardSection id="kline-target" title="目标训练机制" intro="通过目标约束提升训练质量。" points={['100次训练', '80%胜率', '连续完成3轮']} />
          <StandardSection id="kline-access" title="权限与套餐" intro="按阶段选择训练权限。" points={['试用用户', '月卡', '季卡', '年卡', '内部用户']} />

          <StandardSection id="full-courseware" title="完整交易体系 · 系统课件" intro="建立规则框架和判断顺序。" points={['市场结构', '趋势判断', '固定模式', '风险控制', '执行规则']} />
          <StandardSection id="full-video" title="完整交易体系 · 视频教学" intro="拆解案例，提升理解。" points={['实战案例', '模式拆解', '复盘思路']} />
          <StandardSection id="full-indicator" title="完整交易体系 · 指标系统" intro="辅助判断，不做预测承诺。" points={['指标逻辑', '结构辅助', '执行一致性']} />
          <StandardSection id="full-resonance" title="完整交易体系 · 多周期共振提醒" intro="降低盯盘压力，提高执行效率。" points={['共振逻辑', '提醒机制', '执行辅助']} />
          <StandardSection id="full-training-review" title="完整交易体系 · 训练与复盘逻辑" intro="训练与复盘构成闭环，持续修正。" points={['训练目标', '历史记录', '复盘总结', '执行修正']} />

          {faqIds.map((id) => (
            <FaqInlineSection
              key={id}
              id={id}
              title={`常见问题 · ${id.replace('faq-', '')}`}
              qa={faqData[id] ?? []}
            />
          ))}

          <section id="contact" className="scroll-mt-28 rounded-2xl border border-cyan-300/24 bg-[linear-gradient(145deg,rgba(14,116,144,0.25),rgba(2,6,23,0.96))] p-5">
            <h3 className="text-xl font-semibold text-slate-100">下一步</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">如果你希望系统化建立固定模式执行能力，可以先从训练系统开始，或直接咨询完整体系。</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/auth" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">立即注册</Link>
              <Link href="/system#faq-system" className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm text-slate-200">查看常见问题</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
