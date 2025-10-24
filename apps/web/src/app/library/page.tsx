'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, ArrowLeft, Library } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

export default function LibraryPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录时显示登录提示
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-blue-600">需要登录</CardTitle>
            <CardDescription>
              请先登录后访问个人论文库
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => router.push('/login')} className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              前往登录
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 已登录用户显示个人论文库（暂时显示开发中提示）
  return (
    <MainLayout>
      <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            我的论文库
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            管理您的个人论文收藏和笔记
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="w-5 h-5" />
              功能开发中
            </CardTitle>
            <CardDescription>
              个人论文库功能正在开发中，敬请期待
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Library className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                即将推出
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                个人论文库将支持以下功能：
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="text-left">
                  <h4 className="font-semibold mb-2">论文管理</h4>
                  <ul className="space-y-1">
                    <li>• 添加论文到个人库</li>
                    <li>• 分类和标签管理</li>
                    <li>• 阅读进度跟踪</li>
                  </ul>
                </div>
                <div className="text-left">
                  <h4 className="font-semibold mb-2">笔记功能</h4>
                  <ul className="space-y-1">
                    <li>• 论文笔记记录</li>
                    <li>• 重点内容标注</li>
                    <li>• 笔记搜索和导出</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </MainLayout>
  );
}