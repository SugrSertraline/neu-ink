'use client';

import React from 'react';
import { Settings, User, Shield, Palette, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, isAdmin, logout } = useAuth();

  const settingSections = [
    {
      id: 'profile',
      title: '个人资料',
      icon: User,
      description: '管理你的个人信息',
      items: [
        { label: '用户名', value: user?.username },
        { label: '昵称', value: user?.nickname },
        { label: '账户类型', value: isAdmin ? '管理员' : '普通用户' },
      ]
    },
    {
      id: 'appearance',
      title: '外观设置',
      icon: Palette,
      description: '自定义界面外观',
      items: [
        { label: '主题', value: '跟随系统' },
        { label: '语言', value: '简体中文' },
        { label: '字体大小', value: '默认' },
      ]
    },
    {
      id: 'notifications',
      title: '通知设置',
      icon: Bell,
      description: '管理通知偏好',
      items: [
        { label: '新论文提醒', value: '开启' },
        { label: '评论通知', value: '开启' },
        { label: '系统通知', value: '开启' },
      ]
    },
  ];

  if (isAdmin) {
    settingSections.push({
      id: 'admin',
      title: '管理员设置',
      icon: Shield,
      description: '系统管理选项',
      items: [
        { label: '用户管理', value: '可用' },
        { label: '论文审核', value: '可用' },
        { label: '系统统计', value: '可用' },
      ]
    });
  }

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

        {/* 设置卡片 */}
        <div className="space-y-6">
          {settingSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {section.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.label}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.value}
                        </span>
                      </div>
                    ))}
                    <div className="pt-4 border-t">
                      <Button variant="outline" size="sm">
                        编辑设置
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 危险操作区域 */}
        <Card className="mt-8 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              危险操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  登出账户
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  退出当前账户，返回登录页面
                </p>
                <Button 
                  variant="outline" 
                  onClick={logout}
                  className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  退出登录
                </Button>
              </div>
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