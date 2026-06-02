'use client';

type IcpFooterProps = {
  className?: string;
};

export function IcpFooter({ className = '' }: IcpFooterProps) {
  const isDev = process.env.NODE_ENV !== 'production';
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || '只做一种模式';
  const icpNo = process.env.NEXT_PUBLIC_ICP_NO?.trim() || '';
  const icpLink = process.env.NEXT_PUBLIC_ICP_LINK?.trim() || 'https://beian.miit.gov.cn/';
  const psbNo = process.env.NEXT_PUBLIC_PSB_NO?.trim() || '';
  const psbLink = process.env.NEXT_PUBLIC_PSB_LINK?.trim() || 'http://www.beian.gov.cn/portal/registerSystemInfo';
  const displayIcpNo = icpNo || (isDev ? 'ICP备案号（本地占位）' : '');
  const displayPsbNo = psbNo || (isDev ? '公网安备号（本地占位）' : '');
  const year = new Date().getFullYear();

  if (!displayIcpNo && !displayPsbNo) return null;

  return (
    <div className={`text-center text-xs text-slate-400 ${className}`}>
      <span>{`© ${year} ${siteName} All rights reserved.`}</span>
      <span className="mx-1 text-slate-600">·</span>
      {displayIcpNo ? (
        <a href={icpLink} target="_blank" rel="noreferrer" className="hover:text-slate-200">
          {displayIcpNo}
        </a>
      ) : null}
      {displayIcpNo && displayPsbNo ? <span className="mx-1 text-slate-600">·</span> : null}
      {displayPsbNo ? (
        <a href={psbLink} target="_blank" rel="noreferrer" className="hover:text-slate-200">
          {displayPsbNo}
        </a>
      ) : null}
    </div>
  );
}
