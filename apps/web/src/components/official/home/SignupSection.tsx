import { resolveAdminWechatId, resolveAdminWechatQr } from '@/lib/contact';

export function SignupSection() {
  const wechatId = resolveAdminWechatId();
  const wechatQr = resolveAdminWechatQr();

  return (
    <section id="pricing" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-28 sm:px-6 lg:pb-36">
      <div className="rounded-[30px] border border-cyan-300/22 bg-[linear-gradient(160deg,rgba(15,23,42,0.86),rgba(8,47,73,0.36))] p-4 shadow-[0_24px_58px_rgba(2,6,23,0.5)] sm:p-5 lg:p-6">
        <div id="signup" className="scroll-mt-24" />
        <div className="grid gap-4 rounded-3xl border border-cyan-300/25 bg-slate-900/45 p-4 sm:p-5 lg:grid-cols-[1.4fr_auto] lg:items-start lg:gap-6">
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-100 sm:text-[32px] lg:text-[38px]">我要报名</h2>
            <p className="mt-4 max-w-3xl text-base leading-4 text-slate-300">
              为了减少不必要沟通，建议先查看体系中心中的服务介绍、学习流程、价格与常见问题。
            </p>
            <p className="mt-4 max-w-3xl text-base leading-4 text-slate-300">
              如果你希望系统化建立固定模式执行能力，可直接微信联系报名学习。
            </p>
            <p className="mt-4 max-w-3xl text-base leading-4 text-slate-300">
              如果有其他疑问，也随便欢迎微信上找我咨询，会根据你的阶段给出学习与训练建议。
            </p>

            <div className="mt-5 max-w-md rounded-2xl border border-cyan-300/24 bg-[linear-gradient(145deg,rgba(15,23,42,0.85),rgba(8,47,73,0.24))] p-4">
              <p className="text-xs tracking-[0.14em] text-cyan-200/90">联系信息</p>
              <p className="mt-2 text-[18px] font-semibold text-slate-100">微信：{wechatId}</p>
              <p className="mt-1 text-sm text-slate-400">请备注“报名”，便于快速通过。</p>
            </div>
          </div>

          <div className="justify-self-center lg:justify-self-end">
            <div className="rounded-2xl border border-cyan-300/28 bg-[linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,58,138,0.2))] p-3 shadow-[0_14px_30px_rgba(2,6,23,0.35)] backdrop-blur-sm">
              <div className="rounded-xl bg-white p-2">
                <img src={wechatQr} alt="微信二维码" className="h-28 w-28 rounded-md object-cover sm:h-32 sm:w-32" />
              </div>
              <p className="mt-2.5 text-center text-xs text-slate-300">
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
