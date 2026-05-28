'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { NavGroup } from '@/data/official-content';

type Props = {
  title: string;
  groups: NavGroup[];
  activeId: string;
  basePath: string;
};

export function KnowledgeSidebar({ title, groups, activeId, basePath }: Props) {
  const defaultOpen = useMemo(() => groups.map((g) => g.id), [groups]);
  const [openGroups, setOpenGroups] = useState<string[]>(defaultOpen);

  const toggle = (id: string) => {
    setOpenGroups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <aside className="rounded-2xl border border-cyan-400/20 bg-slate-950/65 p-3 shadow-[0_14px_30px_rgba(2,6,23,0.4)]">
      <h2 className="mb-2 px-2 text-sm font-semibold text-cyan-100">{title}</h2>
      <div className="space-y-1">
        {groups.map((group) => {
          const expanded = openGroups.includes(group.id);
          return (
            <div key={group.id} className="rounded-xl border border-transparent bg-slate-900/45">
              <button
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm text-slate-200 hover:bg-cyan-500/10"
                onClick={() => toggle(group.id)}
                type="button"
              >
                <span className="truncate">{group.icon ? `${group.icon} ` : ''}{group.label}</span>
                <span className="text-xs text-slate-400">{expanded ? '−' : '+'}</span>
              </button>
              {expanded ? (
                <div className="space-y-1 pb-2 pl-2 pr-2">
                  {group.items.map((item) => {
                    const active = activeId === item.id;
                    return (
                      <Link
                        key={item.id}
                        href={`${basePath}#${item.id}`}
                        className={`block rounded-lg px-2 py-1.5 text-xs transition ${active ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
