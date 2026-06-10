'use client';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableWrap } from '@/components/ui/Table';

export type AdminUserRow = {
  id: string;
  email: string;
  nickname: string;
  role: 'USER' | 'ADMIN';
  accessType?: 'TRIAL' | 'PAID' | 'INTERNAL';
  accessStatus?: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  accessStartAt?: string | null;
  accessExpiresAt?: string | null;
  dailyTrainingLimit?: number | null;
  isTrainingUnlimited?: boolean;
  learningAccessLevel?: 'TRAINING' | 'FULL';
  currentPlan?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  todayTrainingCount?: number;
  isBanned: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
  createdAt: string;
  trainingCount: number;
  liquidationCount: number;
};

function formatAccessType(type?: AdminUserRow['accessType']) {
  if (type === 'TRIAL') return '试用';
  if (type === 'PAID') return '付费';
  return '内部';
}

function formatAccessPlan(plan?: AdminUserRow['currentPlan']) {
  if (plan === 'MONTHLY') return '月卡';
  if (plan === 'QUARTERLY') return '季卡';
  if (plan === 'YEARLY') return '年卡';
  return '无套餐';
}

function formatLearningAccess(level?: AdminUserRow['learningAccessLevel'], type?: AdminUserRow['accessType'], role?: AdminUserRow['role']) {
  if (role === 'ADMIN' || type === 'INTERNAL') return '完整体系';
  if (level === 'FULL') return '完整体系';
  return '训练版';
}

