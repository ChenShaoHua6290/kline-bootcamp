'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageDescription, PageTitle } from '@/components/ui/PageHeader';
import { MarkdownRenderer, MarkdownToc, getMarkdownHeadings } from '@/components/markdown/MarkdownRenderer';

const indicatorMarkdown = [
  '# 指标系统说明',
  '',
  '指标系统用于降低观察成本、统一执行标准，但它不是预测工具，也不是买卖点生成器。',
  '',
  '## 指标安装说明',
  '',
  '安装前先确认你使用的交易软件版本、指标文件来源和参数说明。后台课程中可以绑定安装课件、演示视频或 PDF 附件。',
  '',
  '1. 按交易软件版本选择对应安装方式',
  '2. 导入指标文件或复制指标脚本',
  '3. 检查颜色、参数和提醒开关',
  '4. 用历史行情确认显示效果是否正常',
  '',
  '> [!TIP]',
  '> 第一次安装后，先不要直接用于实盘判断。建议在 K线训练系统中对照历史行情检查指标显示是否符合你的观察习惯。',
  '',
  '## 指标使用逻辑',
  '',
  '指标只服务于固定模式的执行过程。正确顺序应该是：**先判断结构和趋势，再用指标辅助确认观察点**。',
  '',
  '| 判断顺序 | 关注内容 | 指标作用 |',
  '|---|---|---|',
  '| 第一步 | 市场结构 | 不替代结构判断 |',
  '| 第二步 | 趋势方向 | 辅助过滤无效位置 |',
  '| 第三步 | 固定模式 | 辅助确认执行条件 |',
  '| 第四步 | 风险控制 | 不替代仓位和止损规则 |',
  '',
  '## 指标不是预测工具',
  '',
  '> [!IMPORTANT]',
  '> 指标的价值是让你少看漏、少看乱，而不是提前知道行情会怎么走。',
  '',
  '任何指标提示都必须回到体系规则里确认：当前位置是否符合结构、趋势是否明确、风险是否可控、是否满足固定模式。',
  '',
  '## 常见错误用法',
  '',
  '- 看到指标信号就追单',
  '- 忽略趋势和结构位置',
  '- 不设止损或临盘扩大风险',
  '- 把指标当预测工具而不是执行辅助',
  '- 多个指标互相叠加，最后失去固定判断标准',
  '',
  '> [!WARNING]',
  '> 如果你发现自己不断增加指标，大概率不是工具不够，而是交易规则还没有收敛。',
  '',
  '## 建议训练方式',
  '',
  '1. 先关闭指标，独立判断结构',
  '2. 再打开指标，检查提示是否只是辅助确认',
  '3. 每次训练后记录：本次执行是按规则，还是按信号冲动操作',
  '4. 复盘时只评价规则执行质量，不评价单次盈亏',
].join('\n');

export default function IndicatorsPage() {
  const headings = getMarkdownHeadings(indicatorMarkdown);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),#020617] text-slate-100">
      <header className="app-nav">
        <div className="app-nav-row max-w-[1120px]">
          <div className="app-nav-heading">
            <PageTitle className="!text-lg sm:!text-xl">指标系统说明</PageTitle>
            <PageDescription className="app-nav-description">指标不是预测工具，而是固定模式的执行辅助工具。</PageDescription>
          </div>
          <div className="app-nav-actions">
            <Link href="/courses"><Button size="sm" variant="ghost">返回课程中心</Button></Link>
            <Link href="/alerts"><Button size="sm" variant="primary">查看共振提醒</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1120px] gap-4 px-3 py-4 sm:px-4 sm:py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-slate-700/80 bg-slate-900/70 p-0">
          <div className="border-b border-slate-800/90 px-4 py-4 sm:px-5">
            <Badge tone="info">执行辅助</Badge>
            <h1 className="mt-3 text-xl font-semibold text-slate-100 sm:text-2xl">先有规则，再用指标</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">统一使用 MarkdownRenderer 展示，方便后续把后台维护的指标说明直接迁移进来。</p>
          </div>
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <MarkdownRenderer content={indicatorMarkdown} />
          </div>
        </Card>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <MarkdownToc headings={headings} />
          <Card className="border-cyan-400/20 bg-cyan-500/10 p-4">
            <div className="text-sm font-semibold text-cyan-100">相关入口</div>
            <div className="mt-3 grid gap-2">
              <Link href="/alerts"><Button className="w-full justify-start" variant="ghost">多周期共振提醒</Button></Link>
              <Link href="/train?start=1"><Button className="w-full justify-start" variant="ghost">进入K线训练</Button></Link>
            </div>
          </Card>
        </aside>
      </section>
    </main>
  );
}
