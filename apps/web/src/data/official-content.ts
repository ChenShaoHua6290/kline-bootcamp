export type NavLeaf = { id: string; label: string };
export type NavGroup = { id: string; icon?: string; label: string; items: NavLeaf[] };
export type SectionMediaItem = { src: string; title: string; caption?: string };

export const systemNavGroups: NavGroup[] = [
  { id: 'home', icon: '🏠', label: '首页', items: [{ id: 'system-home', label: '体系中心总览' }] },
  {
    id: 'service',
    icon: '🚀',
    label: '服务介绍（必看）',
    items: [
      { id: 'why-one-mode', label: '为什么只做一种模式' },
      { id: 'learning-content', label: '学习内容与体系' },
      { id: 'learning-flow', label: '学习流程' },
      { id: 'system-advantages', label: '体系亮点与优势' },
      { id: 'pricing-notes', label: '学习费用与说明' },
      { id: 'learning-outcome', label: '学习后的作用' },
      { id: 'student-feedback', label: '学员收获与评价' },
    ],
  },
  {
    id: 'training',
    icon: '🎯',
    label: 'K线训练系统',
    items: [
      { id: 'kline-intro', label: '系统介绍' },
      { id: 'kline-start', label: '如何开始训练' },
      { id: 'kline-flow', label: '训练流程' },
      { id: 'kline-actions', label: '买入/平仓操作' },
      { id: 'kline-review', label: '历史记录与复盘' },
      { id: 'kline-target', label: '目标训练机制' },
      { id: 'kline-access', label: '权限与套餐' },
    ],
  },
  {
    id: 'full-system',
    icon: '📚',
    label: '完整交易体系',
    items: [
      { id: 'full-courseware', label: '系统课件' },
      { id: 'full-video', label: '视频教学' },
      { id: 'full-indicator', label: '指标系统' },
      { id: 'full-resonance', label: '多周期共振提醒' },
      { id: 'full-training-review', label: '训练与复盘逻辑' },
    ],
  },
  {
    id: 'faq',
    icon: '❓',
    label: '常见问题',
    items: [
      { id: 'faq-system', label: '体系相关' },
      { id: 'faq-training', label: '系统相关' },
      { id: 'faq-access', label: '权限相关' },
      { id: 'faq-learning', label: '学习相关' },
      { id: 'faq-renewal', label: '续费相关' },
    ],
  },
];

export const faqNavGroups: NavGroup[] = [
  { id: 'faq-system-group', label: '体系相关', items: [{ id: 'faq-system', label: '体系相关问题' }] },
  { id: 'faq-training-group', label: '系统相关', items: [{ id: 'faq-training', label: '系统相关问题' }] },
  { id: 'faq-access-group', label: '权限相关', items: [{ id: 'faq-access', label: '权限相关问题' }] },
  { id: 'faq-learning-group', label: '学习相关', items: [{ id: 'faq-learning', label: '学习相关问题' }] },
  { id: 'faq-renewal-group', label: '续费相关', items: [{ id: 'faq-renewal', label: '续费相关问题' }] },
];

export const overviewModules = [
  { title: '课件与视频教学', anchor: 'learning-content', summary: '建立规则框架，并通过案例讲解加深理解。' },
  { title: '指标与共振辅助', anchor: 'full-indicator', summary: '在实盘中学会用辅助工具，再通过训练反复打磨，达到稳定执行。' },
  { title: 'K线训练系统', anchor: 'kline-flow', summary: '执行训练、记录与复盘闭环。' },
];

export const faqCategories = [
  { title: '体系相关', anchor: 'faq-system', summary: '完整体系定位与学习路径。' },
  { title: '系统相关', anchor: 'faq-training', summary: '训练流程、操作与市场支持。' },
  { title: '权限相关', anchor: 'faq-access', summary: 'trial/paid/internal 与套餐说明。' },
  { title: '学习相关', anchor: 'faq-learning', summary: '学习节奏与训练建议。' },
  { title: '续费相关', anchor: 'faq-renewal', summary: '续费开通与服务周期。' },
];

// 体系中心各章节展示图：后续只需替换 src 即可，无需改组件代码。
export const systemSectionMedia: Record<string, SectionMediaItem[]> = {
  'why-one-mode': [{ src: '/images/official/why-one-mode-1.png', title: '模式一致性示意', caption: '建议替换为你的理念结构图' }],
  'learning-content': [
    { src: '/images/official/courseware-1.png', title: '课件结构图' },
    { src: '/images/official/video-1.png', title: '视频教学目录' },
    { src: '/images/official/indicator-1.png', title: '指标结构示意' },
    { src: '/images/official/resonance-1.png', title: '共振提醒示意' },
  ],
  'learning-flow': [{ src: '/images/official/training-1.png', title: '学习与训练路径图' }],
  'system-advantages': [{ src: '/images/official/resonance-2.png', title: '体系优势视图' }],
  'pricing-notes': [{ src: '/images/official/access-1.png', title: '费用与权限说明' }],
  'learning-outcome': [{ src: '/images/official/review-1.png', title: '执行与复盘能力提升' }],
  'student-feedback': [{ src: '/images/official/review-2.png', title: '学员反馈截图' }],
  'kline-intro': [{ src: '/images/official/training-1.png', title: '训练系统总览' }],
  'kline-start': [{ src: '/images/official/training-2.png', title: '开始训练步骤' }],
  'kline-flow': [{ src: '/images/official/training-1.png', title: '训练流程图' }],
  'kline-actions': [{ src: '/images/official/training-2.png', title: '买入与平仓操作示例' }],
  'kline-review': [{ src: '/images/official/review-1.png', title: '历史记录与复盘界面' }],
  'kline-target': [{ src: '/images/official/target-1.png', title: '目标训练看板' }],
  'kline-access': [{ src: '/images/official/access-1.png', title: '权限与套餐说明图' }],
  'full-courseware': [{ src: '/images/official/courseware-2.png', title: '系统课件目录' }],
  'full-video': [{ src: '/images/official/video-2.png', title: '视频教学章节' }],
  'full-indicator': [{ src: '/images/official/indicator-2.png', title: '指标效果图' }],
  'full-resonance': [{ src: '/images/official/resonance-1.png', title: '共振提醒样式' }],
  'full-training-review': [{ src: '/images/official/review-2.png', title: '训练与复盘逻辑图' }],
};
