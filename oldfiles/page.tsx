'use client';

import React from 'react';
import { useSettingsStore } from '@/app/store/useSettingsStore';
import { TrendingUp, BookOpen, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { theme, fontSize } = useSettingsStore();

  const stats = [
    {
      title: '论文总数',
      value: '0',
      icon: BookOpen,
      description: '已添加的论文',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: '本月阅读',
      value: '0',
      icon: Target,
      description: '本月新增阅读',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: '阅读时长',
      value: '0',
      unit: '小时',
      icon: Clock,
      description: '累计阅读时间',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: '完成率',
      value: '0',
      unit: '%',
      icon: TrendingUp,
      description: '论文完成率',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="p-8 max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">首页</h1>
          <p className="text-muted-foreground">查看你的阅读数据和进度</p>
        </div>
        
        {/* 统计卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                    <Icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                    {stat.unit && <span className="text-lg ml-1">{stat.unit}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">阅读趋势</h2>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>图表功能开发中</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">论文分类</h2>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>图表功能开发中</p>
              </div>
            </div>
          </div>
        </div>

        {/* 最近阅读 */}
        <div className="mt-6 bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">最近阅读</h2>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>暂无阅读记录</p>
          </div>
        </div>
      </div>
    </div>
  );
}