'use client';
import { useMemo, useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Table, TableWrap } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SectionTitle } from '@/components/ui/SectionTitle';

type Summary = {
  trainingCount: number;
  winRate: number;
  accountScore: number;
  liquidationCount: number;
};

type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  accountScore: number;
  trainingCount: number;
  winRate: number;
  liquidationCount: number;
  isMe: boolean;
};

type DashboardData = {
  summary: Summary;
  equityCurve: Array<{ time: string; equity: number }>;
  leaderboard: { top10: LeaderboardRow[]; me: LeaderboardRow | null };
};

function fmtPct(v: number) {
  return `${Number.isFinite(v) ? v.toFixed(2) : '0.00'}%`;
}

function fmtNum(v: number) {
  return Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
}

type CurveRange = 'day' | 'week' | 'month' | 'year';

function selectCurveByRange(rows: Array<{ time: string; equity: number }>, range: CurveRange) {
  if (rows.length <= 1) return rows;
  const latestTs = Date.parse(rows[rows.length - 1].time);
  if (!Number.isFinite(latestTs)) return rows;
  const nowTs = Date.now();
  const spanMs =
    range === 'day'
      ? 24 * 60 * 60_000
      : range === 'week'
        ? 7 * 24 * 60 * 60_000
        : range === 'month'
          ? 30 * 24 * 60 * 60_000
          : 365 * 24 * 60 * 60_000;
  const fromByNow = nowTs - spanMs;
  const filteredByNow = rows.filter((r) => {
    const ts = Date.parse(r.time);
    return Number.isFinite(ts) && ts >= fromByNow && ts <= nowTs;
  });
  if (filteredByNow.length >= 2) return filteredByNow;

  // 数据更新时间滞后时，回退为“以最新数据时间为锚点”的最近窗口
  const fromByLatest = latestTs - spanMs;
  const filteredByLatest = rows.filter((r) => {
    const ts = Date.parse(r.time);
    return Number.isFinite(ts) && ts >= fromByLatest && ts <= latestTs;
  });
  return filteredByLatest.length >= 2 ? filteredByLatest : rows;
}

