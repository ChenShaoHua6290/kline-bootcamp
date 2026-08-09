'use client';

import { Badge } from '@/components/ui/Badge';

export const DEFAULT_REVIEW_TAGS = [
  '过早进场',
  '追涨杀跌',
  '频繁交易',
  '没有设置止损',
  '止损过大',
  '仓位过大',
  '逆势交易',
  '没有等待确认',
  '情绪化交易',
  '忽略大周期',
];

export function ProblemTagSelector({
  value,
  onChange,
  options = DEFAULT_REVIEW_TAGS,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options?: string[];
}) {
  const has = (tag: string) => value.includes(tag);
  const toggle = (tag: string) => {
    if (has(tag)) onChange(value.filter((x) => x !== tag));
    else onChange([...value, tag]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((tag) => (
        <button key={tag} type="button" onClick={() => toggle(tag)}>
          <Badge tone={has(tag) ? 'info' : 'default'} className="px-2.5 py-1 text-xs">
            {tag}
          </Badge>
        </button>
      ))}
    </div>
  );
}
