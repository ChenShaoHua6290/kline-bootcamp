'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ContactTeacherModal } from './ContactTeacherModal';
import { resolveAdminWechatId, resolveAdminWechatQr } from '@/lib/contact';

export function ContactTeacherButton() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    tone: 'info',
  });

  const wechatId = useMemo(
    () => resolveAdminWechatId(),
    [],
  );
  const qrPath = useMemo(
    () => resolveAdminWechatQr(),
    [],
  );

  const handleCopy = async () => {
    if (!wechatId) {
      setToast({ open: true, message: '未配置微信号', tone: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(wechatId);
      setToast({ open: true, message: '微信号已复制', tone: 'success' });
    } catch {
      setToast({ open: true, message: '复制失败，请手动复制', tone: 'error' });
    }
  };

  return (
    <>
      <Button variant="default" size="md" onClick={() => setOpen(true)}>
        联系管理员
      </Button>
      <ContactTeacherModal
        open={open}
        onClose={() => setOpen(false)}
        wechatId={wechatId}
        qrPath={qrPath}
        onCopy={handleCopy}
      />
      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </>
  );
}
