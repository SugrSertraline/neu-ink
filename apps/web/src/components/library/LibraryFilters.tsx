// apps/web/src/components/library/LibraryFilters.tsx
'use client';

import React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LibraryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  filterPriority: string;
  onPriorityChange: (value: string) => void;
  filterType: string;
  onTypeChange: (value: string) => void;
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
  canFilterStatus?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待解析' },
  { value: 'parsing', label: '解析中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '解析失败' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: '全部优先级' },
  { value: 'high', label: '影响力高 (IF≥10)' },
  { value: 'medium', label: '影响力中 (5≤IF<10)' },
  { value: 'low', label: '影响力低 (0<IF<5)' },
];

const ARTICLE_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'journal', label: '期刊' },
  { value: 'conference', label: '会议' },
  { value: 'preprint', label: '预印本' },
  { value: 'book', label: '书籍' },
  { value: 'thesis', label: '学位论文' },
  { value: 'report', label: '技术报告' },
];

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
  canFilterStatus = false,
}: LibraryFiltersProps) {
  const hasActiveAdvancedFilters =
    filterSciQuartile !== 'all' ||
    filterCasQuartile !== 'all' ||
    filterCcfRank !== 'all' ||
    filterYear !== 'all';

  const hasActiveFilters =
    searchTerm !== '' ||
    (canFilterStatus && filterStatus !== 'all') ||
    filterPriority !== 'all' ||
    filterType !== 'all' ||
    hasActiveAdvancedFilters;

  const effectiveYears = availableYears.filter(
    (year): year is number => typeof year === 'number' && !Number.isNaN(year),
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="搜索标题、作者、期刊..."
            value={searchTerm}
            onChange={event => onSearchChange(event.target.value)}
            className="h-10 w-full min-w-0 bg-white pl-10 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
          />
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          {canFilterStatus && (
            <select
              value={filterStatus}
              onChange={event => onStatusChange(event.target.value)}
              className="h-10 min-w-[120px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterPriority}
            onChange={event => onPriorityChange(event.target.value)}
            className="h-10 min-w-[140px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {PRIORITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={event => onTypeChange(event.target.value)}
            className="h-10 min-w-[120px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {ARTICLE_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button
            variant={hasActiveAdvancedFilters ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleAdvancedFilter}
            className={cn(
              'h-10 gap-2 px-4 text-sm transition-all duration-200',
              hasActiveAdvancedFilters && 'bg-blue-600 hover:bg-blue-700',
            )}
          >
            <Filter className="h-4 w-4" />
            高级
            {hasActiveAdvancedFilters && (
              <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-white" />
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="h-10 gap-2 px-4 text-sm text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          )}
        </div>
      </div>

      {showAdvancedFilter && (
        <div className="animate-in slide-in-from-top-1 rounded-lg border bg-white p-4 shadow-sm duration-200 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">高级筛选</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAdvancedFilter}
              className="h-8 w-8 p-0 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">SCI分区</label>
              <select
                value={filterSciQuartile}
                onChange={event => onSciQuartileChange(event.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="all">全部</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                中科院分区
              </label>
              <select
                value={filterCasQuartile}
                onChange={event => onCasQuartileChange(event.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="all">全部</option>
                <option value="1区">1区</option>
                <option value="2区">2区</option>
                <option value="3区">3区</option>
                <option value="4区">4区</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                CCF分级
              </label>
              <select
                value={filterCcfRank}
                onChange={event => onCcfRankChange(event.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="all">全部</option>
                <option value="A">A类</option>
                <option value="B">B类</option>
                <option value="C">C类</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">年份</label>
              <select
                value={filterYear}
                onChange={event => onYearChange(event.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="all">全部年份</option>
                {effectiveYears.map(year => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="outline" className="gap-1">
              搜索: {searchTerm}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onSearchChange('')}
              />
            </Badge>
          )}
          {canFilterStatus && filterStatus !== 'all' && (
            <Badge variant="outline" className="gap-1">
              状态:{' '}
              {STATUS_OPTIONS.find(item => item.value === filterStatus)?.label ?? filterStatus}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onStatusChange('all')}
              />
            </Badge>
          )}
          {filterPriority !== 'all' && (
            <Badge variant="outline" className="gap-1">
              优先级:{' '}
              {PRIORITY_OPTIONS.find(item => item.value === filterPriority)?.label ??
                filterPriority}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onPriorityChange('all')}
              />
            </Badge>
          )}
          {filterType !== 'all' && (
            <Badge variant="outline" className="gap-1">
              类型:{' '}
              {ARTICLE_TYPE_OPTIONS.find(item => item.value === filterType)?.label ?? filterType}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onTypeChange('all')}
              />
            </Badge>
          )}
          {filterSciQuartile !== 'all' && (
            <Badge variant="outline" className="gap-1">
              SCI: {filterSciQuartile}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onSciQuartileChange('all')}
              />
            </Badge>
          )}
          {filterCasQuartile !== 'all' && (
            <Badge variant="outline" className="gap-1">
              中科院: {filterCasQuartile}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onCasQuartileChange('all')}
              />
            </Badge>
          )}
          {filterCcfRank !== 'all' && (
            <Badge variant="outline" className="gap-1">
              CCF: {filterCcfRank}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onCcfRankChange('all')}
              />
            </Badge>
          )}
          {filterYear !== 'all' && (
            <Badge variant="outline" className="gap-1">
              年份: {filterYear}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onYearChange('all')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
