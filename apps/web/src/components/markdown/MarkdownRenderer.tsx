'use client';

import { Fragment, MouseEvent, ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export type MarkdownHeading = {
  id: string;
  level: 1 | 2 | 3 | 4;
  text: string;
};

type AlertTone = 'NOTE' | 'TIP' | 'WARNING' | 'IMPORTANT';

const alertStyle: Record<AlertTone, { label: string; className: string; marker: string }> = {
  NOTE: {
    label: '说明',
    className: 'border-blue-400/35 bg-blue-500/10 text-blue-50',
    marker: 'bg-blue-400',
  },
  TIP: {
    label: '建议',
    className: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-50',
    marker: 'bg-emerald-400',
  },
  WARNING: {
    label: '注意',
    className: 'border-amber-400/40 bg-amber-500/12 text-amber-50',
    marker: 'bg-amber-400',
  },
  IMPORTANT: {
    label: '重点',
    className: 'border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-50',
    marker: 'bg-fuchsia-400',
  },
};

function headingId(lineIndex: number) {
  return `md-h-${lineIndex}`;
}

function stripInline(raw: string) {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
}

function isSafeUrl(raw: string) {
  const value = raw.trim();
  return (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//i.test(value);
}

function cleanUrl(raw: string) {
  return raw.trim().replace(/^<|>$/g, '');
}

function pushText(nodes: ReactNode[], text: string, keyPrefix: string) {
  text.split('\n').forEach((part, index) => {
    if (index > 0) nodes.push(<br key={`${keyPrefix}-br-${index}`} />);
    if (part) nodes.push(<Fragment key={`${keyPrefix}-text-${index}`}>{part}</Fragment>);
  });
}

function renderImage(src: string, alt: string, key: string, block = true) {
  if (!isSafeUrl(src)) return <span key={key}>{`![${alt}](${src})`}</span>;
  if (!block) {
    return (
      <span key={key} className="my-3 block">
        <img src={src} alt={alt} className="max-h-[520px] w-full rounded-xl border border-slate-700/80 bg-slate-950/50 object-contain shadow-[0_18px_38px_rgba(0,0,0,0.28)]" loading="lazy" />
        {alt ? <span className="mt-2 block text-center text-xs text-slate-500">图：{alt}</span> : null}
      </span>
    );
  }
  return (
    <figure key={key} className="my-6">
      <img src={src} alt={alt} className="mx-auto max-h-[620px] w-full rounded-2xl border border-slate-700/80 bg-slate-950/50 object-contain shadow-[0_20px_46px_rgba(0,0,0,0.34)]" loading="lazy" />
      {alt ? <figcaption className="mt-3 text-center text-xs leading-5 text-slate-500">图：{alt}</figcaption> : null}
    </figure>
  );
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) pushText(nodes, text.slice(cursor, match.index), `${keyPrefix}-${cursor}`);
    const key = `${keyPrefix}-${match.index}`;

    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(renderImage(cleanUrl(match[2]), match[1] || '图片', key, false));
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const href = cleanUrl(match[4]);
      nodes.push(
        isSafeUrl(href) ? (
          <a key={key} href={href} target="_blank" rel="noreferrer" className="font-medium text-cyan-200 underline decoration-cyan-400/50 underline-offset-4 transition hover:text-cyan-100">
            {parseInline(match[3], `${key}-link`)}
          </a>
        ) : (
          <span key={key}>{match[3]}</span>
        ),
      );
    } else if (match[5] !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-cyan-100">
          {parseInline(match[5], `${key}-strong`)}
        </strong>,
      );
    } else if (match[6] !== undefined) {
      nodes.push(
        <code key={key} className="rounded-md border border-slate-700/70 bg-slate-950/70 px-1.5 py-0.5 font-mono text-[0.92em] text-cyan-100">
          {match[6]}
        </code>,
      );
    } else if (match[7] !== undefined) {
      nodes.push(
        <em key={key} className="text-slate-200">
          {parseInline(match[7], `${key}-em`)}
        </em>,
      );
    }
    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) pushText(nodes, text.slice(cursor), `${keyPrefix}-${cursor}`);
  return nodes;
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableLine(line: string) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isBlockStart(line: string, nextLine?: string) {
  const trimmed = line.trim();
  return (
    /^#{1,4}\s+/.test(trimmed) ||
    /^```/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^[-*]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    /^-{3,}$/.test(trimmed) ||
    /^\*{3,}$/.test(trimmed) ||
    (trimmed.includes('|') && Boolean(nextLine && isTableSeparator(nextLine)))
  );
}

function renderAlert(lines: string[], index: number) {
  const first = lines[0]?.trim();
  const alertMatch = /^\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*$/i.exec(first ?? '');
  if (!alertMatch) {
    return (
      <blockquote key={`quote-${index}`} className="rounded-2xl border border-cyan-400/20 border-l-cyan-300/80 bg-cyan-500/10 px-5 py-4 text-base leading-8 text-cyan-50/90">
        {parseInline(lines.join('\n'), `quote-${index}`)}
      </blockquote>
    );
  }

  const tone = alertMatch[1].toUpperCase() as AlertTone;
  const style = alertStyle[tone];
  const body = lines.slice(1).join('\n').trim();
  return (
    <aside key={`alert-${index}`} className={`relative overflow-hidden rounded-2xl border px-5 py-4 ${style.className}`}>
      <div className={`absolute left-0 top-0 h-full w-1 ${style.marker}`} />
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]">{style.label}</div>
      <div className="text-base leading-8">{parseInline(body, `alert-${index}`)}</div>
    </aside>
  );
}

function parseBlocks(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      const lang = trimmed.replace(/^```/, '').trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <div key={`code-wrap-${index}`} className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/80">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
            <span className="text-xs font-medium text-slate-400">{lang || 'code'}</span>
          </div>
          <pre className="overflow-x-auto p-4 text-sm leading-7 text-slate-200">
            <code>{code.join('\n')}</code>
          </pre>
        </div>,
      );
      continue;
    }

    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${index}`} className="my-8 border-0 border-t border-slate-700/70" />);
      index += 1;
      continue;
    }

    const imageOnly = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (imageOnly) {
      blocks.push(renderImage(cleanUrl(imageOnly[2]), imageOnly[1] || '图片', `img-${index}`, true));
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4;
      const content = parseInline(heading[2], `h-${index}`);
      const id = headingId(index);
      if (level === 1) {
        blocks.push(<h1 id={id} key={`h-${index}`} className="scroll-mt-28 text-3xl font-semibold leading-tight text-slate-50 sm:text-4xl">{content}</h1>);
      } else if (level === 2) {
        blocks.push(
          <h2 id={id} key={`h-${index}`} className="mt-10 scroll-mt-28 border-l-4 border-cyan-400 pl-4 text-2xl font-semibold leading-tight text-slate-50">
            {content}
          </h2>,
        );
      } else if (level === 3) {
        blocks.push(<h3 id={id} key={`h-${index}`} className="mt-7 scroll-mt-28 text-xl font-semibold leading-snug text-cyan-50">{content}</h3>);
      } else {
        blocks.push(<h4 id={id} key={`h-${index}`} className="mt-5 scroll-mt-28 text-base font-semibold leading-snug text-slate-100">{content}</h4>);
      }
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(renderAlert(quote, index));
      continue;
    }

    if (trimmed.includes('|') && lines[index + 1] && isTableSeparator(lines[index + 1])) {
      const headers = splitTableLine(lines[index]);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().includes('|')) {
        rows.push(splitTableLine(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-950/45">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-cyan-500/12 text-cyan-100">
              <tr>{headers.map((cell, cellIndex) => <th key={`${cell}-${cellIndex}`} className="border-b border-slate-700/80 px-4 py-3 font-semibold">{parseInline(cell, `th-${index}-${cellIndex}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {rows.map((row, rowIndex) => (
                <tr key={`row-${index}-${rowIndex}`} className="odd:bg-slate-900/30">
                  {headers.map((_, cellIndex) => <td key={`td-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-slate-300">{parseInline(row[cellIndex] ?? '', `td-${index}-${rowIndex}-${cellIndex}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (ordered && /^\d+\.\s+/.test(current)) items.push(current.replace(/^\d+\.\s+/, ''));
        else if (!ordered && /^[-*]\s+/.test(current)) items.push(current.replace(/^[-*]\s+/, ''));
        else break;
        index += 1;
      }
      const children = items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`} className="pl-1">{parseInline(item, `li-${index}-${itemIndex}`)}</li>);
      blocks.push(
        ordered ? (
          <ol key={`list-${index}`} className="list-decimal space-y-2 pl-6 text-base leading-8 text-slate-300">{children}</ol>
        ) : (
          <ul key={`list-${index}`} className="list-disc space-y-2 pl-6 text-base leading-8 text-slate-300 marker:text-cyan-300">{children}</ul>
        ),
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && (paragraph.length === 0 || !isBlockStart(lines[index], lines[index + 1]))) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}`} className="text-base leading-8 text-slate-300">
        {parseInline(paragraph.join('\n'), `p-${index}`)}
      </p>,
    );
  }

  return blocks;
}

export function getMarkdownHeadings(content?: string | null) {
  const markdown = content ?? '';
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line, lineIndex) => {
      const match = /^(#{1,4})\s+(.+)$/.exec(line.trim());
      if (!match) return null;
      const level = match[1].length as 1 | 2 | 3 | 4;
      if (level !== 2 && level !== 3) return null;
      return { id: headingId(lineIndex), level, text: stripInline(match[2]) };
    })
    .filter(Boolean) as MarkdownHeading[];
}

