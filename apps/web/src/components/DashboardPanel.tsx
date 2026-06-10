'use client';
import { useMemo, useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
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
    <section className="relative mx-auto w-full max-w-[1240px] space-y-2.5 px-3 pb-2.5 pt-1.5 sm:px-4">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" />
      <Card className="relative overflow-hidden border-amber-300/24 bg-[linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,41,59,0.72)_48%,rgba(15,23,42,0.92))] shadow-[0_22px_60px_rgba(2,6,23,0.38)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
        <CardBody className="p-3 sm:p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-300/35 bg-amber-400/10 text-sm text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.16)]">↗</div>
              <div className="text-[17px] font-semibold text-amber-200">我的战绩</div>
            </div>
            <div className="rounded-xl border border-amber-300/25 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(15,23,42,0.7))] px-3 py-1.5 text-xs text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              当前排名 <span className="mx-1 text-[17px] font-bold text-amber-200">{me ? `#${me.rank}` : '--'}</span>
              <span className="text-xs text-slate-400">/ {board.length || '--'} 人</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-xl border border-slate-600/45 bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(30,41,59,0.5))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/30 to-transparent" />
              <div className="text-[11px] text-slate-400">训练场次</div>
              <div className="mt-1 text-[22px] font-bold text-slate-50">{summary ? fmtNum(summary.trainingCount) : '--'}</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-500">累计完成训练局数</div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-emerald-300/28 bg-[linear-gradient(145deg,rgba(6,78,59,0.22),rgba(15,23,42,0.72))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/40 to-transparent" />
              <div className="text-[11px] text-slate-400">总胜率</div>
              <div className="mt-1 text-[22px] font-bold text-emerald-200">{summary ? fmtPct(summary.winRate) : '--'}</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-500">已平仓盈利交易占比</div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-cyan-300/28 bg-[linear-gradient(145deg,rgba(14,116,144,0.22),rgba(15,23,42,0.72))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
              <div className="text-[11px] text-slate-400">账户积分</div>
              <div className="mt-1 text-[22px] font-bold text-cyan-200">{summary ? fmtNum(summary.accountScore) : '--'}</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-500">账户当前积分</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
        <Card className="relative overflow-hidden border-cyan-300/22 bg-[linear-gradient(145deg,rgba(15,23,42,0.9),rgba(8,47,73,0.22),rgba(15,23,42,0.9))]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
          <CardBody className="p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle className="text-slate-100">资金曲线</SectionTitle>
              <div className="flex items-center gap-1 rounded-xl border border-slate-600/45 bg-slate-950/35 p-1">
                <Button size="sm" variant={curveRange === 'day' ? 'primary' : 'ghost'} className="h-7 rounded-lg px-2 py-1 text-[11px]" onClick={() => setCurveRange('day')}>日</Button>
                <Button size="sm" variant={curveRange === 'week' ? 'primary' : 'ghost'} className="h-7 rounded-lg px-2 py-1 text-[11px]" onClick={() => setCurveRange('week')}>周</Button>
                <Button size="sm" variant={curveRange === 'month' ? 'primary' : 'ghost'} className="h-7 rounded-lg px-2 py-1 text-[11px]" onClick={() => setCurveRange('month')}>月</Button>
                <Button size="sm" variant={curveRange === 'year' ? 'primary' : 'ghost'} className="h-7 rounded-lg px-2 py-1 text-[11px]" onClick={() => setCurveRange('year')}>年</Button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-slate-600/50 bg-[linear-gradient(180deg,rgba(2,6,23,0.54),rgba(15,23,42,0.78))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:100%_48px,76px_100%]" />
              {loading ? <LoadingState message="资金曲线加载中..." className="h-[190px] min-h-0" /> : null}
              {error ? <ErrorState message="资金曲线加载失败" className="h-[190px] min-h-0" /> : null}
              {!loading && !error && visibleCurve.length > 0 ? (
                <div className="relative h-[200px] w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    className="h-[154px] w-full"
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
                    <path d={path.line} fill="none" stroke={path.positive ? '#34d399' : '#fb7185'} strokeWidth="2.6" strokeLinecap="round" />
                  </svg>
                  {hoverRow ? (
                    <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-cyan-300/25 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-[0_16px_32px_rgba(2,6,23,0.5)]">
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
              {!loading && !error && visibleCurve.length === 0 ? <EmptyState title="暂无资金曲线" description="完成训练后将展示资金走势。" className="h-[190px] min-h-0" /> : null}
            </div>
          </CardBody>
        </Card>

        <Card className="relative overflow-hidden border-slate-600/42 bg-[linear-gradient(145deg,rgba(15,23,42,0.9),rgba(30,41,59,0.64),rgba(15,23,42,0.9))]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/35 to-transparent" />
          <CardBody className="p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <SectionTitle className="text-slate-100">实时排行榜</SectionTitle>
              <span className="rounded-full border border-slate-600/50 bg-slate-950/35 px-2.5 py-1 text-xs text-slate-400">总参与 {board.length} 人</span>
            </div>
            <div className="w-full overflow-x-hidden overflow-y-hidden rounded-xl border border-slate-600/55 bg-slate-950/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="max-h-[260px] overflow-y-auto">
                <div className="sticky top-0 z-10 grid w-full grid-cols-[50px_minmax(0,1.5fr)_minmax(80px,0.95fr)_minmax(72px,0.8fr)_minmax(78px,0.9fr)] gap-1.5 border-b border-slate-700/70 bg-slate-950/92 px-2 py-1.5 text-xs text-slate-400 backdrop-blur sm:gap-2 sm:px-3">
                  <div className="text-center font-medium">排名</div>
                  <div className="text-center font-medium">用户</div>
                  <div className="text-center font-medium">积分</div>
                  <div className="text-center font-medium">胜率</div>
                  <div className="text-center font-medium">训练次数</div>
                </div>
                {board.map((row) => (
                  <div key={`${row.rank}-${row.userId}`} className={`grid w-full grid-cols-[50px_minmax(0,1.5fr)_minmax(80px,0.95fr)_minmax(72px,0.8fr)_minmax(78px,0.9fr)] gap-1.5 border-b border-slate-800/80 px-2 py-2 text-[13px] transition hover:bg-slate-800/55 sm:gap-2 sm:px-3 ${row.isMe ? 'bg-cyan-500/12 text-cyan-100 shadow-[inset_3px_0_0_rgba(34,211,238,0.5)]' : 'text-slate-200'}`}>
                    <div className="flex items-center justify-center"><span className={`${row.rank <= 3 ? 'rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-0.5 text-base font-bold text-amber-200' : 'font-semibold'}`}>#{row.rank}</span></div>
                    <div className="flex items-center justify-center">
                      <span className="relative w-full min-w-0 max-w-[220px]">
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
                    <div className="flex items-center justify-center"><span className="font-semibold text-cyan-100">{fmtNum(row.accountScore)}</span></div>
                    <div className="flex items-center justify-center"><span>{fmtPct(row.winRate)}</span></div>
                    <div className="flex items-center justify-center"><span>{row.trainingCount}</span></div>
                  </div>
                ))}
                {board.length === 0 ? <div className="px-2.5 py-6"><EmptyState title="暂无排行榜数据" className="min-h-[96px]" /></div> : null}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
