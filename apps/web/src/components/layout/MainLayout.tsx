'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TabBar from './TabBar';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  // ✅ 无论是否登录都显示完整布局
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab栏 */}
        <TabBar />
        
        {/* 页面内容 */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}