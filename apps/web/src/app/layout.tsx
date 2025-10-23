import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
// 如果你使用的是 shadcn 的 use-toast 方案：
import { Toaster } from '@/components/ui/sonner'
// （如果你的项目用的是 Sonner： import { Toaster } from '@/components/ui/sonner'）

export const metadata: Metadata = {
  title: 'NeuInk - 论文阅读与共享平台',
  description: '智能论文阅读与共享平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
