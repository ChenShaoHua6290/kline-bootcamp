'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Session } from '@/types/training';
import { Button } from '@/components/ui/Button';

function formatDateLabel(value?: string) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toISOString().slice(0, 10);
}

export function SessionEndModal({
  session,
  onClose,
  onRestart,
  onContinueAssignment,
  onStartFreePractice,
  onBackHome,
  restarting = false,
}: {
  session: Session;
  onClose: () => void;
  onRestart: () => void;
  onContinueAssignment?: () => void;
  onStartFreePractice?: () => void;
  onBackHome: () => void;
  restarting?: boolean;
}) {
  const [modalScale, setModalScale] = useState(1);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstBar = session.barsData?.[0];
  const lastBar = session.barsData?.[Math.max(0, session.pointer)];
  const range = `${formatDateLabel(firstBar?.time)} - ${formatDateLabel(lastBar?.time)}`;

  const roundScore = session.finalBalance - session.initialBalance;
  const realizedPnl = session.actions.reduce((sum, action) => sum + (action.pnl ?? 0), 0);
  const ratio = session.initialBalance > 0 ? (roundScore / session.initialBalance) * 100 : 0;
  const assignmentSource = session.assignmentId ? session.assignmentSource : 'freePractice';
  const isTrial = assignmentSource === 'trial';
  const isCourseAssignment = assignmentSource === 'courseAssignment';
  const primaryText = isTrial ? '继续试用训练' : isCourseAssignment ? '继续当前作业' : '开始新训练';
  const secondaryText = isTrial || isCourseAssignment ? '开启自由练习' : '返回首页';

  useLayoutEffect(() => {
    const fitModal = () => {
      const el = modalRef.current;
      if (!el) return;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (!width || !height) return;
      const widthScale = (window.innerWidth - 24) / width;
      const heightScale = (window.innerHeight - 28) / height;
      const next = Math.min(1, widthScale, heightScale) * 0.9;
      setModalScale(Math.max(0.58, next));
    };
    const raf = requestAnimationFrame(fitModal);
    const observer = new ResizeObserver(fitModal);
    if (modalRef.current) observer.observe(modalRef.current);
    window.addEventListener('resize', fitModal);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', fitModal);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.14),transparent_40%),rgba(2,6,23,0.84)] p-4"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-end-title"
        className="w-full max-w-[380px] rounded-2xl border border-slate-700/70 bg-gradient-to-b from-slate-900/95 via-slate-900/95 to-slate-950/95 font-['SF_Pro_Display','PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif] shadow-[0_0_0_1px_rgba(16,185,129,0.16),0_18px_60px_rgba(0,0,0,0.58)]"
        style={{ transform: `scale(${modalScale})`, transformOrigin: 'center center', willChange: 'transform' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-700/70 px-4 py-3.5 sm:px-5 sm:py-4">
          <div>
            <div className="text-[clamp(9px,1.2vw,10px)] font-semibold tracking-[0.2em] text-emerald-400/90">结算面板</div>
            <h3 id="session-end-title" className="mt-1 text-[clamp(20px,3.3vw,24px)] font-semibold leading-tight text-slate-100">训练完成</h3>
            <p className="mt-1 text-[clamp(11px,1.8vw,13px)] font-medium text-slate-400">
              训练时间：{range}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="default"
            size="sm"
            className="!px-2.5 !py-1.5 text-[clamp(14px,2vw,16px)] leading-none"
            aria-label="关闭"
          >
            ×
          </Button>
        </div>

        <div className="space-y-3.5 px-4 py-4 sm:px-5 sm:py-5">
          <section className="rounded-xl border border-slate-700/80 bg-gradient-to-r from-slate-800/70 to-slate-900/80 p-3.5 sm:p-4">
            <div className="mb-2.5 text-[clamp(11px,1.8vw,13px)] font-medium text-slate-300">本场积分</div>
            <div className={`text-[clamp(1.55rem,4.8vw,1.9rem)] font-semibold leading-none ${roundScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {roundScore >= 0 ? '+' : ''}
              {roundScore.toFixed(2)}
            </div>
            <p className="mt-3 text-[clamp(11px,1.8vw,13px)] leading-5 text-slate-400">
              本场积分 = 账户积分相对本场开始时的变化。总盈亏 = 已平仓交易收益汇总。
            </p>
            <div className="mt-3.5 space-y-1.5 text-[clamp(13px,2.1vw,15px)]">
              <div className="flex items-center justify-between text-slate-300">
                <span>总盈亏</span>
                <span className={`font-semibold ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {realizedPnl >= 0 ? '+' : ''}
                  {realizedPnl.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>盈亏比例</span>
                <span className={`font-semibold ${ratio >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {ratio >= 0 ? '+' : ''}
                  {ratio.toFixed(2)}%
                </span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={isTrial || isCourseAssignment ? onStartFreePractice ?? onRestart : onBackHome}
              variant="default"
              className="w-full py-2.5 text-[clamp(14px,2.4vw,16px)]"
              disabled={restarting}
            >
              {secondaryText}
            </Button>
            <Button
              onClick={isTrial || isCourseAssignment ? onContinueAssignment ?? onRestart : onRestart}
              variant="success"
              className="w-full py-2.5 text-[clamp(15px,2.6vw,17px)]"
              disabled={restarting}
            >
              {restarting ? '正在开始...' : primaryText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
