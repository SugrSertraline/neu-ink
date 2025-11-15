'use client';

import React from 'react';
import { CheckSquare, Plus, Filter, Search } from 'lucide-react';

// UI组件
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * 清单管理页面
 * 功能预留，暂未连接后端
 */
export default function ChecklistPage() {
  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">清单管理</h1>
            <p className="text-gray-600">管理您的论文阅读清单和研究计划</p>
          </div>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="w-4 h-4" />
          新建清单
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="搜索清单..."
            className="pl-10"
            disabled
          />
        </div>
        <Button variant="outline" className="gap-2" disabled>
          <Filter className="w-4 h-4" />
          筛选
        </Button>
      </div>

      {/* 空状态 */}
      <div className="text-center py-12">
        <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">功能开发中</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          清单管理功能正在开发中，敬请期待！您将能够创建和管理个人阅读清单，
          跟踪研究进度，设置提醒等。
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <h4 className="font-medium text-blue-900 mb-2">即将推出的功能：</h4>
          <ul className="text-sm text-blue-700 space-y-1 text-left">
            <li>• 创建个人阅读清单</li>
            <li>• 论文收藏和标签管理</li>
            <li>• 阅读进度跟踪</li>
            <li>• 笔记和评论功能</li>
            <li>• 提醒和计划安排</li>
          </ul>
        </div>
      </div>
    </div>
  );
}