import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthGate from '@/components/auth-gate';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#3B82F6',
};

export const metadata: Metadata = {
  title: 'Deep 学生生活管理台',
  description: '待办、周历、习惯、日记、记账，AI 助力的学生生活管理',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Deep 生活管理台',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AuthGate>
          <div className="mx-auto max-w-[480px] min-h-screen relative">
            {children}
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
