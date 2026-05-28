export function resolveAdminWechatId() {
  return (
    process.env.NEXT_PUBLIC_ADMIN_WECHAT_ID?.trim() ||
    process.env.NEXT_PUBLIC_CONTACT_WECHAT_ID?.trim() ||
    'Return_Objects'
  );
}

export function resolveAdminWechatQr() {
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_WECHAT_QR?.trim() ||
    process.env.NEXT_PUBLIC_CONTACT_WECHAT_QR?.trim() ||
    '/images/official/wechat-qr-hd.png';

  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw;
  return `/${raw}`;
}
