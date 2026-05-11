'use client';
import { useMemo, useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { TableWrap } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
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
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const hoverRow = useMemo(() => {
    if (hoverIdx == null || hoverIdx < 0 || hoverIdx >= visibleCurve.length) return null;
    return visibleCurve[hoverIdx];
  }, [visibleCurve, hoverIdx]);

  return (
    <section className="space-y-4 px-2 pb-2 sm:px-3">
      <Card className="border-amber-400/40 bg-[linear-gradient(115deg,rgba(30,41,59,0.82),rgba(37,99,235,0.12),rgba(30,41,59,0.82))] shadow-[0_18px_36px_rgba(0,0,0,0.3)]">
        <CardBody className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/10 text-amber-300">↗</div>
              <div className="text-[20px] font-semibold text-amber-300">我的战绩</div>
            </div>
            <div className="rounded-2xl border border-amber-400/25 bg-slate-900/50 px-3.5 py-1.5 text-xs text-slate-300">
              当前排名 <span className="mx-1 text-[20px] font-bold text-amber-300">{me ? `#${me.rank}` : '--'}</span>
              <span className="text-xs text-slate-400">/ {board.length || '--'} 人</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-slate-900/35"><CardBody className="p-3">
              <div className="text-[11px] text-slate-400">训练场次</div>
              <div className="mt-1 text-[22px] font-bold text-slate-100">{summary ? fmtNum(summary.trainingCount) : '--'}</div>
              <div className="mt-1 text-[11px] text-slate-500">累计完成训练局数</div>
            </CardBody></Card>
            <Card className="bg-slate-900/35"><CardBody className="p-3">
              <div className="text-[11px] text-slate-400">总胜率</div>
              <div className="mt-1 text-[22px] font-bold text-emerald-300">{summary ? fmtPct(summary.winRate) : '--'}</div>
              <div className="mt-1 text-[11px] text-slate-500">已平仓盈利交易占比</div>
            </CardBody></Card>
            <Card className="bg-slate-900/35"><CardBody className="p-3">
              <div className="text-[11px] text-slate-400">账户积分</div>
              <div className="mt-1 text-[22px] font-bold text-cyan-300">{summary ? fmtNum(summary.accountScore) : '--'}</div>
              <div className="mt-1 text-[11px] text-slate-500">账户当前积分</div>
            </CardBody></Card>
            <Card className="bg-slate-900/35"><CardBody className="p-3">
              <div className="text-[11px] text-slate-400">爆仓次数</div>
              <div className="mt-1 text-[22px] font-bold text-rose-300">{summary ? fmtNum(summary.liquidationCount) : '--'}</div>
              <div className="mt-1 text-[11px] text-slate-500">历史累计爆仓次数</div>
            </CardBody></Card>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1.3fr]">
        <Card><CardBody className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitle className="text-slate-100">资金曲线</SectionTitle>
            <div className="flex items-center gap-1">
              <Button size="sm" variant={curveRange === 'day' ? 'primary' : 'ghost'} className="px-2 py-1 text-[11px]" onClick={() => setCurveRange('day')}>日</Button>
              <Button size="sm" variant={curveRange === 'week' ? 'primary' : 'ghost'} className="px-2 py-1 text-[11px]" onClick={() => setCurveRange('week')}>周</Button>
              <Button size="sm" variant={curveRange === 'month' ? 'primary' : 'ghost'} className="px-2 py-1 text-[11px]" onClick={() => setCurveRange('month')}>月</Button>
              <Button size="sm" variant={curveRange === 'year' ? 'primary' : 'ghost'} className="px-2 py-1 text-[11px]" onClick={() => setCurveRange('year')}>年</Button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-3">
            {loading ? <LoadingState message="资金曲线加载中..." className="h-[220px] min-h-0" /> : null}
            {error ? <ErrorState message="资金曲线加载失败" className="h-[220px] min-h-0" /> : null}
            {!loading && !error && visibleCurve.length > 0 ? (
              <div className="relative h-[240px] w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${w} ${h}`}
                  className="h-[190px] w-full"
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
                  <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-slate-600/70 bg-slate-900/85 px-2 py-1 text-xs text-slate-200">
                    <div>{new Date(hoverRow.time).toLocaleString('zh-CN')}</div>
                    <div className="text-cyan-300">权益：{fmtNum(hoverRow.equity)}</div>
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-400">
                  <span>{visibleCurve[0]?.time ? new Date(visibleCurve[0].time).toLocaleDateString('zh-CN') : '--'}</span>
                  <span>{visibleCurve[visibleCurve.length - 1]?.time ? new Date(visibleCurve[visibleCurve.length - 1].time).toLocaleDateString('zh-CN') : '--'}</span>
                </div>
              </div>
            ) : null}
            {!loading && !error && visibleCurve.length === 0 ? <EmptyState title="暂无资金曲线" description="完成训练后将展示资金走势。" className="h-[220px] min-h-0" /> : null}
          </div>
        </CardBody></Card>

        <Card><CardBody className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitle className="text-slate-100">实时排行榜</SectionTitle>
            <span className="text-xs text-slate-400">总参与 {board.length} 人</span>
          </div>
          <TableWrap>
            <div className="max-h-[300px] overflow-y-auto">
              <div className="sticky top-0 z-10 grid grid-cols-[64px_1.35fr_110px_92px_84px_76px] gap-2 border-b border-slate-700/60 bg-slate-900/95 px-3 py-2.5 text-xs text-slate-400 backdrop-blur">
                <div className="text-center font-medium">排名</div>
                <div className="text-center font-medium">用户</div>
                <div className="text-center font-medium">积分</div>
                <div className="text-center font-medium">胜率</div>
                <div className="text-center font-medium">训练次数</div>
                <div className="text-center font-medium">爆仓</div>
              </div>
              {board.map((row) => (
                <div key={`${row.rank}-${row.userId}`} className={`grid grid-cols-[64px_1.35fr_110px_92px_84px_76px] gap-2 border-b border-slate-800/80 px-3 py-3 text-[13px] transition hover:bg-slate-800/45 ${row.isMe ? 'bg-cyan-500/10 text-cyan-100' : 'text-slate-200'}`}>
                  <div className="flex items-center justify-center"><span className={`${row.rank <= 3 ? 'text-base font-bold text-amber-300' : 'font-semibold'}`}>#{row.rank}</span></div>
                  <div className="flex items-center justify-center">
                    <span className="relative min-w-0 w-full max-w-[180px]">
                      <button
                        className="block w-full truncate text-center"
                        onMouseEnter={() => setExpandedName(row.userId)}
                        onMouseLeave={() => setExpandedName((v) => (v === row.userId ? null : v))}
                        onClick={() => setExpandedName((v) => (v === row.userId ? null : row.userId))}
                      >
                        {row.displayName}
                      </button>
                      <span className={`app-tooltip left-1/2 top-[calc(100%+6px)] -translate-x-1/2 ${expandedName === row.userId ? 'show' : ''}`}>{row.displayName}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-center"><span className="font-semibold">{fmtNum(row.accountScore)}</span></div>
                  <div className="flex items-center justify-center"><span>{fmtPct(row.winRate)}</span></div>
                  <div className="flex items-center justify-center"><span>{row.trainingCount}</span></div>
                  <div className="flex items-center justify-center"><span>{row.liquidationCount}</span></div>
                </div>
              ))}
              {board.length === 0 ? <div className="px-2.5 py-6"><EmptyState title="暂无排行榜数据" className="min-h-[96px]" /></div> : null}
            </div>
          </TableWrap>
        </CardBody></Card>
      </div>
    </section>
  );
}
