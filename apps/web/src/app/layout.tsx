import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: '只做一种模式',
  description: '只做一种模式K线训练',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