function buildPath(rows: Array<{ time: string; equity: number }>, width: number, height: number) {
  if (rows.length === 0) return { line: '', area: '', positive: true };
  const min = Math.min(...rows.map((r) => r.equity));
  const max = Math.max(...rows.map((r) => r.equity));
  const span = Math.max(1, max - min);
  const points = rows.map((r, i) => {
    const x = (i / Math.max(1, rows.length - 1)) * width;
    const y = height - ((r.equity - min) / span) * height;
    return { x, y };
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const positive = rows[rows.length - 1].equity >= rows[0].equity;
  return { line, area, positive };
}

export function DashboardPanel({ data, loading, error, currentUserId }: { data?: DashboardData; loading?: boolean; error?: boolean; currentUserId?: string }) {
  const summary = data?.summary;
  const curve = data?.equityCurve ?? [];
  const [curveRange, setCurveRange] = useState<CurveRange>('month');
  const visibleCurve = useMemo(() => selectCurveByRange(curve, curveRange), [curve, curveRange]);
  const board = data?.leaderboard?.top10 ?? [];
  const me = data?.leaderboard?.me ?? null;
  const w = 760;
  const h = 180;
  const path = buildPath(visibleCurve, w, h);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const hoverRow = useMemo(() => {
    if (hoverIdx == null || hoverIdx < 0 || hoverIdx >= visibleCurve.length) return null;
    return visibleCurve[hoverIdx];
  }, [visibleCurve, hoverIdx]);
  const myInTop10 = board.some((x) => x.userId === currentUserId);

  return (
    <section className="space-y-3 px-2 pb-1 sm:px-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="训练场次" value={summary ? fmtNum(summary.trainingCount) : '--'} hint="累计完成训练局数" />
        <StatCard label="总胜率" value={summary ? fmtPct(summary.winRate) : '--'} tone="green" hint="已平仓盈利交易占比" />
        <StatCard label="账户积分" value={summary ? fmtNum(summary.accountScore) : '--'} tone="cyan" hint="账户当前积分" />
        <StatCard label="爆仓次数" value={summary ? fmtNum(summary.liquidationCount) : '--'} tone="rose" hint="历史累计爆仓次数" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
        <Card><CardBody className="p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <SectionTitle>资金曲线</SectionTitle>
            <div className="flex items-center gap-1">
              <Button size="sm" variant={curveRange === 'day' ? 'primary' : 'ghost'} className="px-2 py-1 text-[11px]" onClick={() => setCurveRange('day')}>日</Button>
              <Button size="sm" variant={curveRange === 'week' ? 'primary' : 'ghost'} className="px-2 py-1 text-[11px]" onClick={() => setCurveRange('week')}>周</Button>
              <Button size="sm" variant={curveRange === 'month' ? 'primary' : 'ghost'} className="px-2 py-1 text-[11px]" onClick={() => setCurveRange('month')}>月</Button>
              <Button size="sm" variant={curveRange === 'year' ? 'primary' : 'ghost'} className="px-2 py-1 text-[11px]" onClick={() => setCurveRange('year')}>年</Button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/55 p-2">
            {loading ? <LoadingState message="资金曲线加载中..." className="h-[200px] min-h-0" /> : null}
            {error ? <ErrorState message="资金曲线加载失败" className="h-[200px] min-h-0" /> : null}
            {!loading && !error && visibleCurve.length > 0 ? (
              <div className="relative h-[220px] w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${w} ${h}`}
                  className="h-[180px] w-full"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const ratio = Math.max(0, Math.min(1, x / Math.max(1, rect.width)));
                    const idx = Math.round(ratio * Math.max(0, visibleCurve.length - 1));
                    setHoverIdx(idx);
                  }}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <defs>
                    <linearGradient id="equity-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={path.positive ? '#10b981' : '#f43f5e'} stopOpacity="0.42" />
                      <stop offset="100%" stopColor={path.positive ? '#10b981' : '#f43f5e'} stopOpacity="0.04" />
                    </linearGradient>
                  </defs>
                  <path d={path.area} fill="url(#equity-area)" />
                  <path d={path.line} fill="none" stroke={path.positive ? '#34d399' : '#fb7185'} strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                {hoverRow ? (
                  <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-slate-600/70 bg-slate-900/85 px-2 py-1 text-[11px] text-slate-200">
                    <div>{new Date(hoverRow.time).toLocaleString('zh-CN')}</div>
                    <div className="text-cyan-300">权益：{fmtNum(hoverRow.equity)}</div>
                  </div>
                ) : null}
                <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-slate-400">
                  <span>{visibleCurve[0]?.time ? new Date(visibleCurve[0].time).toLocaleDateString('zh-CN') : '--'}</span>
                  <span>{visibleCurve[visibleCurve.length - 1]?.time ? new Date(visibleCurve[visibleCurve.length - 1].time).toLocaleDateString('zh-CN') : '--'}</span>
                </div>
              </div>
            ) : null}
            {!loading && !error && visibleCurve.length === 0 ? <EmptyState title="暂无资金曲线" description="完成训练后将展示资金走势。" className="h-[200px] min-h-0" /> : null}
          </div>
        </CardBody></Card>

        <Card><CardBody className="p-3">
          <SectionTitle className="mb-2">排行榜（TOP 10）</SectionTitle>
          <TableWrap>
            <Table>
              <thead>
                <tr className="grid grid-cols-[46px_1.2fr_84px_64px_62px_58px] gap-2 border-b border-slate-700/60 px-2.5 py-2 text-[11px] text-slate-400">
                  <th className="text-left font-medium">排名</th><th className="text-left font-medium">用户</th><th className="text-right font-medium">积分</th><th className="text-right font-medium">胜率</th><th className="text-right font-medium">训练</th><th className="text-right font-medium">爆仓</th>
                </tr>
              </thead>
            </Table>
            <div className="max-h-[230px] overflow-y-auto">
              {board.map((row) => (
                <div key={`${row.rank}-${row.userId}`} className={`grid grid-cols-[46px_1.2fr_84px_64px_62px_58px] gap-2 border-b border-slate-800/80 px-2.5 py-2.5 text-xs transition hover:bg-slate-800/45 ${row.isMe ? 'bg-cyan-500/10 text-cyan-100' : 'text-slate-200'}`}>
                  <span className={row.rank <= 3 ? 'font-semibold text-amber-300' : ''}>#{row.rank}</span>
                  <span className="truncate">{row.displayName}</span>
                  <span className="text-right">{fmtNum(row.accountScore)}</span>
                  <span className="text-right">{fmtPct(row.winRate)}</span>
                  <span className="text-right">{row.trainingCount}</span>
                  <span className="text-right">{row.liquidationCount}</span>
                </div>
              ))}
              {board.length === 0 ? <div className="px-2.5 py-6"><EmptyState title="暂无排行榜数据" className="min-h-[96px]" /></div> : null}
            </div>
            {!myInTop10 && me ? (
              <div className="border-t border-slate-700/60 bg-slate-800/45 px-2.5 py-2 text-xs text-cyan-200">
                我的排名：#{me.rank} · 积分 {fmtNum(me.accountScore)} · 胜率 {fmtPct(me.winRate)} · 训练 {me.trainingCount} · 爆仓 {me.liquidationCount}
              </div>
            ) : null}
          </TableWrap>
        </CardBody></Card>
      </div>
    </section>
  );
}
