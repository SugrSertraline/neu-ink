import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { TabProvider } from '@/stores/useTabStore';
import { EditingProvider } from '@/stores/useEditingState';
import MainLayout from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/sonner'
import 'katex/dist/katex.min.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
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
            <EditingProvider>
              <MainLayout>
                {children}
              </MainLayout>
              <Toaster />
            </EditingProvider>
          </TabProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
