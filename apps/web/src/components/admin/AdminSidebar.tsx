'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const items = [
  { href: '/admin', label: '概览' },
  { href: '/admin/invitations', label: '邀请码管理' },
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/courses', label: '课程管理' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="surface-panel h-fit p-3 xl:sticky xl:top-4">
      <nav className="space-y-1.5">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-xl border px-3 py-2.5 text-sm transition',
                active
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]'
                  : 'border-slate-700/70 bg-slate-900/50 text-slate-300 hover:border-slate-500 hover:bg-slate-900/70',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
