'use client';

import Link from 'next/link';
import { useState } from 'react';
import { KnowledgeSidebar } from './KnowledgeSidebar';
import { useActiveAnchor } from './useActiveAnchor';
import { faqNavGroups } from '@/data/official-content';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

const faqData = {
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
} as const;

const ids = ['faq-system', 'faq-training', 'faq-access', 'faq-learning', 'faq-renewal'];

function FaqSection({ id, title, items }: { id: string; title: string; items: readonly (readonly [string, string])[] }) {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-cyan-400/20 bg-slate-900/55 p-5">
      <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.map(([q, a], idx) => {
          const open = openIndex === idx;
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

export function FaqCenter() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = useActiveAnchor(ids);

  return (
    <main className="min-h-screen bg-[linear-gradient(165deg,#020617_0%,#03112a_45%,#020617_100%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-cyan-400/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs tracking-[0.14em] text-cyan-200">FAQ 中心</p>
            <h1 className="text-lg font-semibold text-slate-100">常见问题知识库</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/system" className="rounded-lg border border-cyan-400/25 px-3 py-1.5 text-xs text-slate-200">返回体系中心</Link>
            <button className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 md:hidden" onClick={() => setMobileOpen((v) => !v)} type="button">
              {mobileOpen ? '收起目录' : '展开目录'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[280px_minmax(0,1fr)] sm:px-6">
        <div className={mobileOpen ? 'block' : 'hidden md:block'}>
          <div className="md:sticky md:top-24">
            <KnowledgeSidebar title="FAQ 分类" groups={faqNavGroups} activeId={activeId} basePath="/faq" />
          </div>
        </div>
        <div className="space-y-4">
          <FaqSection id="faq-system" title="体系相关" items={faqData['faq-system']} />
          <FaqSection id="faq-training" title="系统相关" items={faqData['faq-training']} />
          <FaqSection id="faq-access" title="权限相关" items={faqData['faq-access']} />
          <FaqSection id="faq-learning" title="学习相关" items={faqData['faq-learning']} />
          <FaqSection id="faq-renewal" title="续费相关" items={faqData['faq-renewal']} />
        </div>
      </div>
    </main>
  );
}
