import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css';
import MainLayout from "./components/layout/MainLayout";
import { ThemeProvider } from "./components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NeuInk - 智能论文阅读与管理平台",
  description: "AI驱动的学术论文阅读、批注和管理工具，提升研究效率",
  icons: {
    icon: [
      { url: '/neuinl_logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/neuinl_logo.png', sizes: '16x16', type: 'image/png' },
      { url: '/neuinl_logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/neuinl_logo.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/neuinl_logo.png',
    apple: [
      { url: '/neuinl_logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-background text-foreground antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <TooltipProvider delayDuration={0}>
            <MainLayout>
              {children}
            </MainLayout>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}