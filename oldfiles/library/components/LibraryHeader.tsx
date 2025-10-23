// app/library/components/LibraryHeader.tsx

'use client';

import React from 'react';
import { Plus, Settings, ArrowUpDown, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MultiSortControls, { SortRule } from './MultiSortControls';
import ViewModeSwitcher from './ViewModeSwitcher';

type ViewMode = 'card' | 'table' | 'compact';

interface LibraryHeaderProps {
  totalCount: number | undefined;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreatePaper: () => void;
  onCreateFromMarkdown: () => void;
  showColumnConfig?: boolean;
  onToggleColumnConfig?: () => void;
  sortRules: SortRule[];
  onSortRulesChange: (rules: SortRule[]) => void;
}

// 字段名称映射
const FIELD_LABELS: Record<string, string> = {
  title: '标题',
  year: '年份',
  rating: '评分',
  impactFactor: '影响因子',
  citationCount: '引用数',
  status: '状态',
  priority: '优先级',
  createdAt: '创建时间',
  updatedAt: '更新时间',
};

export default function LibraryHeader({
  totalCount,
  viewMode,
  onViewModeChange,
  onCreatePaper,
  onCreateFromMarkdown,
  showColumnConfig = false,
  onToggleColumnConfig,
  sortRules,
  onSortRulesChange,
}: LibraryHeaderProps) {
  const [sortPopoverOpen, setSortPopoverOpen] = React.useState(false);

  const getSortSummary = () => {
    if (sortRules.length === 0) return '默认排序';
    if (sortRules.length === 1) {
      const rule = sortRules[0];
      const fieldLabel = FIELD_LABELS[rule.field] || rule.field;
      const orderLabel = rule.order === 'asc' ? '升序' : '降序';
      return `${fieldLabel} ${orderLabel}`;
    }
    return `${sortRules.length} 级排序`;
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r">
          论文库
        </h1>
        {typeof totalCount === 'number' && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">共 {totalCount} 篇论文</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* 排序按钮 */}
        <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 min-w-[140px]">
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-sm">{getSortSummary()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-4 bg-white dark:bg-slate-800" align="end" sideOffset={8}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">排序设置</h3>
                {sortRules.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSortRulesChange([{ field: 'createdAt', order: 'desc' }])}
                    className="text-xs h-7"
                  >
                    重置
                  </Button>
                )}
              </div>
              <MultiSortControls sortRules={sortRules} onSortRulesChange={onSortRulesChange} />
            </div>
          </PopoverContent>
        </Popover>


        {/* 新建论文下拉菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 font-medium">
              <Plus className="w-4 h-4 text-white" />
              <span className="text-white">新建论文</span>
              <ChevronDown className="w-4 h-4 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white">
            <DropdownMenuItem onClick={onCreatePaper} className="gap-2 cursor-pointer">
              <Plus className="w-4 h-4" />
              手动创建论文
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateFromMarkdown} className="gap-2 cursor-pointer">
              <FileText className="w-4 h-4" />
              从 Markdown 创建
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 列设置（仅 table 视图显示） */}
        {viewMode === 'table' && onToggleColumnConfig && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onToggleColumnConfig} className="gap-2">
                  <Settings className="w-4 h-4" />
                  列设置
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm shadow-lg border-0">
                自定义表格列
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* 视图切换器 */}
        <ViewModeSwitcher value={viewMode} onChange={onViewModeChange} />
      </div>
    </div>
  );
}