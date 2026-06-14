'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageDescription, PageTitle } from '@/components/ui/PageHeader';
import { MarkdownRenderer, MarkdownToc, getMarkdownHeadings } from '@/components/markdown/MarkdownRenderer';

const alertsMarkdown = [
  '# 多周期共振提醒',
  '',
  '多周期共振提醒用于提示值得观察的结构状态，帮助减少盯盘成本，让注意力回到固定模式。',
  '',
  '## 共振提醒是什么',
  '',
  '共振提醒不是买卖信号，而是一个观察提示：当多个周期的结构、趋势和辅助条件进入同一方向时，系统把这个状态提示给你。',
  '',
  '> [!NOTE]',
  '> 提醒只负责告诉你“这里值得观察”，不负责告诉你“必须交易”。',
  '',
  '## 触发逻辑说明',
  '',
  '提醒通常来自多个条件的组合，包含但不限于结构位置、指标状态、趋势方向和执行条件。',
  '',
  '| 触发维度 | 含义 | 使用方式 |',
  '|---|---|---|',
  '| 结构位置 | 当前是否接近固定模式观察区 | 先判断，不直接下单 |',
  '| 趋势方向 | 多周期方向是否一致 | 过滤逆势冲动 |',
  '| 指标状态 | 是否出现辅助提示 | 只做确认，不做预测 |',
  '| 风险空间 | 止损和目标是否合理 | 不合理则放弃 |',
  '',
  '## 如何结合体系使用',
  '',
  '收到提醒后，建议按以下顺序处理：',
  '',
  '1. 回看大周期结构',
  '2. 确认当前趋势方向',
  '3. 检查是否满足固定模式',
  '4. 计算风险空间和仓位',
  '5. 执行后记录原因，训练或实盘后复盘',
  '',
  '> [!TIP]',
  '> 最好的提醒使用方式，是让它帮你回到规则，而不是让它替你做决定。',
  '',
  '## 提醒不是喊单',
  '',
  '> [!WARNING]',
  '> 共振提醒不是喊单，不是收益承诺，也不替代你的独立判断。它只是辅助观察工具。',
  '',
  '如果你收到提醒后没有看到明确结构，或者风险空间不合适，就应该跳过。体系训练的重点是执行一致性，而不是抓住每一次波动。',
  '',
  '## 训练建议',
  '',
  '- 把每次提醒当成观察题，而不是交易命令',
  '- 在 K线训练中记录提醒出现后的判断过程',
  '- 复盘时比较“提醒出现”和“固定模式成立”之间的差异',
  '- 不要因为提醒频繁就提高交易频率',
].join('\n');

export default function AlertsPage() {
  const headings = getMarkdownHeadings(alertsMarkdown);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_30%),radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_32%),#020617] text-slate-100">
      <header className="app-nav">
        <div className="app-nav-row max-w-[1120px]">
          <div className="app-nav-heading">
            <PageTitle className="!text-lg sm:!text-xl">多周期共振提醒</PageTitle>
            <PageDescription className="app-nav-description">提醒是辅助观察，不是喊单，也不是预测。</PageDescription>
          </div>
          <div className="app-nav-actions">
            <Link href="/courses"><Button size="sm" variant="ghost">返回课程中心</Button></Link>
            <Link href="/indicators"><Button size="sm" variant="primary">查看指标说明</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1120px] gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-slate-700/80 bg-slate-900/70 p-0">
          <div className="border-b border-slate-800/90 px-5 py-4">
            <Badge tone="warning">辅助观察</Badge>
            <h1 className="mt-3 text-2xl font-semibold text-slate-100">提醒只负责把你带回观察点</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">统一使用 MarkdownRenderer 展示，后续可直接把后台维护的共振提醒说明迁移到同一套内容字段。</p>
          </div>
          <div className="px-5 py-5">
            <MarkdownRenderer content={alertsMarkdown} />
          </div>
        </Card>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <MarkdownToc headings={headings} />
          <Card className="border-amber-400/20 bg-amber-500/10 p-4">
            <div className="text-sm font-semibold text-amber-100">建议流程</div>
            <div className="mt-3 grid gap-2">
              {['收到提醒', '回看结构', '确认固定模式', '进入训练/复盘'].map((item, idx) => (
                <div key={item} className="rounded-xl border border-amber-400/20 bg-slate-950/40 px-3 py-3 text-sm text-slate-200">
                  <span className="mr-2 text-amber-300">{idx + 1}</span>{item}
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </section>
    </main>
  );
}
