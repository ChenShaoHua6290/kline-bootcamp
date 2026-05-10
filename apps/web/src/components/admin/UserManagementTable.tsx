'use client';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableWrap } from '@/components/ui/Table';

export type AdminUserRow = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isBanned: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
  createdAt: string;
  trainingCount: number;
  liquidationCount: number;
};

export function UserManagementTable({
  rows,
  pendingBanId,
  pendingUnbanId,
  onBan,
  onUnban,
}: {
  rows: AdminUserRow[];
  pendingBanId?: string | null;
  pendingUnbanId?: string | null;
  onBan: (row: AdminUserRow) => void;
  onUnban: (row: AdminUserRow) => void;
}) {
  const desktopCols = 'grid-cols-[1.4fr_0.55fr_0.7fr_1fr_0.55fr_0.55fr_1fr_0.9fr]';
  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="ui-card p-3 text-xs text-slate-200">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="truncate font-medium">{row.email}</div>
              <Badge tone={row.isBanned ? 'danger' : 'success'}>{row.isBanned ? '已封禁' : '正常'}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-slate-400">
              <div>角色: <span className={row.role === 'ADMIN' ? 'text-cyan-300' : 'text-slate-200'}>{row.role}</span></div>
              <div>训练: <span className="text-slate-200">{row.trainingCount}</span></div>
              <div>爆仓: <span className="text-slate-200">{row.liquidationCount}</span></div>
              <div>封禁原因: <span className="text-slate-200">{row.banReason ?? '--'}</span></div>
            </div>
            <div className="mt-2">
              {row.role !== 'ADMIN' ? (
                row.isBanned ? (
                  <Button size="sm" variant="success" className="w-full" disabled={pendingUnbanId === row.id || pendingBanId === row.id} onClick={() => onUnban(row)}>
                    {pendingUnbanId === row.id ? '处理中...' : '解封'}
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" className="w-full" disabled={pendingBanId === row.id || pendingUnbanId === row.id} onClick={() => onBan(row)}>
                    {pendingBanId === row.id ? '处理中...' : '封禁'}
                  </Button>
                )
              ) : (
                <span className="text-slate-500">管理员不可操作</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <TableWrap className="hidden md:block">
      <Table>
        <thead>
          <tr className={`grid ${desktopCols} gap-2.5 border-b border-slate-700/70 px-3 py-2 text-[11px] text-slate-400`}>
            <th className="text-left font-medium">邮箱</th>
            <th className="text-center font-medium">角色</th>
            <th className="text-center font-medium">封禁状态</th>
            <th className="text-left font-medium">封禁原因</th>
            <th className="text-right font-medium">训练</th>
            <th className="text-right font-medium">爆仓</th>
            <th className="text-left font-medium">注册时间</th>
            <th className="text-right font-medium">操作</th>
          </tr>
        </thead>
      </Table>
      <div className="max-h-[64vh] overflow-y-auto">
        {rows.map((row) => (
          <div key={row.id} className={`grid ${desktopCols} items-center gap-2.5 border-b border-slate-800/80 px-3 py-2.5 text-xs text-slate-200 transition hover:bg-slate-800/45`}>
            <div className="truncate">{row.email}</div>
            <div className={`text-center font-semibold ${row.role === 'ADMIN' ? 'text-cyan-300' : 'text-slate-200'}`}>{row.role}</div>
            <div className="flex items-center justify-center">
              <Badge tone={row.isBanned ? 'danger' : 'success'}>{row.isBanned ? '已封禁' : '正常'}</Badge>
            </div>
            <div className="truncate text-slate-400">{row.banReason ?? '--'}</div>
            <div className="text-right tabular-nums">{row.trainingCount}</div>
            <div className="text-right tabular-nums">{row.liquidationCount}</div>
            <div className="tabular-nums">{new Date(row.createdAt).toLocaleString('zh-CN')}</div>
            <div className="flex justify-end gap-1.5">
              {row.role !== 'ADMIN' ? (
                row.isBanned ? (
                  <Button
                    size="sm"
                    variant="success"
                    className="h-8 whitespace-nowrap px-2 py-0.5 text-[11px]"
                    disabled={pendingUnbanId === row.id || pendingBanId === row.id}
                    onClick={() => onUnban(row)}
                  >
                    {pendingUnbanId === row.id ? '处理中...' : '解封'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    className="h-8 whitespace-nowrap px-2 py-0.5 text-[11px]"
                    disabled={pendingBanId === row.id || pendingUnbanId === row.id}
                    onClick={() => onBan(row)}
                  >
                    {pendingBanId === row.id ? '处理中...' : '封禁'}
                  </Button>
                )
              ) : (
                <span className="text-slate-500">管理员</span>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 ? <div className="px-3 py-8 text-center text-sm text-slate-400">暂无用户数据</div> : null}
      </div>
    </TableWrap>
    </>
  );
}
