'use client';

import React from 'react';
import PublicLibraryPage from './public-library/page';
import MainLayout from '@/components/layout/MainLayout';

export default function Home() {
  // 首页直接显示公共论文库，无需登录
  return <PublicLibraryPage />;
}
