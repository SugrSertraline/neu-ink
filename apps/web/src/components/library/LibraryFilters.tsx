'use client';

import React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LibraryFiltersProps {
  // 基础筛选
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  filterPriority: string;
  onPriorityChange: (value: string) => void;
  filterType: string;
  onTypeChange: (value: string) => void;

  // 高级筛选
  showAdvancedFilter: boolean;
  onToggleAdvancedFilter: () => void;
  filterSciQuartile: string;
  onSciQuartileChange: (value: string) => void;
  filterCasQuartile: string;
  onCasQuartileChange: (value: string) => void;
  filterCcfRank: string;
  onCcfRankChange: (value: string) => void;
  filterYear: string;
  onYearChange: (value: string) => void;
  availableYears: (number | undefined)[];
  onResetFilters: () => void;
}

export default function LibraryFilters({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
  filterPriority,
  onPriorityChange,
  filterType,
  onTypeChange,
  showAdvancedFilter,
  onToggleAdvancedFilter,
  filterSciQuartile,
  onSciQuartileChange,
  filterCasQuartile,
  onCasQuartileChange,
  filterCcfRank,
  onCcfRankChange,
  filterYear,
  onYearChange,
  availableYears,
  onResetFilters,
}: LibraryFiltersProps) {
  // 检查是否有高级筛选被激活
  const hasActiveAdvancedFilters = 
    filterSciQuartile !== 'all' ||
    filterCasQuartile !== 'all' ||
    filterCcfRank !== 'all' ||
    filterYear !== 'all';

  // 检查是否有任何筛选被激活
  const hasActiveFilters = 
    searchTerm !== '' ||
    filterStatus !== 'all' ||
    filterPriority !== 'all' ||
    filterType !== 'all' ||
    hasActiveAdvancedFilters;

  return (
    <div className="space-y-4 w-full">
      {/* 主要筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索标题、作者、期刊..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full"
          />
        </div>

        {/* 筛选控件组 */}
        <div className="flex flex-wrap gap-2 min-w-0">
          {/* 状态筛选 */}
          <select
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 h-10 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[100px]"
          >
            <option value="all">全部状态</option>
            <option value="unread">未读</option>
            <option value="reading">阅读中</option>
            <option value="finished">已完成</option>
          </select>

          {/* 优先级筛选 */}
          <select
            value={filterPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="px-3 py-2 h-10 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-20"
          >
            <option value="all">全部</option>
            <option value="high">高</ option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>

          {/* 类型筛选 */}
          <select
            value={filterType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="px-3 py-2 h-10 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[100px]"
          >
            <option value="all">全部类型</option>
            <option value="journal">期刊</option>
            <option value="conference">会议</option>
            <option value="preprint">预印本</option>
            <option value="book">书籍</option>
            <option value="thesis">论文</option>
          </select>

          {/* 高级筛选按钮 */}
          <Button
            variant={hasActiveAdvancedFilters ? "default" : "outline"}
            size="sm"
            onClick={onToggleAdvancedFilter}
            className={cn(
              "gap-2 h-10 px-4 text-sm transition-all duration-200",
              hasActiveAdvancedFilters && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Filter className="w-4 h-4" />
            高级
            {hasActiveAdvancedFilters && (
              <span className="w-2 h-2 rounded-full bg-white ml-1 shrink-0" />
            )}
          </Button>

          {/* 重置按钮 */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="gap-2 h-10 px-4 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
          )}
        </div>
      </div>

      {/* 高级筛选面板 */}
      {showAdvancedFilter && (
        <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
              高级筛选
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAdvancedFilter}
              className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 筛选选项网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SCI分区 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                SCI分区
              </label>
              <select
                value={filterSciQuartile}
                onChange={(e) => onSciQuartileChange(e.target.value)}
                className="w-full px-3 py-2 h-9 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                <option value="all">全部</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            {/* 中科院分区 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                中科院分区
              </label>
              <select
                value={filterCasQuartile}
                onChange={(e) => onCasQuartileChange(e.target.value)}
                className="w-full px-3 py-2 h-9 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                <option value="all">全部</option>
                <option value="1区">1区</option>
                <option value="2区">2区</option>
                <option value="3区">3区</option>
                <option value="4区">4区</option>
              </select>
            </div>

            {/* CCF分级 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                CCF分级
              </label>
              <select
                value={filterCcfRank}
                onChange={(e) => onCcfRankChange(e.target.value)}
                className="w-full px-3 py-2 h-9 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                <option value="all">全部</option>
                <option value="A">A类</option>
                <option value="B">B类</option>
                <option value="C">C类</option>
              </select>
            </div>

            {/* 年份筛选 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                年份
              </label>
              <select
                value={filterYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="w-full px-3 py-2 h-9 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                <option value="all">全部年份</option>
                {availableYears.map(year => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 活动筛选标签 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="outline" className="gap-1">
              搜索: {searchTerm}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-500" 
                onClick={() => onSearchChange('')}
              />
            </Badge>
          )}
          {filterStatus !== 'all' && (
            <Badge variant="outline" className="gap-1">
              状态: {filterStatus}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-500" 
                onClick={() => onStatusChange('all')}
              />
            </Badge>
          )}
          {filterPriority !== 'all' && (
            <Badge variant="outline" className="gap-1">
              优先级: {filterPriority}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-500" 
                onClick={() => onPriorityChange('all')}
              />
            </Badge>
          )}
          {filterType !== 'all' && (
            <Badge variant="outline" className="gap-1">
              类型: {filterType}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-500" 
                onClick={() => onTypeChange('all')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}