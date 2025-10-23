// library/components/LibraryFilters.tsx

'use client';

import React from 'react';
import { Search, Filter, X, RotateCcw, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TABLE_COLUMNS } from '../utils/paperHelpers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  filterRating: string;
  onRatingChange: (value: string) => void;
  filterYear: string;
  onYearChange: (value: string) => void;
  availableYears: (number | undefined)[];
  onResetAdvancedFilters: () => void;

  // 列配置（仅表格视图）
  showColumnConfig?: boolean;
  onToggleColumnConfig?: () => void;
  visibleColumns?: Set<string>;
  onToggleColumn?: (key: string) => void;
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
  filterRating,
  onRatingChange,
  filterYear,
  onYearChange,
  availableYears,
  onResetAdvancedFilters,
  showColumnConfig = false,
  onToggleColumnConfig,
  visibleColumns,
  onToggleColumn,
}: LibraryFiltersProps) {
  // 检查是否有高级筛选被激活
  const hasActiveAdvancedFilters = 
    filterSciQuartile !== 'all' ||
    filterCasQuartile !== 'all' ||
    filterCcfRank !== 'all' ||
    filterRating !== 'all' ||
    filterYear !== 'all';

  // 获取当前选中项的显示文本
  const getStatusText = (value: string) => {
    switch (value) {
      case 'all': return '状态';
      case 'unread': return '未读';
      case 'reading': return '阅读中';
      case 'finished': return '已完成';
      default: return '状态';
    }
  };

  const getPriorityText = (value: string) => {
    switch (value) {
      case 'all': return '优先级';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '优先级';
    }
  };

  const getTypeText = (value: string) => {
    switch (value) {
      case 'all': return '类型';
      case 'journal': return '期刊';
      case 'conference': return '会议';
      case 'preprint': return '预印本';
      case 'book': return '书籍';
      case 'thesis': return '论文';
      default: return '类型';
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* 列配置面板 */}
      {showColumnConfig && visibleColumns && onToggleColumn && (
        <div className="p-3 border rounded-lg bg-white dark:bg-slate-900 shadow-sm animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">表格列配置</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleColumnConfig}
              className="h-7 w-7 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {TABLE_COLUMNS.filter(col => !col.fixed).map(col => (
              <div key={col.key} className="flex items-center space-x-1.5">
                <Checkbox
                  id={col.key}
                  checked={visibleColumns.has(col.key)}
                  onCheckedChange={() => onToggleColumn(col.key)}
                  className="h-3.5 w-3.5"
                />
                <Label 
                  htmlFor={col.key} 
                  className="text-xs cursor-pointer text-slate-700 dark:text-slate-300 hover:text-primary transition-colors"
                >
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="搜索标题、作者、期刊..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
          />
        </div>

        {/* 筛选控件组 */}
        <div className="flex flex-wrap gap-1.5 min-w-0">
          {/* 状态筛选 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={filterStatus} onValueChange={onStatusChange}>
                  <SelectTrigger className="w-28 h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <SelectValue>
                      <span className="truncate">{getStatusText(filterStatus)}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="unread">未读</SelectItem>
                    <SelectItem value="reading">阅读中</SelectItem>
                    <SelectItem value="finished">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-50 px-2 py-1 rounded-md text-xs">
                按阅读状态筛选
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 优先级筛选 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={filterPriority} onValueChange={onPriorityChange}>
                  <SelectTrigger className="w-24 h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <SelectValue>
                      <span className="truncate">{getPriorityText(filterPriority)}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-50 px-2 py-1 rounded-md text-xs">
                按优先级筛选
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 类型筛选 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={filterType} onValueChange={onTypeChange}>
                  <SelectTrigger className="w-24 h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <SelectValue>
                      <span className="truncate">{getTypeText(filterType)}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="journal">期刊</SelectItem>
                    <SelectItem value="conference">会议</SelectItem>
                    <SelectItem value="preprint">预印本</SelectItem>
                    <SelectItem value="book">书籍</SelectItem>
                    <SelectItem value="thesis">论文</SelectItem>
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-50 px-2 py-1 rounded-md text-xs">
                按文章类型筛选
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 高级筛选下拉菜单 */}
          <Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant={hasActiveAdvancedFilters ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "gap-1.5 h-9 px-3 text-sm transition-all duration-200 min-w-20",
                        hasActiveAdvancedFilters && "bg-blue-600 hover:bg-blue-700"
                      )}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="truncate">高级</span>
                      {hasActiveAdvancedFilters && (
                        <span className="w-2 h-2 rounded-full bg-white ml-1 flex-shrink-0" />
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-slate-50 px-2 py-1 rounded-md text-xs">
                  高级筛选选项
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent 
              className="w-80 p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-lg"
              align="end"
            >
              <div className="space-y-4">
                {/* 标题和重置按钮 */}
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">
                    高级筛选
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onResetAdvancedFilters}
                    className="h-7 text-xs gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    重置
                  </Button>
                </div>

                {/* 筛选选项网格 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* SCI分区 */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      SCI分区
                    </Label>
                    <Select value={filterSciQuartile} onValueChange={onSciQuartileChange}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900">
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="Q1">Q1</SelectItem>
                        <SelectItem value="Q2">Q2</SelectItem>
                        <SelectItem value="Q3">Q3</SelectItem>
                        <SelectItem value="Q4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 中科院分区 */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      中科院分区
                    </Label>
                    <Select value={filterCasQuartile} onValueChange={onCasQuartileChange}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900">
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="1区">1区</SelectItem>
                        <SelectItem value="2区">2区</SelectItem>
                        <SelectItem value="3区">3区</SelectItem>
                        <SelectItem value="4区">4区</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CCF分级 */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      CCF分级
                    </Label>
                    <Select value={filterCcfRank} onValueChange={onCcfRankChange}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900">
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="A">A类</SelectItem>
                        <SelectItem value="B">B类</SelectItem>
                        <SelectItem value="C">C类</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 评分筛选 */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      评分
                    </Label>
                    <Select value={filterRating} onValueChange={onRatingChange}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900">
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="4+">4星+</SelectItem>
                        <SelectItem value="3+">3星+</SelectItem>
                        <SelectItem value="<3">3星以下</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 年份筛选 */}
                  <div className="space-y-2 col-span-2">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      年份
                    </Label>
                    <Select value={filterYear} onValueChange={onYearChange}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue placeholder="全部年份" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 max-h-60">
                        <SelectItem value="all">全部年份</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}