export function MarkdownToc({ headings, title = '文章目录', className }: { headings: MarkdownHeading[]; title?: string; className?: string }) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '');

  useEffect(() => {
    if (headings.length === 0) return;

    const updateActiveHeading = () => {
      const visibleHeadings = headings
        .map((heading) => ({ heading, element: document.getElementById(heading.id) }))
        .filter((item): item is { heading: MarkdownHeading; element: HTMLElement } => Boolean(item.element));

      const current = visibleHeadings
        .filter(({ element }) => element.getBoundingClientRect().top <= 150)
        .at(-1);

      setActiveId((current ?? visibleHeadings[0])?.heading.id ?? headings[0].id);
    };

    updateActiveHeading();
    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    window.addEventListener('resize', updateActiveHeading);
    return () => {
      window.removeEventListener('scroll', updateActiveHeading);
      window.removeEventListener('resize', updateActiveHeading);
    };
  }, [headings]);

  const scrollToHeading = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
    setActiveId(id);
  };

  if (headings.length === 0) return null;
  return (
    <nav className={cn('rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4', className)}>
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-3 space-y-1">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            onClick={(event) => scrollToHeading(event, heading.id)}
            className={cn(
              'block rounded-lg px-2 py-1.5 text-xs leading-5 text-slate-400 transition hover:bg-cyan-500/10 hover:text-cyan-100',
              heading.level === 3 && 'ml-3',
              activeId === heading.id && 'bg-cyan-500/12 text-cyan-100 shadow-[inset_2px_0_0_rgba(34,211,238,0.8)]',
            )}
          >
            {heading.text}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function MarkdownRenderer({ content, emptyText = '内容待后台补充。', className }: { content?: string | null; emptyText?: string; className?: string }) {
  const markdown = content?.trim() ?? '';
  if (!markdown) return <p className={cn('text-base leading-8 text-slate-400', className)}>{emptyText}</p>;
  return <article className={cn('space-y-6', className)}>{parseBlocks(markdown)}</article>;
}
