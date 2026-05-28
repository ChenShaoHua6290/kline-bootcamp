export const systemCards = [
  { title: '系统课件', lines: ['交易认知', '固定规则', '结构逻辑'] },
  { title: '视频教学', lines: ['实战案例', '模式拆解', '复盘思路'] },
  { title: '指标系统', lines: ['结构识别', '执行一致性', '交易纪律'] },
  { title: '多周期共振提醒', lines: ['减少盯盘', '执行效率', '关键结构识别'] },
  { title: 'K线训练系统', lines: ['随机历史行情', '下一根推进', '买入/平仓+复盘'] },
];

export const painPoints = [
  { title: '看得懂', desc: '看得懂，但做不到。' },
  { title: '复盘清楚', desc: '复盘很清楚，盘中全乱了。' },
  { title: '指标很多', desc: '学了很多指标，却没有固定规则。' },
  { title: '模式过多', desc: '模式越来越多，执行越来越乱。' },
  { title: '无闭环', desc: '没有训练流程，没有复盘体系。' },
  { title: '追涨杀跌', desc: '盘中情绪主导，容易冲动追单。' },
  { title: '无计划', desc: '进场随意，缺少明确的执行计划。' },
  { title: '怕止损', desc: '该止损不止损，风险不断放大。' },
  { title: '难复现', desc: '偶尔做对一次，却无法稳定复制。' },
];

export const learningStages = [
  { title: '阶段1', subtitle: '建立交易认知', points: ['理解为什么只做一种模式', '理解为什么执行比技术更重要'] },
  { title: '阶段2', subtitle: '学习固定交易模式', points: ['市场结构', '趋势判断', '固定规则', '风险控制'] },
  { title: '阶段3', subtitle: '理解指标与共振逻辑', points: ['指标辅助', '多周期结构', '共振确认'] },
  { title: '阶段4', subtitle: '进入K线训练系统', points: ['随机历史行情', '下一根推进', '买入/平仓操作'] },
  { title: '阶段5', subtitle: '历史记录与复盘', points: ['操作过程', '错误记录', '盈亏结果', '复盘总结'] },
  { title: '阶段6', subtitle: '建立稳定执行能力', points: ['把一种模式训练到稳定执行'] },
];

export const testimonialCards = [
  {
    name: '学员A',
    tag: '执行稳定提升',
    text: '以前学很多方法但盘中很乱。现在固定一套模式后，进出场更一致，复盘也有方向。',
    image: '/images/official/feedback-1.png',
  },
  {
    name: '学员B',
    tag: '纪律改善',
    text: '最明显的是不再乱开仓，先等结构再执行。训练记录让我能快速发现自己的问题。',
    image: '/images/official/feedback-2.png',
  },
  {
    name: '学员C',
    tag: '复盘能力提升',
    text: '以前复盘只看结果，现在会按过程复盘，知道哪一步出了偏差，改起来更快。',
    image: '/images/official/feedback-3.png',
  },
  {
    name: '学员D',
    tag: '固定模式建立',
    text: '不再追求模式越多越好，而是持续把一种模式练熟，执行压力反而降低。',
    image: '/images/official/feedback-4.png',
  },
  {
    name: '学员E',
    tag: '训练节奏清晰',
    text: '以前训练比较随意，现在有明确流程和目标，学习节奏稳定很多。',
    image: '/images/official/feedback-5.png',
  },
  {
    name: '学员F',
    tag: '操作更克制',
    text: '最大的变化是少冲动交易，等待条件满足再执行，回撤明显更可控。',
    image: '/images/official/feedback-6.png',
  },
  {
    name: '学员G',
    tag: '结构理解提升',
    text: '通过课件+训练结合，对结构位置的理解更具体，盘中判断更有把握。',
    image: '/images/official/feedback-7.png',
  },
  {
    name: '学员H',
    tag: '复盘效率提高',
    text: '现在复盘不再泛泛而谈，能快速定位错误动作并在下一轮训练修正。',
    image: '/images/official/feedback-8.png',
  },
  {
    name: '学员I',
    tag: '一致性增强',
    text: '固定一套执行规则后，盈亏波动更平稳，情绪干扰比以前少很多。',
    image: '/images/official/feedback-9.png',
  },
  {
    name: '学员J',
    tag: '长期训练习惯',
    text: '体系把学习和训练串起来后，能坚持长期迭代，不再三天打鱼两天晒网。',
    image: '/images/official/feedback-10.png',
  },
];

export const homeFaqs = [
  ['这是喊单系统吗？', '不是。仅用于交易学习、训练与复盘，不提供喊单，不承诺收益。'],
  ['完整体系包含什么？', '包含系统课件、视频教学、指标系统、多周期共振提醒、K线训练系统和复盘训练流程。'],
  ['K线训练系统是什么？', '是完整体系中的训练模块，用于把规则练成执行能力。'],
  ['支持哪些市场？', '支持股票、期货、加密市场。'],
  ['学习费用怎么安排？', 'K线训练系统：7天体验39、月卡99、季卡269、年卡569。完整交易体系为咨询制，包含课件、视频、指标、共振提醒与训练复盘流程。'],
  ['如何开始学习？', '先从体系中心了解结构，再按学习流程逐步训练和复盘。'],
  ['适合什么样的人？', '适合想建立固定模式、提升执行一致性和复盘能力的人。'],
] as const;
