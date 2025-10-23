'use client';

import React from 'react';
import { Grid, List, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'card' | 'table' | 'compact';

interface ViewModeSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const VIEW_OPTIONS = [
  {
    value: 'card' as const,
    label: '卡片',
    icon: Grid,
  },
  {
    value: 'compact' as const,
    label: '紧凑',
    icon: List,
  },
  {
    value: 'table' as const,
    label: '表格',
    icon: FileText,
  },
];

export default function ViewModeSwitcher({ value, onChange }: ViewModeSwitcherProps) {
  return (
    <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex items-center gap-2 px-3 py-1.5 rounded-md',
              'transition-all duration-200 ease-in-out',
              'text-sm font-medium',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              isActive
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
            )}
          >
            <Icon className={cn(
              'w-4 h-4 transition-transform duration-200',
              isActive && 'scale-110'
            )} />
            <span>{option.label}</span>
            
            {/* 活动指示器 */}
            {isActive && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}