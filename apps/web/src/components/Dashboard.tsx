'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useTabStore } from '@/stores/useTabStore';
import { Library, ArrowRight } from 'lucide-react';

export function Dashboard() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const { addTab, setActiveTab } = useTabStore();

  const handleLogout = () => {
    logout();
  };

  const goToLibrary = () => {
    // 添加论文库标签页并激活
    addTab({
      id: 'library',
      type: 'library',
      title: '论文库',
      path: '/library'
    });
    setActiveTab('library');
    
    // 跳转到论文库页面
    router.push('/library');
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-8 max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {isAdmin ? '管理员控制台' : '用户控制台'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            欢迎回来，{user?.nickname || user?.username}！
          </p>
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
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div>• 个人论文库</div>
                <div>• 论文搜索</div>
                <div>• 笔记管理</div>
                <div>• 阅读进度</div>
              </div>
              <Button onClick={goToLibrary} className="w-full">
                <Library className="w-4 h-4 mr-2" />
                进入论文库
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
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