import { resolveAdminWechatId, resolveAdminWechatQr } from '@/lib/contact';

export function SignupSection() {
  const wechatId = resolveAdminWechatId();
  const wechatQr = resolveAdminWechatQr();

  return (
    <section id="pricing" className="mx-auto max-w-[1360px] scroll-mt-24 px-4 pb-32 sm:px-6">
      <div className="rounded-[30px] border border-cyan-300/24 bg-[linear-gradient(145deg,rgba(14,116,144,0.2),rgba(2,6,23,0.95))] p-5 shadow-[0_24px_60px_rgba(2,6,23,0.5)] sm:p-8">
        <div id="signup" className="scroll-mt-24" />
        <div className="grid gap-5 rounded-3xl border border-cyan-300/30 bg-slate-900/55 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-10">
          <div>
            <h2 className="text-[30px] font-semibold tracking-[-0.01em] sm:text-[36px]">我要报名</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 sm:text-[17px] sm:leading-9">
              为了减少不必要沟通，建议先查看体系中心中的服务介绍、学习流程、价格与常见问题。
            </p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-[17px] sm:leading-9">
              如果确认适合你，再通过微信联系报名。我们会根据你的阶段给出学习与训练建议。
            </p>
            <p className="mt-5 text-base font-medium text-slate-200">微信：{wechatId}</p>
            <p className="mt-1 text-sm text-slate-400 sm:text-base">请备注“报名”，便于快速通过。</p>
          </div>
          <div className="justify-self-center lg:justify-self-end">
            <div className="rounded-2xl border border-cyan-200/35 bg-slate-800/65 p-2.5 shadow-[0_16px_34px_rgba(2,6,23,0.4)] sm:p-3">
              <div className="rounded-xl bg-white p-2">
                <img src={wechatQr} alt="微信二维码" className="h-32 w-32 rounded-md object-cover sm:h-44 sm:w-44" />
              </div>
              <p className="mt-3 text-center text-xs text-slate-300">
                添加微信时请备注
                <span className="font-semibold text-cyan-200"> 报名 </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
