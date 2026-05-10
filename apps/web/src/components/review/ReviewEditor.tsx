'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextareaHTMLAttributes } from 'react';
import { ProblemTagSelector } from './ProblemTagSelector';

type Review = {
  content: string;
  problemTags: string[];
};

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-slate-700/90 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
    />
  );
}

export function ReviewEditor({
  initial,
  loading = false,
  onSave,
}: {
  initial?: Review | null;
  loading?: boolean;
  onSave: (payload: Review) => void;
}) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    setContent(initial?.content ?? '');
    setTags(initial?.problemTags ?? []);
  }, [initial?.content, JSON.stringify(initial?.problemTags ?? [])]);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-cyan-300">复盘总结</h3>
      <ProblemTagSelector value={tags} onChange={setTags} />
      <Textarea
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="请记录本次训练中出现的问题，例如：是否过早进场、是否频繁交易、是否没有等待确认、是否仓位过大、是否没有设置止损……"
      />
      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={loading}
          onClick={() => onSave({ content, problemTags: tags })}
        >
          {loading ? '保存中...' : initial ? '更新复盘' : '保存复盘'}
        </Button>
      </div>
    </div>
  );
}
