'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTrainingStore } from '@/stores/training.store';
import { TopNav } from '@/components/TopNav';
import { TrainingConfigModal } from '@/components/TrainingConfigModal';
import { KLineChart } from '@/components/KLineChart';
import { TimeframeSwitcher } from '@/components/TimeframeSwitcher';
import { TrainingInfoPanel } from '@/components/TrainingInfoPanel';
import { AccountPanel } from '@/components/AccountPanel';
import { TradePanel } from '@/components/TradePanel';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [showConfig, setShowConfig] = useState(false);
  const { session, setSession, viewTimeframe, setViewTimeframe } = useTrainingStore();
  const router = useRouter();

  const startMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/training/start', payload)).data,
    onSuccess: setSession,
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post(`/training/${session?.id}/action`, payload)).data,
    onSuccess: (data) => {
      setSession(data);
      if (data.status !== 'ACTIVE') router.push(`/replay/${data.id}`);
    },
  });

  return (
    <main>
      <TopNav onStart={() => setShowConfig(true)} />
      {showConfig && <TrainingConfigModal onClose={() => setShowConfig(false)} onSubmit={(v) => startMutation.mutate(v)} />}
      <div className="grid grid-cols-4 gap-4 p-4">
        <div className="col-span-3 rounded border border-slate-700 p-2">
          {session ? (
            <>
              <TimeframeSwitcher value={viewTimeframe} onChange={setViewTimeframe} />
              <KLineChart data={session.barsData.slice(0, session.pointer + 1)} />
            </>
          ) : (
            <div className="flex h-[550px] items-center justify-center text-slate-400">点击“开始训练”进入双盲模式。</div>
          )}
        </div>
        <div className="space-y-3">
          {session ? (
            <>
              <TrainingInfoPanel session={session} viewTimeframe={viewTimeframe} />
              <AccountPanel session={session} />
              <TradePanel session={session} onAction={(payload) => actionMutation.mutate(payload)} />
            </>
          ) : (
            <div className="rounded bg-slate-800 p-3 text-sm">开始训练后可查看账户、交易与推进控制。</div>
          )}
        </div>
      </div>
    </main>
  );
}
