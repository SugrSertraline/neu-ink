'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function Dashboard() {
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 头部 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? '管理员控制台' : '用户控制台'}
            </h1>
            <p className="text-gray-600 mt-2">
              欢迎回来，{user?.nickname || user?.username}！
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            退出登录
          </Button>
        </div>

        {/* 状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">
                ✅ 登录成功
              </CardTitle>
              <CardDescription>
                {isAdmin ? '管理员登录成功' : '用户登录成功'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>用户ID:</strong> {user?.id}</div>
                <div><strong>用户名:</strong> {user?.username}</div>
                <div><strong>昵称:</strong> {user?.nickname}</div>
                <div><strong>账户类型:</strong> {isAdmin ? '管理员' : '普通用户'}</div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">
                  🔧 管理员功能
                </CardTitle>
                <CardDescription>
                  管理员专用功能模块
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• 用户管理</div>
                  <div>• 公开论文管理</div>
                  <div>• 系统设置</div>
                  <div>• 数据统计</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-purple-600">
                📚 论文功能
              </CardTitle>
              <CardDescription>
                论文相关功能模块
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• 个人论文库</div>
                <div>• 论文搜索</div>
                <div>• 笔记管理</div>
                <div>• 阅读进度</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 功能提示 */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 功能开发中</CardTitle>
            <CardDescription>
              后续功能正在开发中，敬请期待
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold mb-2">即将上线：</h4>
                <ul className="space-y-1">
                  <li>• 论文上传与解析</li>
                  <li>• 智能笔记系统</li>
                  <li>• 协作分享功能</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">技术栈：</h4>
                <ul className="space-y-1">
                  <li>• Next.js + React 19</li>
                  <li>• Flask + MongoDB</li>
                  <li>• JWT 认证</li>
                  <li>• Tailwind CSS</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}