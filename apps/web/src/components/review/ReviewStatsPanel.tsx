export function ReviewStatsPanel({ stats }: { stats: any }) {
  const row = (label: string, value: string | number) => (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-900/50 px-3 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-cyan-300">行为统计</h3>
      {row('总交易次数', stats.totalTrades ?? 0)}
      {row('胜率', `${Number(stats.winRate ?? 0).toFixed(2)}%`)}
      {row('平均仓位', `${(Number(stats.averagePositionPercent ?? 0) * 100).toFixed(1)}%`)}
      {row('最大回撤', `${Number(stats.maxDrawdown ?? 0).toFixed(2)}%`)}
      {row('未设置止损次数', stats.noStopLossCount ?? 0)}
      {row('高仓位交易次数', stats.highPositionCount ?? 0)}
    </div>
  );
}
