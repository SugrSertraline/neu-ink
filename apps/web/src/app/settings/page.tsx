'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';

export default function SettingsPage() {
  const { logout } = useAuth();

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-8 max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            设置
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            管理你的账户和应用偏好
          </p>
        </div>

        {/* 退出登录卡片 */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-lg">退出登录</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  退出当前账户，返回登录页面
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                点击下方按钮退出登录，系统将清除您的登录状态并跳转到登录页面。
              </p>
              <Button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
              >
                退出登录
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 应用信息 */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>NeuInk v1.0.0</p>
          <p>智能论文阅读与共享平台</p>
        </div>
      </div>
    </div>
  );
}