export function UserManagementTable({
  rows,
  pendingBanId,
  pendingUnbanId,
  onBan,
  onUnban,
  onAccessAction,
  onResetPassword,
  onViewHistory,
}: {
  rows: AdminUserRow[];
  pendingBanId?: string | null;
  pendingUnbanId?: string | null;
  onBan: (row: AdminUserRow) => void;
  onUnban: (row: AdminUserRow) => void;
  onAccessAction?: (row: AdminUserRow, action: 'renew_monthly' | 'renew_quarterly' | 'renew_yearly' | 'to_trial' | 'to_paid' | 'to_internal' | 'grant_full' | 'disable_access' | 'enable_access') => void;
  onResetPassword?: (row: AdminUserRow) => void;
  onViewHistory?: (row: AdminUserRow) => void;
}) {
  const desktopCols = 'grid-cols-[0.85fr_1.05fr_0.45fr_0.62fr_0.85fr_0.7fr_0.38fr_0.38fr_0.88fr_1.1fr]';
  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="ui-card p-3 text-[13px] text-slate-200">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="truncate text-sm font-semibold">{row.nickname || '--'}</div>
              <Badge tone={row.isBanned ? 'danger' : 'success'}>{row.isBanned ? '已封禁' : '正常'}</Badge>
            </div>
            <div className="mb-1 truncate text-xs text-slate-300">{row.email}</div>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
              <div>角色: <span className={row.role === 'ADMIN' ? 'font-semibold text-cyan-300' : 'text-slate-200'}>{row.role}</span></div>
              <div>权限: <span className="text-slate-200">{formatAccessType(row.accessType)} / {formatLearningAccess(row.learningAccessLevel, row.accessType, row.role)}</span></div>
              <div>训练: <span className="text-slate-200">{row.trainingCount}</span></div>
              <div>爆仓: <span className="text-slate-200">{row.liquidationCount}</span></div>
              <div>封禁原因: <span className="text-slate-200">{row.banReason ?? '--'}</span></div>
            </div>
            <div className="mt-2">
              {row.role !== 'ADMIN' ? (
                <div className="grid grid-cols-2 gap-2">
                  {row.isBanned ? (
                    <Button size="sm" variant="success" className="w-full" disabled={pendingUnbanId === row.id || pendingBanId === row.id} onClick={() => onUnban(row)}>
                      {pendingUnbanId === row.id ? '处理中...' : '解封'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" className="w-full" disabled={pendingBanId === row.id || pendingUnbanId === row.id} onClick={() => onBan(row)}>
                      {pendingBanId === row.id ? '处理中...' : '封禁'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="w-full" onClick={() => onViewHistory?.(row)}>
                    历史记录
                  </Button>
                </div>
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
          <tr className={`grid ${desktopCols} gap-2 border-b border-slate-700/70 px-4 py-3 text-xs text-slate-400`}>
            <th className="text-center font-medium">昵称</th>
            <th className="text-center font-medium">邮箱</th>
            <th className="text-center font-medium">角色</th>
            <th className="text-center font-medium">状态</th>
            <th className="text-center font-medium">权限</th>
            <th className="text-center font-medium">封禁原因</th>
            <th className="text-center font-medium">训练</th>
            <th className="text-center font-medium">爆仓</th>
            <th className="text-center font-medium">注册时间</th>
            <th className="text-center font-medium">操作</th>
          </tr>
        </thead>
      </Table>
      <div className="max-h-[64vh] overflow-y-auto">
        {rows.map((row) => (
          <div key={row.id} className={`grid ${desktopCols} items-center gap-2 border-b border-slate-800/80 px-4 py-3 text-[13px] text-slate-200 transition hover:bg-slate-800/45`}>
            <div className="truncate text-center font-semibold" title={row.nickname || '--'}>{row.nickname || '--'}</div>
            <div className="truncate text-center" title={row.email}>{row.email}</div>
            <div className={`text-center font-semibold ${row.role === 'ADMIN' ? 'text-cyan-300' : 'text-slate-200'}`}>{row.role}</div>
            <div className="flex items-center justify-center">
              <Badge tone={row.isBanned ? 'danger' : 'success'}>{row.isBanned ? '已封禁' : '正常'}</Badge>
            </div>
            <div className="text-center text-xs">
              <div>{formatAccessType(row.accessType)} / {formatAccessPlan(row.currentPlan)}</div>
              <div className="text-cyan-300/90">{formatLearningAccess(row.learningAccessLevel, row.accessType, row.role)}</div>
              <div className="text-slate-400">{row.accessExpiresAt ? new Date(row.accessExpiresAt).toLocaleDateString('zh-CN') : '长期'}</div>
            </div>
            <div className="truncate text-center text-xs text-slate-400" title={row.banReason ?? '--'}>{row.banReason ?? '--'}</div>
            <div className="text-center tabular-nums">{row.trainingCount}</div>
            <div className="text-center tabular-nums">{row.liquidationCount}</div>
            <div className="text-center text-xs tabular-nums text-slate-400">{new Date(row.createdAt).toLocaleString('zh-CN')}</div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {row.role !== 'ADMIN' ? (
                <>
                  {row.isBanned ? (
                    <Button size="sm" variant="success" className="h-7 whitespace-nowrap rounded-lg px-2 py-0 text-[10px]" disabled={pendingUnbanId === row.id || pendingBanId === row.id} onClick={() => onUnban(row)}>
                      {pendingUnbanId === row.id ? '处理中...' : '解封'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" className="h-7 whitespace-nowrap rounded-lg px-2 py-0 text-[10px]" disabled={pendingBanId === row.id || pendingUnbanId === row.id} onClick={() => onBan(row)}>
                      {pendingBanId === row.id ? '处理中...' : '封禁'}
                    </Button>
                  )}
                  {row.accessType !== 'INTERNAL' ? (
                    <Button size="sm" variant="ghost" className="h-7 whitespace-nowrap rounded-lg px-2 py-0 text-[10px]" onClick={() => onAccessAction?.(row, 'renew_monthly')}>
                      月续费
                    </Button>
                  ) : null}
                  {row.accessType !== 'INTERNAL' ? (
                    <Button size="sm" variant="ghost" className="h-7 whitespace-nowrap rounded-lg px-2 py-0 text-[10px]" onClick={() => onAccessAction?.(row, 'to_internal')}>
                      设内部
                    </Button>
                  ) : null}
                  {row.accessType !== 'INTERNAL' && row.learningAccessLevel !== 'FULL' ? (
                    <Button size="sm" variant="ghost" className="h-7 whitespace-nowrap rounded-lg px-2 py-0 text-[10px]" onClick={() => onAccessAction?.(row, 'grant_full')}>
                      开完整
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" className="h-7 whitespace-nowrap rounded-lg px-2 py-0 text-[10px]" onClick={() => onResetPassword?.(row)}>
                    重置密码
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 whitespace-nowrap rounded-lg px-2 py-0 text-[10px]" onClick={() => onViewHistory?.(row)}>
                    历史记录
                  </Button>
                </>
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
