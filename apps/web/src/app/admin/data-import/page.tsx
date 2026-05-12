'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageDescription, PageHeader, PageTitle } from '@/components/ui/PageHeader';

type Job = {
  id: string;
  market: string;
  source: string;
  symbols: string[];
  interval: string;
  startMonth?: string | null;
  endMonth?: string | null;
  status: string;
  totalFiles: number;
  downloadedFiles: number;
  normalizedFiles: number;
  importedRows: number;
  skippedRows: number;
  errorMessage?: string | null;
  createdAt: string;
};

type StatsRow = {
  id: string;
  market: string;
  symbol: string;
  timeframe: string;
  barCount: number;
  isTrainable: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export default function AdminDataImportPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    market: 'crypto',
    source: 'binance',
    symbolsText: 'BTCUSDT\nETHUSDT\nSOLUSDT',
    interval: '15m',
    startMonth: '2023-01',
    endMonth: '2025-05',
    autoAggregate: true,
    overwrite: false,
  });

  const jobsQuery = useQuery({
    queryKey: ['admin-data-import-jobs'],
    queryFn: async () => (await api.get<{ items: Job[] }>('/admin/data-import/jobs')).data,
    refetchInterval: 3000,
  });

  const statsQuery = useQuery({
    queryKey: ['admin-data-import-stats'],
    queryFn: async () => (await api.get<StatsRow[]>('/admin/data-import/stats')).data,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const symbols = form.symbolsText
        .split(/\r?\n/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      return (
        await api.post('/admin/data-import/jobs', {
          market: form.market,
          source: form.source,
          symbols,
          interval: form.interval,
          startMonth: form.startMonth,
          endMonth: form.endMonth,
          autoAggregate: form.autoAggregate,
          overwrite: form.overwrite,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-data-import-jobs'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/data-import/jobs/${id}/retry`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-data-import-jobs'] }),
  });

  const jobs = useMemo(() => jobsQuery.data?.items ?? [], [jobsQuery.data]);
  const stats = useMemo(() => statsQuery.data ?? [], [statsQuery.data]);

  return (
    <AdminLayout title="历史K线导入">
      <PageHeader>
        <div>
          <PageTitle>历史K线数据导入</PageTitle>
          <PageDescription>创建后台导入任务并查看执行进度、失败原因与品种统计。</PageDescription>
        </div>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select value={form.market} onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}>
            <option value="crypto">crypto</option>
            <option value="forex">forex</option>
            <option value="gold">gold</option>
            <option value="stock">stock</option>
            <option value="futures">futures</option>
          </Select>
          <Select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
            <option value="binance">binance</option>
            <option value="histdata">histdata</option>
            <option value="csv">csv</option>
            <option value="yahoo_csv">yahoo_csv</option>
            <option value="generic_csv">generic_csv</option>
          </Select>
          <Input value={form.interval} onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))} placeholder="15m / 1H / D" />
          <Input value={form.startMonth} onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))} placeholder="2023-01" />
          <Input value={form.endMonth} onChange={(e) => setForm((f) => ({ ...f, endMonth: e.target.value }))} placeholder="2025-05" />
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.autoAggregate} onChange={(e) => setForm((f) => ({ ...f, autoAggregate: e.target.checked }))} /> 自动聚合</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form.overwrite} onChange={(e) => setForm((f) => ({ ...f, overwrite: e.target.checked }))} /> 覆盖模式</label>
          </div>
        </div>
        <div className="mt-3">
          <textarea
            className="h-28 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 p-2 text-sm text-slate-100"
            value={form.symbolsText}
            onChange={(e) => setForm((f) => ({ ...f, symbolsText: e.target.value }))}
            placeholder={'BTCUSDT\\nETHUSDT\\nSOLUSDT'}
          />
        </div>
        <div className="mt-3">
          <Button variant="primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? '创建中...' : '创建导入任务'}
          </Button>
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">任务列表</h3>
        {jobsQuery.isLoading ? <LoadingState message="任务加载中..." /> : null}
        {jobsQuery.isError ? <ErrorState message="任务加载失败" /> : null}
        {!jobsQuery.isLoading && !jobsQuery.isError ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="px-2 py-2">任务ID</th>
                  <th className="px-2 py-2">市场</th>
                  <th className="px-2 py-2">源</th>
                  <th className="px-2 py-2">品种数</th>
                  <th className="px-2 py-2">状态</th>
                  <th className="px-2 py-2">进度</th>
                  <th className="px-2 py-2">导入行</th>
                  <th className="px-2 py-2">错误</th>
                  <th className="px-2 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr><td className="px-2 py-3 text-slate-400" colSpan={9}>暂无导入任务</td></tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-t border-slate-800">
                      <td className="px-2 py-2 text-slate-300">{job.id.slice(0, 8)}</td>
                      <td className="px-2 py-2 text-slate-200">{job.market}</td>
                      <td className="px-2 py-2 text-slate-200">{job.source}</td>
                      <td className="px-2 py-2 text-slate-200">{Array.isArray(job.symbols) ? job.symbols.length : 0}</td>
                      <td className="px-2 py-2"><span className="rounded-md border border-slate-700 px-2 py-0.5 text-xs text-slate-200">{job.status}</span></td>
                      <td className="px-2 py-2 text-slate-300">{job.downloadedFiles}/{job.totalFiles} | N:{job.normalizedFiles}</td>
                      <td className="px-2 py-2 text-slate-300">{job.importedRows} / skip {job.skippedRows}</td>
                      <td className="max-w-[240px] truncate px-2 py-2 text-rose-300">{job.errorMessage ?? '-'}</td>
                      <td className="px-2 py-2">
                        <Button size="sm" variant="default" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate(job.id)}>重试</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">已导入统计</h3>
        {statsQuery.isLoading ? <LoadingState message="统计加载中..." /> : null}
        {statsQuery.isError ? <ErrorState message="统计加载失败" /> : null}
        {!statsQuery.isLoading && !statsQuery.isError ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="px-2 py-2">市场</th>
                  <th className="px-2 py-2">品种</th>
                  <th className="px-2 py-2">周期</th>
                  <th className="px-2 py-2">bar数</th>
                  <th className="px-2 py-2">区间</th>
                  <th className="px-2 py-2">可训练</th>
                </tr>
              </thead>
              <tbody>
                {stats.slice(0, 200).map((s) => (
                  <tr key={s.id} className="border-t border-slate-800">
                    <td className="px-2 py-2 text-slate-300">{s.market}</td>
                    <td className="px-2 py-2 text-slate-200">{s.symbol}</td>
                    <td className="px-2 py-2 text-slate-200">{s.timeframe}</td>
                    <td className="px-2 py-2 text-slate-300">{s.barCount}</td>
                    <td className="px-2 py-2 text-slate-300">{s.startTime?.slice(0, 10)} ~ {s.endTime?.slice(0, 10)}</td>
                    <td className="px-2 py-2 text-slate-300">{s.isTrainable ? '是' : '否'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </AdminLayout>
  );
}
