// library/components/MultiSortControls.tsx

'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SortRule {
  field: string;
  order: 'asc' | 'desc';
}

interface MultiSortControlsProps {
  sortRules: SortRule[];
  onSortRulesChange: (rules: SortRule[]) => void;
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'updatedAt', label: '更新时间' },
  { value: 'title', label: '标题' },
  { value: 'year', label: '年份' },
  { value: 'rating', label: '评分' },
  { value: 'impactFactor', label: '影响因子' },
  { value: 'readingStatus', label: '阅读状态' },
  { value: 'priority', label: '优先级' },
];

export default function MultiSortControls({
  sortRules,
  onSortRulesChange,
}: MultiSortControlsProps) {
  // 获取字段的当前排序状态
  const getFieldState = (field: string): 'none' | 'asc' | 'desc' => {
    const rule = sortRules.find(r => r.field === field);
    return rule ? rule.order : 'none';
  };

  // 获取字段的优先级（如果有排序的话）
  const getFieldPriority = (field: string): number | null => {
    const index = sortRules.findIndex(r => r.field === field);
    return index >= 0 ? index + 1 : null;
  };

  // 切换排序状态：none -> asc -> desc -> none
  const toggleSort = (field: string) => {
    const currentState = getFieldState(field);
    const newRules = sortRules.filter(r => r.field !== field);

    if (currentState === 'none') {
      // 添加升序
      onSortRulesChange([...newRules, { field, order: 'asc' }]);
    } else if (currentState === 'asc') {
      // 改为降序
      onSortRulesChange([...newRules, { field, order: 'desc' }]);
    } else {
      // 移除排序
      onSortRulesChange(newRules);
    }
  };

  return (
    <div className="space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          排序设置
        </h3>
        {sortRules.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSortRulesChange([])}
            className="h-7 text-xs text-slate-500 hover:text-slate-700"
          >
            清空全部
          </Button>
        )}
      </div>

      {/* 排序按钮网格 */}
      <div className="grid grid-cols-2 gap-2">
        {SORT_OPTIONS.map((option) => {
          const state = getFieldState(option.value);
          const priority = getFieldPriority(option.value);
          const isActive = state !== 'none';

          return (
            <button
              key={option.value}
              onClick={() => toggleSort(option.value)}
              className={`
                relative flex items-center justify-between gap-2 px-3 py-2.5 
                rounded-lg border-2 transition-all duration-200
                ${isActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-600' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
                hover:shadow-sm active:scale-[0.98]
              `}
            >
              {/* 左侧：标签和优先级 */}
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  isActive 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {option.label}
                </span>
                {priority !== null && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                    {priority}
                  </span>
                )}
              </div>

              {/* 右侧：排序图标 */}
              <div className="relative w-5 h-5 flex items-center justify-center">
                {state === 'none' && (
                  <ArrowUpDown 
                    className="w-4 h-4 text-slate-400 transition-opacity duration-200"
                    style={{ opacity: 0.4 }}
                  />
                )}
                
                {state === 'asc' && (
                  <ArrowUp 
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-sort-in"
                  />
                )}
                
                {state === 'desc' && (
                  <ArrowDown 
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-sort-in"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 说明文字 */}
      {sortRules.length > 0 && (
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="font-medium mb-1">当前排序规则：</div>
          <div className="space-y-0.5">
            {sortRules.map((rule, index) => {
              const label = SORT_OPTIONS.find(opt => opt.value === rule.field)?.label || rule.field;
              return (
                <div key={index} className="flex items-center gap-1">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{index + 1}.</span>
                  <span className="font-medium">{label}</span>
                  <span className="text-slate-400">
                    {rule.order === 'asc' ? '↑ 升序' : '↓ 降序'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes sortIn {
          0% {
            opacity: 0;
            transform: rotate(-180deg) scale(0.5);
          }
          60% {
            transform: rotate(10deg) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: rotate(0deg) scale(1);
          }
        }

        :global(.animate-sort-in) {
          animation: sortIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
