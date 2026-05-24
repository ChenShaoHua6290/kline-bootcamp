'use client';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableWrap } from '@/components/ui/Table';

export type InvitationRow = {
  id: string;
  code: string;
  type?: 'TRIAL' | 'PAID' | 'INTERNAL';
  paidPlan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  trialDays?: number | null;
  dailyTrainingLimit?: number | null;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
};

function formatInviteType(type?: InvitationRow['type']) {
  if (type === 'TRIAL') return '试用';
  if (type === 'PAID') return '付费';
  return '内部';
}

function formatPaidPlan(plan?: InvitationRow['paidPlan']) {
  if (plan === 'MONTHLY') return '月卡';
  if (plan === 'QUARTERLY') return '季卡';
  if (plan === 'YEARLY') return '年卡';
  return '--';
}

export function InvitationCodeTable({
  rows,
  pendingToggleId,
  pendingDeleteId,
  onToggleActive,
  onDelete,
  onCopyInviteText,
}: {
  rows: InvitationRow[];
  pendingToggleId?: string | null;
  pendingDeleteId?: string | null;
  onToggleActive: (row: InvitationRow) => void;
  onDelete: (row: InvitationRow) => void;
  onCopyInviteText?: (row: InvitationRow) => void;
}) {
  const desktopCols = 'grid-cols-[1.05fr_0.55fr_0.65fr_0.6fr_0.55fr_0.62fr_0.9fr_0.9fr_0.85fr]';
  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="ui-card p-3 text-[13px] text-slate-200">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-mono text-sm font-semibold">{row.code}</div>
              <Badge tone={row.isActive ? 'success' : 'default'}>{row.isActive ? '启用' : '停用'}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
              <div>最大次数: <span className="text-slate-200">{row.maxUses}</span></div>
              <div>类型: <span className="text-slate-200">{formatInviteType(row.type)}</span></div>
              <div>已使用: <span className="text-slate-200">{row.usedCount}</span></div>
              <div>过期时间: <span className="text-slate-200">{row.expiresAt ? new Date(row.expiresAt).toLocaleString('zh-CN') : '--'}</span></div>
              <div>创建时间: <span className="text-slate-200">{new Date(row.createdAt).toLocaleString('zh-CN')}</span></div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button size="sm" variant="ghost" onClick={() => onCopyInviteText?.(row)}>
                复制文本
              </Button>
              <Button size="sm" variant="ghost" disabled={pendingToggleId === row.id || pendingDeleteId === row.id} onClick={() => onToggleActive(row)}>
                {pendingToggleId === row.id ? '处理中...' : row.isActive ? '停用' : '启用'}
              </Button>
              <Button size="sm" variant="danger" disabled={pendingToggleId === row.id || pendingDeleteId === row.id} onClick={() => onDelete(row)}>
                {pendingDeleteId === row.id ? '删除中...' : '删除'}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <TableWrap className="hidden md:block">
      <Table>
        <thead>
          <tr className={`grid ${desktopCols} gap-3 border-b border-slate-700/70 px-4 py-3 text-xs text-slate-400`}>
            <th className="text-center font-medium">邀请码</th>
            <th className="text-center font-medium">类型</th>
            <th className="text-center font-medium">套餐/试用</th>
            <th className="text-center font-medium">最大次数</th>
            <th className="text-center font-medium">已使用</th>
            <th className="text-center font-medium">状态</th>
            <th className="text-center font-medium">过期时间</th>
            <th className="text-center font-medium">创建时间</th>
            <th className="text-center font-medium">操作</th>
          </tr>
        </thead>
      </Table>
      <div className="max-h-[64vh] overflow-y-auto">
        {rows.map((row) => (
          <div key={row.id} className={`grid ${desktopCols} items-center gap-3 border-b border-slate-800/80 px-4 py-3 text-[13px] text-slate-200 transition hover:bg-slate-800/45`}>
            <div className="truncate text-center font-mono font-semibold">{row.code}</div>
            <div className="text-center">{formatInviteType(row.type)}</div>
            <div className="text-center text-xs text-slate-300">
              {row.type === 'PAID'
                ? formatPaidPlan(row.paidPlan)
                : row.type === 'TRIAL'
                  ? `${row.trialDays ?? 7}天/${row.dailyTrainingLimit ?? 5}次`
                  : '--'}
            </div>
            <div className="text-center tabular-nums">{row.maxUses}</div>
            <div className="text-center tabular-nums">{row.usedCount}</div>
            <div className="flex items-center justify-center">
              <Badge tone={row.isActive ? 'success' : 'default'}>{row.isActive ? '启用' : '停用'}</Badge>
            </div>
            <div className="truncate text-center text-xs tabular-nums text-slate-400">{row.expiresAt ? new Date(row.expiresAt).toLocaleString('zh-CN') : '--'}</div>
            <div className="truncate text-center text-xs tabular-nums text-slate-400">{new Date(row.createdAt).toLocaleString('zh-CN')}</div>
            <div className="flex justify-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 whitespace-nowrap px-2 py-0.5 text-[11px]"
                onClick={() => onCopyInviteText?.(row)}
              >
                复制文本
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 whitespace-nowrap px-2 py-0.5 text-[11px]"
                disabled={pendingToggleId === row.id || pendingDeleteId === row.id}
                onClick={() => onToggleActive(row)}
              >
                {pendingToggleId === row.id ? '处理中...' : row.isActive ? '停用' : '启用'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="h-8 whitespace-nowrap px-2 py-0.5 text-[11px]"
                disabled={pendingToggleId === row.id || pendingDeleteId === row.id}
                onClick={() => onDelete(row)}
              >
                {pendingDeleteId === row.id ? '删除中...' : '删除'}
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <div className="px-3 py-8 text-center text-sm text-slate-400">暂无邀请码</div> : null}
      </div>
    </TableWrap>
    </>
  );
}
