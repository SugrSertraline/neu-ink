import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { TabProvider } from '@/stores/useTabStore';
import MainLayout from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'NeuInk - 论文阅读与共享平台',
  description: '智能论文阅读与共享平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>
          <TabProvider>
            {children}
            <Toaster />
          </TabProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
