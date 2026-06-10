'use client';

import { ClipboardEvent, ReactNode, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { MarkdownRenderer } from './MarkdownRenderer';

type EditorMode = 'edit' | 'preview';

type TemplateKey = 'course' | 'answer' | 'indicator' | 'training';

const templates: Record<TemplateKey, { label: string; content: string }> = {
  course: {
    label: '课程内容',
    content: [
      '# 课程标题',
      '',
      '## 本节目标',
      '',
      '- 理解本节核心规则',
      '- 明确执行时的判断顺序',
      '- 知道课后需要完成的训练任务',
      '',
      '## 核心内容',
      '',
      '这里写课程正文，建议按“概念 → 规则 → 案例 → 训练”展开。',
      '',
      '## 图文说明',
      '',
      '![图片说明](https://example.com/demo.png)',
      '',
      '> [!IMPORTANT]',
      '> 本节最重要的不是记住概念，而是能在训练中稳定执行。',
      '',
      '## 注意事项',
      '',
      '- 不要跳过规则直接看信号',
      '- 不要把指标当成预测工具',
      '- 每次训练后必须写复盘总结',
      '',
      '## 课后训练',
      '',
      '1. 完成 20 次 K线训练',
      '2. 标记所有不符合模式的冲动操作',
      '3. 写下本节最大的一个执行问题',
      '',
      '## 相关课程',
      '',
      '- 固定模式拆解',
      '- 风险控制',
      '- 多周期分析',
    ].join('\n'),
  },
  answer: {
    label: '技术解答',
    content: [
      '# 问题标题',
      '',
      '## 问题背景',
      '',
      '这里描述用户遇到的问题、触发场景和当前状态。',
      '',
      '## 适用对象',
      '',
      '- 正在学习固定模式的用户',
      '- 已经开始 K线训练但执行不稳定的用户',
      '',
      '## 解决步骤',
      '',
      '1. 先回到市场结构判断',
      '2. 再确认趋势方向',
      '3. 最后检查是否满足固定模式',
      '',
      '> [!WARNING]',
      '> 如果结构位置不清晰，不要因为单个信号直接执行。',
      '',
      '## 注意事项',
      '',
      '- 记录当时判断依据',
      '- 不要临盘扩大风险',
      '- 复盘时只看是否符合体系规则',
      '',
      '## 相关课程',
      '',
      '- 市场结构',
      '- 入场逻辑',
      '',
      '## 相关训练入口',
      '',
      '- K线训练系统',
      '- 历史复盘记录',
    ].join('\n'),
  },
  indicator: {
    label: '指标说明',
    content: [
      '# 指标说明',
      '',
      '## 指标作用',
      '',
      '指标用于降低观察成本，辅助执行固定模式，不用于预测行情。',
      '',
      '## 使用场景',
      '',
      '- 结构已经明确时辅助观察',
      '- 多周期共振时辅助提醒',
      '- 训练复盘时统一判断标准',
      '',
      '## 参数说明',
      '',
      '| 参数 | 含义 | 建议 |',
      '|---|---|---|',
      '| 周期 | 观察级别 | 与训练周期一致 |',
      '| 提醒 | 是否开启提示 | 按需要开启 |',
      '',
      '## 常见误区',
      '',
      '- 看到信号就追单',
      '- 忽略趋势和结构位置',
      '- 把指标当成买卖点',
      '',
      '> [!IMPORTANT]',
      '> 指标只服务于执行，不能替代你的体系判断。',
      '',
      '## 注意事项',
      '',
      '每次使用指标前，先确认当前是否处在固定模式允许观察的位置。',
    ].join('\n'),
  },
  training: {
    label: 'K线训练',
    content: [
      '# K线训练教程',
      '',
      '## 操作目标',
      '',
      '通过随机历史行情训练，把固定模式从“知道”练到“能执行”。',
      '',
      '## 操作步骤',
      '',
      '1. 进入 K线训练系统',
      '2. 选择市场、品种和周期',
      '3. 点击开始训练',
      '4. 按下一根推进行情',
      '5. 根据规则买入、部分平仓或全部平仓',
      '6. 训练结束后填写复盘总结',
      '',
      '## 图文说明',
      '',
      '![训练界面示例](https://example.com/training.png)',
      '',
      '## 常见问题',
      '',
      '> [!TIP]',
      '> 如果训练中频繁想提前行动，先暂停并写下你当时看到了什么条件。',
      '',
      '## 训练建议',
      '',
      '- 每轮至少完成 100 次训练',
      '- 胜率目标达到 80%',
      '- 连续完成 3 轮后再进入下一阶段',
    ].join('\n'),
  },
};

function ToolbarIcon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function ToolbarButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/45 px-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/55 hover:bg-cyan-500/12 hover:text-cyan-100"
    >
      {children}
    </button>
  );
}

function TemplateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-500/18"
    >
      {label}
    </button>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  splitPreview = true,
  uploadImage,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  splitPreview?: boolean;
  uploadImage?: (file: File) => Promise<string>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [uploadingImage, setUploadingImage] = useState(false);

  const focusRange = (start: number, end: number) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  const replaceSelection = (nextText: string, selectStart?: number, selectEnd?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value ? `${value}\n${nextText}` : nextText);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${value.slice(0, start)}${nextText}${value.slice(end)}`;
    onChange(next);
    focusRange(start + (selectStart ?? nextText.length), start + (selectEnd ?? nextText.length));
  };

  const insertBlock = (block: string) => {
    const textarea = textareaRef.current;
    const prefix = value && textarea?.selectionStart !== 0 ? '\n\n' : '';
    replaceSelection(`${prefix}${block}\n`);
  };

  const wrapSelection = (before: string, after: string, fallback: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${before}${fallback}${after}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const nextText = `${before}${selected}${after}`;
    const next = `${value.slice(0, start)}${nextText}${value.slice(end)}`;
    onChange(next);
    focusRange(start + before.length, start + before.length + selected.length);
  };

  const prefixLines = (prefix: string, fallback: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${prefix}${fallback}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const nextText = selected.split('\n').map((line) => `${prefix}${line || fallback}`).join('\n');
    const next = `${value.slice(0, start)}${nextText}${value.slice(end)}`;
    onChange(next);
    focusRange(start + prefix.length, start + nextText.length);
  };

  const insertHeading = (level: 1 | 2 | 3) => {
    prefixLines(`${'#'.repeat(level)} `, level === 1 ? '文章标题' : level === 2 ? '章节标题' : '小节标题');
  };

  const uploadImageFile = async (file?: File | null) => {
    if (!file || !uploadImage) return;
    if (!file.type.startsWith('image/')) {
      window.alert('请选择图片文件');
      return;
    }
    setUploadingImage(true);
    try {
      const src = await uploadImage(file);
      const alt = file.name.replace(/\.[^.]+$/, '') || '图片说明';
      insertBlock(`![${alt}](${src})`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message;
      window.alert(msg || '图片上传失败，请重试');
    } finally {
      setUploadingImage(false);
    }
  };

  const getPastedImageFile = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const fileFromClipboard = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'));
    if (fileFromClipboard) return fileFromClipboard;
    return Array.from(event.clipboardData.items)
      .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile();
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!uploadImage) return;
    const imageFile = getPastedImageFile(event);
    if (!imageFile) return;
    event.preventDefault();
    uploadImageFile(imageFile);
  };

  const insertImage = () => {
    if (uploadImage) {
      imageInputRef.current?.click();
      return;
    }
    const src = window.prompt('图片地址 URL');
    if (!src) return;
    const alt = window.prompt('图片说明') || '图片说明';
    insertBlock(`![${alt}](${src.trim()})`);
  };

  const insertTemplate = (key: TemplateKey) => {
    const template = templates[key].content;
    if (value.trim()) {
      const confirmed = window.confirm('插入模板会追加到当前内容后面，是否继续？');
      if (!confirmed) return;
      onChange(`${value.trimEnd()}\n\n---\n\n${template}`);
      return;
    }
    onChange(template);
  };

  const editor = (
    <textarea
      ref={textareaRef}
      className="min-h-[420px] w-full resize-y bg-transparent px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onPaste={handlePaste}
      placeholder={placeholder}
      spellCheck={false}
    />
  );

  const preview = (
    <div className="min-h-[420px] overflow-y-auto px-4 py-4">
      <MarkdownRenderer content={value} emptyText="暂无预览内容。" />
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/35 shadow-[0_18px_42px_rgba(0,0,0,0.22)]">
      {uploadImage ? (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            uploadImageFile(file);
          }}
        />
      ) : null}
      <div className="space-y-2 border-b border-slate-800/90 px-2.5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarButton label="H1 标题" onClick={() => insertHeading(1)}>H1</ToolbarButton>
            <ToolbarButton label="H2 标题" onClick={() => insertHeading(2)}>H2</ToolbarButton>
            <ToolbarButton label="H3 标题" onClick={() => insertHeading(3)}>H3</ToolbarButton>
            <ToolbarButton label="加粗" onClick={() => wrapSelection('**', '**', '重点内容')}>B</ToolbarButton>
            <ToolbarButton label="引用" onClick={() => prefixLines('> ', '这是一段重要提示')}>
              <ToolbarIcon><path d="M9 7H5v6h4v4H3V7h6Z" /><path d="M21 7h-4v6h4v4h-6V7h6Z" /></ToolbarIcon>
            </ToolbarButton>
            <ToolbarButton label="有序列表" onClick={() => insertBlock(['1. 第一步', '2. 第二步', '3. 第三步'].join('\n'))}>
              <ToolbarIcon><path d="M10 6h11" /><path d="M10 12h11" /><path d="M10 18h11" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M4 14h2l-2 4h2" /></ToolbarIcon>
            </ToolbarButton>
            <ToolbarButton label="无序列表" onClick={() => insertBlock(['- 项目一', '- 项目二', '- 项目三'].join('\n'))}>
              <ToolbarIcon><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></ToolbarIcon>
            </ToolbarButton>
            <ToolbarButton label={uploadImage ? '上传并插入图片' : '插入图片'} onClick={insertImage}>
              {uploadingImage ? '上传中' : <ToolbarIcon><path d="M4 5h16v14H4z" /><path d="m4 15 4-4 4 4 3-3 5 5" /><path d="M15 9h.01" /></ToolbarIcon>}
            </ToolbarButton>
            <ToolbarButton label="插入表格" onClick={() => insertBlock(['| 阶段 | 内容 | 目标 |', '|---|---|---|', '| 第一阶段 | 交易认知 | 理解为什么只做一种模式 |', '| 第二阶段 | K线训练 | 训练执行能力 |'].join('\n'))}>
              <ToolbarIcon><path d="M4 5h16v14H4z" /><path d="M4 11h16" /><path d="M4 17h16" /><path d="M10 5v14" /><path d="M16 5v14" /></ToolbarIcon>
            </ToolbarButton>
            <ToolbarButton label="插入分割线" onClick={() => insertBlock('---')}>—</ToolbarButton>
            <ToolbarButton label="插入提示块" onClick={() => insertBlock(['> [!IMPORTANT]', '> 这里写重要提醒。'].join('\n'))}>
              <ToolbarIcon><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 4.2 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /></ToolbarIcon>
            </ToolbarButton>
            <ToolbarButton label="插入代码块" onClick={() => insertBlock(['```pine', '// TradingView Pine 示例', 'plot(close)', '```'].join('\n'))}>{'</>'}</ToolbarButton>
          </div>

          <div className={cn('flex rounded-lg border border-slate-700/80 bg-slate-950/50 p-0.5', splitPreview && 'md:hidden')}>
            <button type="button" onClick={() => setMode('edit')} className={cn('h-7 rounded-md px-2.5 text-xs font-semibold transition', mode === 'edit' ? 'bg-cyan-500/18 text-cyan-100' : 'text-slate-400 hover:text-slate-200')}>编辑</button>
            <button type="button" onClick={() => setMode('preview')} className={cn('h-7 rounded-md px-2.5 text-xs font-semibold transition', mode === 'preview' ? 'bg-cyan-500/18 text-cyan-100' : 'text-slate-400 hover:text-slate-200')}>预览</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">快捷模板</span>
          {(Object.keys(templates) as TemplateKey[]).map((key) => (
            <TemplateButton key={key} label={templates[key].label} onClick={() => insertTemplate(key)} />
          ))}
        </div>
      </div>

      {splitPreview ? (
        <>
          <div className="hidden grid-cols-2 divide-x divide-slate-800/90 md:grid">
            <div>
              <div className="border-b border-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-500">Markdown 编辑</div>
              {editor}
            </div>
            <div>
              <div className="border-b border-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-500">实时预览</div>
              {preview}
            </div>
          </div>

          <div className="md:hidden">
            {mode === 'edit' ? editor : preview}
          </div>
        </>
      ) : (
        <div>{mode === 'edit' ? editor : preview}</div>
      )}
    </div>
  );
}
